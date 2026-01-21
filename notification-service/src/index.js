/**
 * TicketBuster Notification Service
 * 
 * Real-time notification bridge between RabbitMQ and WebSocket clients.
 * Uses Socket.io rooms for private per-user notifications.
 * 
 * Architecture:
 *   Order Worker → [notifications_queue] → This Service → WebSocket → Browser
 */
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { startConsumer, closeConnection } from './rabbitmqConsumer.js';

// Configuration
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Performance optimizations
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Track connected users for monitoring
const connectedUsers = new Map(); // userId -> Set of socket IDs

// ============================================
// REST API Endpoints
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    stats: {
      totalSockets: io.sockets.sockets.size,
      uniqueUsers: connectedUsers.size,
      rooms: io.sockets.adapter.rooms.size
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TicketBuster Notification Service',
    version: '2.0.0',
    description: 'Real-time notifications via WebSockets',
    endpoints: {
      health: '/health',
      websocket: `ws://localhost:${PORT}`,
      stats: '/stats'
    },
    socketEvents: {
      client: {
        join_room: 'Join a private notification room (send user_id)',
        leave_room: 'Leave the notification room'
      },
      server: {
        order_update: 'Receives order status updates',
        notification: 'Receives general notifications'
      }
    }
  });
});

// Statistics endpoint
app.get('/stats', (req, res) => {
  const roomStats = {};
  connectedUsers.forEach((sockets, userId) => {
    roomStats[userId.slice(0, 8) + '...'] = sockets.size;
  });
  
  res.json({
    totalConnections: io.sockets.sockets.size,
    uniqueUsers: connectedUsers.size,
    userRooms: roomStats
  });
});

// Manual notification endpoint (for testing)
app.post('/notify', (req, res) => {
  const { user_id, message, type = 'info' } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  
  const notification = {
    type,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Send to specific user's room
  io.to(user_id).emit('notification', notification);
  
  const roomSize = io.sockets.adapter.rooms.get(user_id)?.size || 0;
  
  res.json({
    success: true,
    delivered_to: roomSize,
    user_id: user_id.slice(0, 8) + '...'
  });
});

// ============================================
// Socket.io Connection Handling
// ============================================

io.on('connection', (socket) => {
  console.log(`🔌 New socket connected: ${socket.id}`);
  
  // Handle user joining their private room
  socket.on('join_room', (userId) => {
    if (!userId || typeof userId !== 'string') {
      socket.emit('error', { message: 'Invalid user_id provided' });
      return;
    }
    
    // Join the user's private room
    socket.join(userId);
    
    // Track connected users
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);
    
    // Store userId on socket for cleanup
    socket.userId = userId;
    
    console.log(`👤 User [${userId.slice(0, 8)}...] joined room (socket: ${socket.id})`);
    
    // Confirm to client
    socket.emit('room_joined', {
      success: true,
      room: userId,
      message: 'You will now receive order updates'
    });
  });
  
  // Handle user leaving room
  socket.on('leave_room', () => {
    if (socket.userId) {
      socket.leave(socket.userId);
      removeUserSocket(socket.userId, socket.id);
      console.log(`👋 User [${socket.userId.slice(0, 8)}...] left room`);
      socket.emit('room_left', { success: true });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    if (socket.userId) {
      removeUserSocket(socket.userId, socket.id);
    }
    console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
  });
  
  // Handle errors
  socket.on('error', (err) => {
    console.error(`❌ Socket error (${socket.id}):`, err.message);
  });
});

/**
 * Remove a socket from user tracking
 */
function removeUserSocket(userId, socketId) {
  const userSockets = connectedUsers.get(userId);
  if (userSockets) {
    userSockets.delete(socketId);
    if (userSockets.size === 0) {
      connectedUsers.delete(userId);
    }
  }
}

// ============================================
// Server Startup
// ============================================

async function startServer() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     TicketBuster Notification Service                  ║');
  console.log('║     Real-time WebSocket Notifications                  ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  
  // Start HTTP + WebSocket server
  httpServer.listen(PORT, () => {
    console.log(`║  🚀 Server running on port ${PORT}                        ║`);
    console.log(`║  🌐 WebSocket: ws://localhost:${PORT}                     ║`);
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
  });
  
  // Start RabbitMQ consumer
  await startConsumer(io);
}

// ============================================
// Graceful Shutdown
// ============================================

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  // Close RabbitMQ connection
  await closeConnection();
  
  // Close all socket connections
  io.close(() => {
    console.log('✓ Socket.io connections closed');
  });
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
