"""
RabbitMQ consumer and publisher for Order Worker.
Consumes from orders_queue and publishes to notifications_queue.
"""
import json
import logging
import time
from typing import Callable, Optional, Any
from dataclasses import dataclass

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from .config import settings

logger = logging.getLogger(__name__)


@dataclass
class OrderMessage:
    """Parsed order message from RabbitMQ."""
    order_uuid: str
    user_id: str
    event_id: int
    seat_id: int
    total_amount: float
    processing_complexity: int
    timestamp: str
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    retry_count: int = 0
    priority: int = 5
    client_metadata: Optional[dict] = None
    
    @classmethod
    def from_dict(cls, data: dict) -> "OrderMessage":
        """Create OrderMessage from dictionary."""
        return cls(
            order_uuid=data.get("order_uuid"),
            user_id=data.get("user_id"),
            event_id=data.get("event_id"),
            seat_id=data.get("seat_id"),
            total_amount=data.get("total_amount", 0.0),
            processing_complexity=data.get("processing_complexity", 5),
            timestamp=data.get("timestamp"),
            payment_method=data.get("payment_method"),
            payment_reference=data.get("payment_reference"),
            retry_count=data.get("retry_count", 0),
            priority=data.get("priority", 5),
            client_metadata=data.get("client_metadata"),
        )


class RabbitMQConnection:
    """
    RabbitMQ connection manager with reconnection logic.
    Handles consuming from orders_queue and publishing to notifications_queue.
    """
    
    def __init__(self):
        self._connection: Optional[pika.BlockingConnection] = None
        self._channel: Optional[BlockingChannel] = None
        self._reconnect_delay = 5
        self._max_reconnect_delay = 60
        
    def connect(self) -> bool:
        """
        Establish connection to RabbitMQ.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            credentials = pika.PlainCredentials(
                settings.rabbitmq_user,
                settings.rabbitmq_password
            )
            
            parameters = pika.ConnectionParameters(
                host=settings.rabbitmq_host,
                port=settings.rabbitmq_port,
                virtual_host=settings.rabbitmq_vhost,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300,
            )
            
            self._connection = pika.BlockingConnection(parameters)
            self._channel = self._connection.channel()
            
            # Set QoS (prefetch count)
            self._channel.basic_qos(prefetch_count=settings.prefetch_count)
            
            # Declare queues (idempotent)
            self._declare_queues()
            
            logger.info(
                f"Connected to RabbitMQ at "
                f"{settings.rabbitmq_host}:{settings.rabbitmq_port}"
            )
            return True
            
        except pika.exceptions.AMQPConnectionError as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to RabbitMQ: {e}")
            return False
    
    def _declare_queues(self):
        """Declare required queues (idempotent operation)."""
        # Orders queue (consumed by this worker)
        # Note: Don't set extra arguments if queue already exists
        # to avoid PRECONDITION_FAILED errors
        try:
            self._channel.queue_declare(
                queue=settings.orders_queue,
                durable=True,
                passive=True  # Just check if exists, don't create with args
            )
            logger.info(f"Queue {settings.orders_queue} already exists")
        except pika.exceptions.ChannelClosedByBroker:
            # Queue doesn't exist, create it with full arguments
            self._connection = None
            self.connect()  # Reconnect to get new channel
            self._channel.queue_declare(
                queue=settings.orders_queue,
                durable=True
            )
        
        # Dead letter queue for orders
        self._channel.queue_declare(
            queue=f"{settings.orders_queue}_dlq",
            durable=True
        )
        
        # Notifications queue (published to by this worker)
        self._channel.queue_declare(
            queue=settings.notifications_queue,
            durable=True
        )
        
        logger.info(
            f"Declared queues: {settings.orders_queue}, "
            f"{settings.orders_queue}_dlq, {settings.notifications_queue}"
        )
    
    def disconnect(self):
        """Close RabbitMQ connection."""
        if self._connection and self._connection.is_open:
            try:
                self._connection.close()
                logger.info("Disconnected from RabbitMQ")
            except Exception as e:
                logger.error(f"Error disconnecting from RabbitMQ: {e}")
        
        self._connection = None
        self._channel = None
    
    def reconnect_with_backoff(self) -> bool:
        """
        Attempt to reconnect with exponential backoff.
        
        Returns:
            True if reconnection successful
        """
        delay = self._reconnect_delay
        
        while True:
            logger.info(f"Attempting to reconnect in {delay} seconds...")
            time.sleep(delay)
            
            if self.connect():
                self._reconnect_delay = 5  # Reset delay on success
                return True
            
            # Exponential backoff
            delay = min(delay * 2, self._max_reconnect_delay)
    
    def consume(
        self,
        callback: Callable[[OrderMessage], bool],
        queue: str = None
    ):
        """
        Start consuming messages from orders queue.
        
        Args:
            callback: Function to process each message.
                      Should return True if processed successfully.
            queue: Queue name (defaults to settings.orders_queue)
        """
        queue = queue or settings.orders_queue
        
        def on_message(
            channel: BlockingChannel,
            method: Basic.Deliver,
            properties: BasicProperties,
            body: bytes
        ):
            """Handle incoming message."""
            try:
                # Parse message
                data = json.loads(body.decode('utf-8'))
                message = OrderMessage.from_dict(data)
                
                logger.info(
                    f"Received order: {message.order_uuid}, "
                    f"event={message.event_id}, seat={message.seat_id}"
                )
                
                # Process message
                success = callback(message)
                
                if success:
                    # Acknowledge message
                    channel.basic_ack(delivery_tag=method.delivery_tag)
                    logger.info(f"Order {message.order_uuid} processed successfully")
                else:
                    # Reject and requeue (or send to DLQ if retry_count > threshold)
                    if message.retry_count >= 3:
                        # Send to DLQ
                        channel.basic_reject(
                            delivery_tag=method.delivery_tag,
                            requeue=False
                        )
                        logger.warning(
                            f"Order {message.order_uuid} sent to DLQ after "
                            f"{message.retry_count} retries"
                        )
                    else:
                        # Requeue for retry
                        channel.basic_nack(
                            delivery_tag=method.delivery_tag,
                            requeue=True
                        )
                        logger.warning(f"Order {message.order_uuid} requeued for retry")
                        
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in message: {e}")
                channel.basic_reject(delivery_tag=method.delivery_tag, requeue=False)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        
        # Start consuming
        self._channel.basic_consume(
            queue=queue,
            on_message_callback=on_message,
            auto_ack=False
        )
        
        logger.info(f"Started consuming from {queue}")
        
        try:
            self._channel.start_consuming()
        except pika.exceptions.ConnectionClosedByBroker:
            logger.warning("Connection closed by broker, attempting reconnect")
            self.reconnect_with_backoff()
        except pika.exceptions.AMQPChannelError as e:
            logger.error(f"Channel error: {e}")
            raise
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
            self._channel.stop_consuming()
    
    def publish_notification(
        self,
        notification_type: str,
        data: dict,
        queue: str = None
    ) -> bool:
        """
        Publish notification message to notifications queue.
        
        Args:
            notification_type: "order.completed" or "order.failed"
            data: Notification payload
            queue: Target queue (defaults to settings.notifications_queue)
            
        Returns:
            True if published successfully
        """
        queue = queue or settings.notifications_queue
        
        try:
            message = {
                "type": notification_type,
                "data": data,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "worker": settings.worker_name
            }
            
            self._channel.basic_publish(
                exchange="",
                routing_key=queue,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Persistent
                    content_type="application/json"
                )
            )
            
            logger.info(f"Published {notification_type} notification to {queue}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish notification: {e}")
            return False
    
    def health_check(self) -> bool:
        """Check RabbitMQ connection health."""
        return (
            self._connection is not None and 
            self._connection.is_open and
            self._channel is not None and
            self._channel.is_open
        )
