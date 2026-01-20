import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'catalog-service', timestamp: new Date().toISOString() });
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Catalog Service - Event and Seat Management',
    version: '1.0.0'
  });
});

// Events endpoints (placeholder)
app.get('/events', (req, res) => {
  res.json({ 
    events: [
      { id: 1, name: 'Concierto Rock Festival', date: '2026-03-15', venue: 'Estadio Nacional', availableSeats: 5000 },
      { id: 2, name: 'Teatro Musical Broadway', date: '2026-04-20', venue: 'Teatro Municipal', availableSeats: 800 }
    ]
  });
});

app.get('/events/:id', (req, res) => {
  res.json({ 
    id: req.params.id, 
    name: 'Event details',
    message: 'Event detail endpoint - to be implemented' 
  });
});

// Seats endpoints (placeholder)
app.get('/events/:id/seats', (req, res) => {
  res.json({ 
    eventId: req.params.id,
    seats: [],
    message: 'Seats endpoint - to be implemented' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`📚 Catalog Service running on port ${PORT}`);
});
