import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const ordersReceivedCounter = new client.Counter({
  name: 'orders_received_total',
  help: 'Total number of orders received',
  labelNames: ['instrument', 'type', 'side'],
  registers: [register],
});

const ordersMatchedCounter = new client.Counter({
  name: 'orders_matched_total',
  help: 'Total number of orders matched',
  labelNames: ['instrument'],
  registers: [register],
});

const ordersRejectedCounter = new client.Counter({
  name: 'orders_rejected_total',
  help: 'Total number of orders rejected',
  labelNames: ['instrument', 'reason'],
  registers: [register],
});

const tradesCounter = new client.Counter({
  name: 'trades_total',
  help: 'Total number of trades executed',
  labelNames: ['instrument'],
  registers: [register],
});

const orderLatencyHistogram = new client.Histogram({
  name: 'order_latency_seconds',
  help: 'Order processing latency in seconds',
  labelNames: ['instrument', 'type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const orderbookDepthGauge = new client.Gauge({
  name: 'current_orderbook_depth',
  help: 'Current orderbook depth (total quantity on both sides)',
  labelNames: ['instrument', 'side'],
  registers: [register],
});

const websocketConnectionsGauge = new client.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// Helper functions
export const incrementCounter = (name, labels = {}) => {
  switch (name) {
    case 'orders_received_total':
      ordersReceivedCounter.inc(labels);
      break;
    case 'orders_matched_total':
      ordersMatchedCounter.inc(labels);
      break;
    case 'orders_rejected_total':
      ordersRejectedCounter.inc(labels);
      break;
    case 'trades_total':
      tradesCounter.inc(labels);
      break;
  }
};

export const observeHistogram = (name, value, labels = {}) => {
  switch (name) {
    case 'order_latency_seconds':
      orderLatencyHistogram.observe(labels, value);
      break;
  }
};

export const setGauge = (name, value, labels = {}) => {
  switch (name) {
    case 'current_orderbook_depth':
      orderbookDepthGauge.set(labels, value);
      break;
    case 'websocket_connections':
      websocketConnectionsGauge.set(value);
      break;
  }
};

export const getMetrics = async () => {
  return await register.metrics();
};

export { register };
