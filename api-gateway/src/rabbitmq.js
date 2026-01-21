import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'orders_queue';
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

let connection = null;
let channel = null;
let isConnected = false;

async function connect(retries = 0) {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Assert the queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
      isConnected = false;
      // Attempt to reconnect after delay
      setTimeout(() => connect(), RETRY_DELAY);
    });
    
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed');
      isConnected = false;
      setTimeout(() => connect(), RETRY_DELAY);
    });
    
    isConnected = true;
    console.log(`✓ Connected to RabbitMQ (${QUEUE_NAME} queue ready)`);
  } catch (error) {
    console.error(`Failed to connect to RabbitMQ (attempt ${retries + 1}/${MAX_RETRIES}):`, error.message);
    
    if (retries < MAX_RETRIES - 1) {
      console.log(`Retrying in ${RETRY_DELAY / 1000}s...`);
      setTimeout(() => connect(retries + 1), RETRY_DELAY);
    } else {
      console.error('Max retries reached. RabbitMQ unavailable.');
      // Don't throw - let the gateway continue but orders won't be sent
    }
  }
}

export async function sendOrderToQueue(orderData) {
  if (!isConnected || !channel) {
    throw new Error('RabbitMQ channel not available. Connection failed.');
  }
  
  const message = JSON.stringify(orderData);
  const buffer = Buffer.from(message);
  
  try {
    channel.sendToQueue(QUEUE_NAME, buffer, { persistent: true });
    console.log(`Order sent to queue:`, orderData);
    return { success: true, message: 'Order queued successfully' };
  } catch (error) {
    console.error('Failed to send order to queue:', error);
    throw error;
  }
}

export async function disconnect() {
  if (channel) await channel.close();
  if (connection) await connection.close();
  isConnected = false;
}

// Initialize connection on module load
connect();

export { isConnected };
