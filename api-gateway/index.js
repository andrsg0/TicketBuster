import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'TicketBuster API Gateway',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      catalog: '/api/catalog',
      orders: '/api/orders',
      notifications: '/api/notifications'
    }
  });
});

// Catalog Service proxy (placeholder)
app.use('/api/catalog', (req, res) => {
  res.json({ message: 'Catalog service endpoint - to be implemented' });
});

// Order Service proxy (placeholder)
app.use('/api/orders', (req, res) => {
  res.json({ message: 'Order service endpoint - to be implemented' });
});

// Notification Service proxy (placeholder)
app.use('/api/notifications', (req, res) => {
  res.json({ message: 'Notification service endpoint - to be implemented' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
