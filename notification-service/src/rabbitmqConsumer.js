/**
 * RabbitMQ Consumer for Notification Service
 * 
 * Listens to notifications_queue and broadcasts messages to connected
 * WebSocket clients using Socket.io rooms for private notifications.
 */
import amqp from 'amqplib';

// Configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const NOTIFICATIONS_QUEUE = process.env.NOTIFICATIONS_QUEUE || 'notifications_queue';

// Connection state
let connection = null;
let channel = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000;

/**
 * Starts the RabbitMQ consumer
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
export async function startConsumer(io) {
  try {
    console.log('🐰 Connecting to RabbitMQ...');
    
    // Connect to RabbitMQ
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Declare queue (idempotent)
    await channel.assertQueue(NOTIFICATIONS_QUEUE, {
      durable: true
    });
    
    // Set prefetch for fair dispatch
    await channel.prefetch(1);
    
    console.log(`✓ Connected to RabbitMQ, listening on queue: ${NOTIFICATIONS_QUEUE}`);
    reconnectAttempts = 0;
    
    // Handle connection errors
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
      handleReconnect(io);
    });
    
    connection.on('close', () => {
      console.warn('⚠️ RabbitMQ connection closed');
      handleReconnect(io);
    });
    
    // Start consuming messages
    channel.consume(NOTIFICATIONS_QUEUE, (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          handleNotification(io, content);
          channel.ack(msg);
        } catch (err) {
          console.error('❌ Error processing message:', err.message);
          // Reject and don't requeue malformed messages
          channel.nack(msg, false, false);
        }
      }
    });
    
  } catch (err) {
    console.error('❌ Failed to connect to RabbitMQ:', err.message);
    handleReconnect(io);
  }
}

/**
 * Handles incoming notification from RabbitMQ
 * @param {import('socket.io').Server} io - Socket.io server instance  
 * @param {Object} message - Notification message from queue
 */
function handleNotification(io, message) {
  const { type, data, worker } = message;
  
  console.log('📨 Received notification:', { type, data: data?.order_uuid?.slice(0, 8) + '...' });
  
  // Extract user_id from the nested data object
  const userId = data?.user_id;
  
  if (!userId) {
    console.warn('⚠️ Notification missing user_id, cannot route to specific user');
    return;
  }
  
  // Build notification payload for the client
  const notification = {
    type: type,
    order_uuid: data.order_uuid,
    event_id: data.event_id,
    seat_id: data.seat_id,
    status: type === 'order.completed' ? 'completed' : 'failed',
    qr_code_hash: data.qr_code_hash || null,
    total_amount: data.total_amount,
    processing_time_ms: data.processing_time_ms,
    error: data.error || null,
    timestamp: data.completed_at || data.timestamp || new Date().toISOString(),
    worker: worker
  };
  
  // Emit to the user's private room
  io.to(userId).emit('order_update', notification);
  
  console.log(`🔔 Notification sent to room [${userId.slice(0, 8)}...]: ${type}`);
  
  // Simulate email notification
  simulateEmailNotification(userId, notification);
}

/**
 * Simulates sending an email notification (for demo purposes)
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */
function simulateEmailNotification(userId, notification) {
  if (notification.status === 'completed') {
    console.log(`📧 Enviando correo de confirmación a usuario ${userId.slice(0, 8)}...`);
    console.log(`   📍 Orden: ${notification.order_uuid.slice(0, 8)}...`);
    console.log(`   🎫 Evento: ${notification.event_id}, Asiento: ${notification.seat_id}`);
    console.log(`   💰 Total: $${notification.total_amount}`);
    console.log(`   🔑 QR Hash: ${notification.qr_code_hash?.slice(0, 16)}...`);
  } else {
    console.log(`📧 Enviando correo de fallo a usuario ${userId.slice(0, 8)}...`);
    console.log(`   ❌ Error: ${notification.error || 'Unknown error'}`);
  }
}

/**
 * Handles reconnection with exponential backoff
 * @param {import('socket.io').Server} io - Socket.io server instance
 */
function handleReconnect(io) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Max reconnection attempts reached. Giving up.');
    return;
  }
  
  reconnectAttempts++;
  const delay = RECONNECT_DELAY_MS * Math.min(reconnectAttempts, 5);
  
  console.log(`🔄 Attempting to reconnect in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
  
  setTimeout(() => {
    startConsumer(io);
  }, delay);
}

/**
 * Gracefully closes the RabbitMQ connection
 */
export async function closeConnection() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('🐰 RabbitMQ connection closed gracefully');
  } catch (err) {
    console.error('Error closing RabbitMQ connection:', err.message);
  }
}
