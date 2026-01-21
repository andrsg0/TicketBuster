import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { queryWithSchema } from './db.js';
import { startGrpcServer } from './grpcServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const LOCK_EXPIRY_MINUTES = 5; // Tiempo de expiración del lock en minutos

app.use(cors());
app.use(express.json());

// ============================================
// Función para limpiar locks expirados
// ============================================
async function cleanExpiredLocks() {
  try {
    const result = await queryWithSchema(
      `UPDATE seats 
       SET status = 'AVAILABLE', locked_at = NULL, locked_by_user_id = NULL 
       WHERE status = 'LOCKED' 
       AND locked_at < (CURRENT_TIMESTAMP - INTERVAL '${LOCK_EXPIRY_MINUTES} minutes')
       RETURNING id, section, row, seat_number`
    );
    if (result.rowCount > 0) {
      console.log(`🔓 Cleaned ${result.rowCount} expired seat locks`);
    }
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning expired locks:', error);
    return 0;
  }
}

// Limpiar locks expirados cada minuto
setInterval(cleanExpiredLocks, 60 * 1000);

// También limpiar al iniciar
cleanExpiredLocks();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'catalog-service', timestamp: new Date().toISOString() });
});

app.get('/events', async (_req, res) => {
  try {
    const { rows } = await queryWithSchema(
      `SELECT e.id, e.title, e.description, e.category, e.venue, e.venue_address, 
              e.image_url, e.date, e.price, e.total_seats,
              (SELECT COUNT(*) FROM seats s WHERE s.event_id = e.id AND s.status = 'AVAILABLE') as available_seats
       FROM events e 
       ORDER BY e.date ASC`,
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/events/:id', async (req, res) => {
  const eventId = Number(req.params.id);

  if (!eventId) {
    res.status(400).json({ error: 'Invalid event id' });
    return;
  }

  try {
    const eventResult = await queryWithSchema(
      `SELECT id, title, description, category, venue, venue_address, 
              image_url, date, price, total_seats,
              (SELECT COUNT(*) FROM seats WHERE event_id = $1 AND status = 'AVAILABLE') as available_seats
       FROM events WHERE id = $1`,
      [eventId],
    );

    if (eventResult.rowCount === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Obtener asientos agrupados por sección y fila
    const seatsResult = await queryWithSchema(
      `SELECT id, section, row, seat_number, status 
       FROM seats 
       WHERE event_id = $1 
       ORDER BY section, row, seat_number`,
      [eventId],
    );

    res.json({ event: eventResult.rows[0], seats: seatsResult.rows });
  } catch (error) {
    console.error('Error fetching event detail:', error);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

app.post('/events/:id/seats/:seatId/lock', async (req, res) => {
  const eventId = Number(req.params.id);
  const seatId = Number(req.params.seatId);
  const userId = req.body?.user_id || null;

  if (!eventId || !seatId) {
    res.status(400).json({ error: 'Invalid event or seat id' });
    return;
  }

  try {
    const { rowCount, rows } = await queryWithSchema(
      `UPDATE seats 
       SET status = 'LOCKED', locked_at = CURRENT_TIMESTAMP, locked_by_user_id = $3
       WHERE id = $1 AND event_id = $2 AND status = 'AVAILABLE' 
       RETURNING id, status, locked_at`,
      [seatId, eventId, userId],
    );

    if (rowCount === 0) {
      res.status(409).json({ error: 'Seat not available to lock' });
      return;
    }

    console.log(`🔒 Seat ${seatId} locked by user ${userId || 'anonymous'}`);
    res.json({ success: true, seat: rows[0] });
  } catch (error) {
    console.error('Error locking seat:', error);
    res.status(500).json({ error: 'Failed to lock seat' });
  }
});

// Endpoint para desbloquear un asiento
app.post('/events/:id/seats/:seatId/unlock', async (req, res) => {
  const eventId = Number(req.params.id);
  const seatId = Number(req.params.seatId);
  const userId = req.body?.user_id || null;

  if (!eventId || !seatId) {
    res.status(400).json({ error: 'Invalid event or seat id' });
    return;
  }

  try {
    // Solo desbloquear si está LOCKED (no SOLD)
    // Opcionalmente verificar que el usuario sea el mismo que bloqueó
    let query = `UPDATE seats 
       SET status = 'AVAILABLE', locked_at = NULL, locked_by_user_id = NULL
       WHERE id = $1 AND event_id = $2 AND status = 'LOCKED'`;
    const params = [seatId, eventId];
    
    // Si se proporciona user_id, solo desbloquear si es el mismo usuario
    if (userId) {
      query += ` AND (locked_by_user_id = $3 OR locked_by_user_id IS NULL)`;
      params.push(userId);
    }
    
    query += ` RETURNING id, status`;

    const { rowCount, rows } = await queryWithSchema(query, params);

    if (rowCount === 0) {
      // Puede que ya esté desbloqueado o vendido - no es un error crítico
      res.json({ success: true, message: 'Seat was already unlocked or sold' });
      return;
    }

    console.log(`🔓 Seat ${seatId} unlocked by user ${userId || 'anonymous'}`);
    res.json({ success: true, seat: rows[0] });
  } catch (error) {
    console.error('Error unlocking seat:', error);
    res.status(500).json({ error: 'Failed to unlock seat' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Catalog Service REST API running on port ${PORT}`);
});

startGrpcServer();
