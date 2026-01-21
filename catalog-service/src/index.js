import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { queryWithSchema } from './db.js';
import { startGrpcServer } from './grpcServer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'catalog-service', timestamp: new Date().toISOString() });
});

app.get('/events', async (_req, res) => {
  try {
    const { rows } = await queryWithSchema(
      'SELECT id, title, description, date, price, total_seats FROM events ORDER BY date ASC',
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
      'SELECT id, title, description, date, price, total_seats FROM events WHERE id = $1',
      [eventId],
    );

    if (eventResult.rowCount === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const seatsResult = await queryWithSchema(
      "SELECT id, seat_number, status FROM seats WHERE event_id = $1 AND status = 'AVAILABLE' ORDER BY seat_number",
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

  if (!eventId || !seatId) {
    res.status(400).json({ error: 'Invalid event or seat id' });
    return;
  }

  try {
    const { rowCount, rows } = await queryWithSchema(
      "UPDATE seats SET status = 'LOCKED' WHERE id = $1 AND event_id = $2 AND status = 'AVAILABLE' RETURNING id, status",
      [seatId, eventId],
    );

    if (rowCount === 0) {
      res.status(409).json({ error: 'Seat not available to lock' });
      return;
    }

    res.json({ success: true, seat: rows[0] });
  } catch (error) {
    console.error('Error locking seat:', error);
    res.status(500).json({ error: 'Failed to lock seat' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Catalog Service REST API running on port ${PORT}`);
});

startGrpcServer();
