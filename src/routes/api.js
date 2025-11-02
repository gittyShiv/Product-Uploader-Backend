import express from 'express';
import { createOrder, cancelOrder, getOrder } from '../services/orderService.js';
import { getCurrentOrderbook, createSnapshot } from '../services/orderbookService.js';
import { getRecentTrades, getTradeStats } from '../services/tradeService.js';
import { getMetrics } from '../services/metricsService.js';

const router = express.Router();

/**
 * POST /orders - Create a new order
 */
router.post('/orders', async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /orders/:order_id/cancel - Cancel an order
 */
router.post('/orders/:order_id/cancel', async (req, res) => {
  try {
    const order = await cancelOrder(req.params.order_id);
    res.json({
      order_id: order.order_id,
      status: order.status,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    
    if (error.message === 'Order not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /orders/:order_id - Get order details
 */
router.get('/orders/:order_id', async (req, res) => {
  try {
    const order = await getOrder(req.params.order_id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /orderbook - Get current orderbook
 */
router.get('/orderbook', async (req, res) => {
  try {
    const { instrument = 'BTC-USD', levels = 20 } = req.query;
    const orderbook = getCurrentOrderbook(instrument, parseInt(levels));
    res.json(orderbook);
  } catch (error) {
    console.error('Error fetching orderbook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /orderbook/snapshot - Create orderbook snapshot
 */
router.post('/orderbook/snapshot', async (req, res) => {
  try {
    const { instrument = 'BTC-USD' } = req.body;
    const snapshot = await createSnapshot(instrument);
    res.status(201).json(snapshot);
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /trades - Get recent trades
 */
router.get('/trades', async (req, res) => {
  try {
    const { instrument = 'BTC-USD', limit = 50 } = req.query;
    const trades = await getRecentTrades(instrument, parseInt(limit));
    res.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /trades/stats - Get trade statistics
 */
router.get('/trades/stats', async (req, res) => {
  try {
    const { instrument = 'BTC-USD', minutes = 60 } = req.query;
    const stats = await getTradeStats(instrument, parseInt(minutes));
    
    if (!stats) {
      return res.json({ message: 'No trades in the specified period' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching trade stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /healthz - Health check
 */
router.get('/healthz', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /metrics - Prometheus metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', 'text/plain');
    const metrics = await getMetrics();
    res.send(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
