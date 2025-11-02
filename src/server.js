import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initWebSocketServer, getConnectedClientsCount } from './services/websocketService.js';
import { matchingEngine } from './services/matchingEngine.js';
import { setGauge } from './services/metricsService.js';
import apiRoutes from './routes/api.js';
import { rateLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting on order submission
app.use('/orders', rateLimiter);

// Routes
app.use('/', apiRoutes);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Update WebSocket connections metric periodically
setInterval(() => {
  setGauge('websocket_connections', getConnectedClientsCount());
}, 5000);

// Update orderbook depth metric periodically
setInterval(() => {
  const depth = matchingEngine.getDepth();
  setGauge('current_orderbook_depth', depth.bidDepth, { instrument: 'BTC-USD', side: 'bid' });
  setGauge('current_orderbook_depth', depth.askDepth, { instrument: 'BTC-USD', side: 'ask' });
}, 10000);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('HTTP server closed');
  });

  setTimeout(() => {
    console.log('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();

    // Restore orderbook from database
    console.log('Restoring orderbook from database...');
    await matchingEngine.restore();

    // Start server
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 Trading Exchange Server Running              ║
║                                                    ║
║   HTTP API:        http://localhost:${PORT}        ║
║   WebSocket:       ws://localhost:${PORT}/stream   ║
║   Health Check:    http://localhost:${PORT}/healthz║
║   Metrics:         http://localhost:${PORT}/metrics║
╚════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
