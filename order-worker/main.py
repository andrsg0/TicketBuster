"""
TicketBuster Order Worker

A daemon that:
1. Consumes order messages from RabbitMQ (orders_queue)
2. Processes orders with CPU-intensive QR generation
3. Commits seat purchases via gRPC to Catalog Service
4. Saves order status to PostgreSQL
5. Publishes notifications to notifications_queue

Architecture:
    API Gateway → [orders_queue] → Order Worker → [notifications_queue] → Notification Service
                                        ↓
                              gRPC → Catalog Service
                                        ↓
                                    PostgreSQL
"""
import logging
import signal
import sys
import time
import uuid
from datetime import datetime
from typing import Optional

from src.config import settings
from src.database import init_database, get_session, health_check as db_health
from src.models import Order, OrderStatus
from src.rabbitmq import RabbitMQConnection, OrderMessage
from src.grpc_client import CatalogClient
from src.qr_generator import generate_qr_code

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("order-worker")

# Global state for graceful shutdown
shutdown_requested = False
rabbitmq: Optional[RabbitMQConnection] = None
catalog_client: Optional[CatalogClient] = None


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global shutdown_requested
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True
    
    if rabbitmq and rabbitmq._channel:
        rabbitmq._channel.stop_consuming()


def process_order(message: OrderMessage) -> bool:
    """
    Process a single order message.
    
    Steps:
    1. Create/update order record in database (status: processing)
    2. Generate QR code with CPU simulation
    3. Call gRPC to commit seat purchase
    4. Update order status (completed/failed)
    5. Publish notification
    
    Args:
        message: OrderMessage from RabbitMQ
        
    Returns:
        True if processing successful, False if should retry
    """
    global catalog_client, rabbitmq
    
    order_uuid_str = message.order_uuid
    start_time = time.time()
    
    # Validate required fields
    if not order_uuid_str or not message.user_id:
        logger.error(f"Invalid message: missing order_uuid or user_id")
        return True  # Don't retry invalid messages
    
    # Convert string UUIDs to UUID objects
    try:
        order_uuid = uuid.UUID(order_uuid_str)
        user_uuid = uuid.UUID(message.user_id)
    except ValueError as e:
        logger.error(f"Invalid UUID format: {e}")
        return True  # Don't retry invalid UUIDs
    
    logger.info(f"Processing order {order_uuid} (complexity: {message.processing_complexity})")
    
    try:
        # Step 1: Create/update order in database
        with get_session() as session:
            order = session.query(Order).filter_by(order_uuid=order_uuid).first()
            
            if not order:
                # Create new order
                order = Order(
                    order_uuid=order_uuid,
                    user_id=user_uuid,
                    event_id=message.event_id,
                    seat_id=message.seat_id,
                    total_amount=message.total_amount,
                    processing_complexity=message.processing_complexity,
                    payment_reference=message.payment_reference,
                    status='PROCESSING',
                    created_at=datetime.utcnow()
                )
                session.add(order)
            else:
                # Update existing order
                order.status = 'PROCESSING'
                order.updated_at = datetime.utcnow()
            
            session.flush()  # Get the order ID
            order_id = order.id
        
        logger.info(f"Order {order_uuid} saved to database (id: {order_id})")
        
        # Step 2: Generate QR code with CPU simulation
        qr_hash, qr_bytes, qr_time = generate_qr_code(
            order_uuid=str(order_uuid),
            user_id=str(user_uuid),
            event_id=message.event_id,
            seat_id=message.seat_id,
            processing_complexity=message.processing_complexity
        )
        
        logger.info(f"QR code generated in {qr_time:.3f}s, hash: {qr_hash[:16]}...")
        
        # Step 3: Commit seat via gRPC
        commit_result = catalog_client.commit_seat(
            seat_id=message.seat_id,
            user_id=str(user_uuid),
            order_uuid=str(order_uuid),
            amount_paid=message.total_amount
        )
        
        if not commit_result.success:
            # Seat commit failed - update order as failed
            with get_session() as session:
                order = session.query(Order).filter_by(order_uuid=order_uuid).first()
                if order:
                    order.status = 'FAILED'
                    order.error_message = commit_result.message
                    order.updated_at = datetime.utcnow()
            
            # Publish failure notification
            rabbitmq.publish_notification(
                "order.failed",
                {
                    "order_uuid": str(order_uuid),
                    "user_id": str(user_uuid),
                    "event_id": message.event_id,
                    "seat_id": message.seat_id,
                    "error": commit_result.message,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            logger.error(f"Order {order_uuid} failed: {commit_result.message}")
            return True  # Don't retry - this is a business logic failure
        
        # Step 4: Update order as completed
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        with get_session() as session:
            order = session.query(Order).filter_by(order_uuid=order_uuid).first()
            if order:
                order.status = 'COMPLETED'
                order.qr_code_hash = qr_hash
                order.completed_at = datetime.utcnow()
                order.updated_at = datetime.utcnow()
        
        # Step 5: Publish success notification
        rabbitmq.publish_notification(
            "order.completed",
            {
                "order_uuid": str(order_uuid),
                "user_id": str(user_uuid),
                "event_id": message.event_id,
                "seat_id": message.seat_id,
                "qr_code_hash": qr_hash,
                "total_amount": message.total_amount,
                "processing_time_ms": processing_time_ms,
                "completed_at": datetime.utcnow().isoformat()
            }
        )
        
        total_time = time.time() - start_time
        logger.info(
            f"Order {order_uuid} completed successfully in {total_time:.3f}s "
            f"(QR: {qr_time:.3f}s, total: {processing_time_ms}ms)"
        )
        
        return True
        
    except Exception as e:
        logger.exception(f"Error processing order {order_uuid_str}: {e}")
        
        # Try to update order as failed
        try:
            with get_session() as session:
                order = session.query(Order).filter_by(order_uuid=order_uuid).first()
                if order:
                    order.status = 'FAILED'
                    order.error_message = str(e)
                    order.updated_at = datetime.utcnow()
        except Exception as db_error:
            logger.error(f"Failed to update order status: {db_error}")
        
        # Return False to trigger retry/DLQ logic
        return False


def main():
    """Main entry point for the Order Worker daemon."""
    global rabbitmq, catalog_client
    
    logger.info("=" * 60)
    logger.info("TicketBuster Order Worker starting...")
    logger.info(f"Worker Name: {settings.worker_name}")
    logger.info(f"Log Level: {settings.log_level}")
    logger.info("=" * 60)
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Initialize database connection
    logger.info("Connecting to database...")
    try:
        init_database()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        sys.exit(1)
    
    # Initialize gRPC client
    logger.info("Initializing gRPC client for Catalog Service...")
    catalog_client = CatalogClient()
    catalog_client.connect()
    
    # Initialize RabbitMQ connection
    logger.info("Connecting to RabbitMQ...")
    rabbitmq = RabbitMQConnection()
    
    max_retries = 5
    for attempt in range(max_retries):
        if rabbitmq.connect():
            break
        logger.warning(f"RabbitMQ connection attempt {attempt + 1}/{max_retries} failed")
        time.sleep(5)
    else:
        logger.error("Failed to connect to RabbitMQ after multiple attempts")
        sys.exit(1)
    
    # Start consuming messages
    logger.info(f"Starting to consume from queue: {settings.orders_queue}")
    logger.info("Worker is ready and waiting for orders...")
    
    try:
        rabbitmq.consume(process_order)
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.exception(f"Fatal error in consumer: {e}")
    finally:
        # Cleanup
        logger.info("Shutting down worker...")
        
        if rabbitmq:
            rabbitmq.disconnect()
        
        if catalog_client:
            catalog_client.disconnect()
        
        logger.info("Order Worker stopped")


if __name__ == "__main__":
    main()

