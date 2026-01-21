import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './auth.js';
import { sendOrderToQueue, isConnected } from './rabbitmq.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    rabbitmq: isConnected ? 'connected' : 'disconnected',
  });
});

// ============================================
// Public routes: Proxy to Catalog Service
// Using native fetch (no deprecated libraries)
// ============================================

app.get('/api/events', async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/events`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[PROXY] Error fetching events:', error.message);
    res.status(502).json({ error: 'Catalog service unavailable' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/events/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[PROXY] Error fetching event:', error.message);
    res.status(502).json({ error: 'Catalog service unavailable' });
  }
});

// Protected route: Create order (async - returns 202 Accepted)
app.post('/api/buy', authMiddleware, async (req, res) => {
  try {
    const { event_id, seat_id } = req.body;

    // Validate input
    if (!event_id || !seat_id) {
      return res.status(400).json({ error: 'event_id and seat_id are required' });
    }

    const orderId = uuidv4();

    // Build order message
    const orderData = {
      order_id: orderId,
      user_id: req.user.sub,
      event_id,
      seat_id,
      complexity_level: Math.floor(Math.random() * 10) + 1,
      created_at: new Date().toISOString(),
    };

    // Send to RabbitMQ queue
    if (!isConnected) {
      return res.status(503).json({ error: 'Order service temporarily unavailable' });
    }

    await sendOrderToQueue(orderData);

    // Respond with 202 Accepted (asynchronous processing)
    res.status(202).json({
      message: 'Orden recibida y procesándose',
      order_id: orderId,
      data: {
        user_id: orderData.user_id,
        event_id: orderData.event_id,
        seat_id: orderData.seat_id,
      },
    });

    console.log(`✓ Order accepted:`, orderData);
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  API Gateway running on port ${PORT}       ║
║  Catalog Service: ${CATALOG_URL}     ║
╚════════════════════════════════════════╝
`);
});
