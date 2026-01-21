import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { authMiddleware } from './auth.js';
import { sendOrderToQueue, isConnected } from './rabbitmq.js';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:3000';

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'ticketbuster',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'admin',
});

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

// Endpoint para obtener asientos de un evento
app.get('/api/events/:id/seats', async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/events/${req.params.id}`);
    const data = await response.json();
    // El catalog-service devuelve { event, seats } - solo enviamos los seats
    res.status(response.status).json({ seats: data.seats || [] });
  } catch (error) {
    console.error('[PROXY] Error fetching seats:', error.message);
    res.status(502).json({ error: 'Catalog service unavailable' });
  }
});

// Endpoint para bloquear un asiento
app.post('/api/events/:id/seats/:seatId/lock', authMiddleware, async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/events/${req.params.id}/seats/${req.params.seatId}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: req.user.sub })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[PROXY] Error locking seat:', error.message);
    res.status(502).json({ error: 'Catalog service unavailable' });
  }
});

// Endpoint para desbloquear un asiento
app.post('/api/events/:id/seats/:seatId/unlock', authMiddleware, async (req, res) => {
  try {
    const response = await fetch(`${CATALOG_URL}/events/${req.params.id}/seats/${req.params.seatId}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: req.user.sub })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('[PROXY] Error unlocking seat:', error.message);
    res.status(502).json({ error: 'Catalog service unavailable' });
  }
});

// Protected route: Create order (async - returns 202 Accepted)
app.post('/api/buy', authMiddleware, async (req, res) => {
  try {
    const { event_id, seat_id, total_amount } = req.body;

    // Validate input
    if (!event_id || !seat_id) {
      return res.status(400).json({ error: 'event_id and seat_id are required' });
    }

    const orderUuid = uuidv4();

    // Build order message matching RABBITMQ_SCHEMA.md
    const orderData = {
      order_uuid: orderUuid,
      user_id: req.user.sub,  // Must be a valid UUID from Keycloak
      event_id: parseInt(event_id),
      seat_id: parseInt(seat_id),
      total_amount: parseFloat(total_amount) || 0.0,
      processing_complexity: Math.floor(Math.random() * 10) + 1,
      timestamp: new Date().toISOString(),
      payment_method: 'credit_card',
      retry_count: 0,
      priority: 5
    };

    // Send to RabbitMQ queue
    if (!isConnected) {
      return res.status(503).json({ error: 'Order service temporarily unavailable' });
    }

    await sendOrderToQueue(orderData);

    // Respond with 202 Accepted (asynchronous processing)
    res.status(202).json({
      message: 'Orden recibida y procesándose',
      order_uuid: orderUuid,
      data: {
        user_id: orderData.user_id,
        event_id: orderData.event_id,
        seat_id: orderData.seat_id,
        total_amount: orderData.total_amount
      },
    });

    console.log(`✓ Order accepted:`, orderData);
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ error: 'Failed to process order' });
  }
});

// ============================================
// User tickets endpoint
// ============================================
app.get('/api/users/:userId/tickets', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is requesting their own tickets
    if (req.user.sub !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Query orders with event info from catalog
    const ordersResult = await pool.query(`
      SELECT 
        o.id,
        o.order_uuid,
        o.event_id,
        o.seat_id,
        o.total_amount,
        o.status,
        o.qr_code_base64,
        o.created_at,
        o.completed_at,
        e.title as event_title,
        e.venue,
        e.date as event_date,
        e.image_url,
        s.section,
        s.row,
        s.seat_number
      FROM db_orders.orders o
      LEFT JOIN db_catalog.events e ON o.event_id = e.id
      LEFT JOIN db_catalog.seats s ON o.seat_id = s.id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [userId]);

    const tickets = ordersResult.rows.map(row => ({
      id: row.id,
      order_uuid: row.order_uuid,
      event_id: row.event_id,
      seat_id: row.seat_id,
      total_amount: parseFloat(row.total_amount),
      status: row.status,
      qr_code_base64: row.qr_code_base64,
      created_at: row.created_at,
      completed_at: row.completed_at,
      event_name: row.event_title,
      venue: row.venue,
      event_date: row.event_date,
      event_image: row.image_url,
      section: row.section,
      row: row.row,
      seat_number: row.seat_number
    }));

    res.json({ tickets });
  } catch (error) {
    console.error('[TICKETS] Error fetching user tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
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
