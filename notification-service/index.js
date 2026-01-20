import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'notification-service', 
    timestamp: new Date().toISOString(),
    connections: wss.clients.size 
  });
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Notification Service - WebSocket Server',
    version: '1.0.0',
    connections: wss.clients.size
  });
});

// Send notification endpoint (for testing)
app.post('/notify', (req, res) => {
  const { message, type = 'info' } = req.body;
  
  const notification = {
    type,
    message,
    timestamp: new Date().toISOString()
  };

  // Broadcast to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(notification));
    }
  });

  res.json({ success: true, sent: wss.clients.size });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket connection');

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to TicketBuster notifications',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (data) => {
    console.log('📨 Received:', data.toString());
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🔔 Notification Service running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});
