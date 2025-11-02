import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();

/**
 * Initialize WebSocket server
 */
export const initWebSocketServer = (server) => {
  wss = new WebSocketServer({ server, path: '/stream' });

  wss.on('connection', (ws, req) => {
    console.log(`✅ New WebSocket connection from ${req.socket.remoteAddress}`);
    clients.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to trading exchange stream',
      timestamp: new Date().toISOString(),
    }));

    // Handle client subscriptions
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe') {
          ws.subscriptions = data.channels || ['orderbook_deltas', 'trades', 'orders'];
          ws.send(JSON.stringify({
            type: 'subscribed',
            channels: ws.subscriptions,
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    // Set default subscriptions
    ws.subscriptions = ['orderbook_deltas', 'trades', 'orders'];
  });

  console.log('✅ WebSocket server initialized on /stream');
};

/**
 * Broadcast message to all connected clients
 */
const broadcast = (data, channel = null) => {
  const message = JSON.stringify(data);
  
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      // Check if client is subscribed to this channel
      if (!channel || !client.subscriptions || client.subscriptions.includes(channel)) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error sending to client:', error);
        }
      }
    }
  });
};

/**
 * Broadcast orderbook update
 */
export const broadcastOrderbookUpdate = (instrument, orderbook) => {
  broadcast({
    type: 'orderbook_delta',
    instrument,
    data: orderbook,
    timestamp: new Date().toISOString(),
  }, 'orderbook_deltas');
};

/**
 * Broadcast new trade
 */
export const broadcastTrade = (trade) => {
  broadcast({
    type: 'trade',
    data: {
      trade_id: trade.trade_id,
      instrument: trade.instrument,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.quantity),
      buy_order_id: trade.buy_order_id,
      sell_order_id: trade.sell_order_id,
      timestamp: trade.timestamp,
    },
    timestamp: new Date().toISOString(),
  }, 'trades');
};

/**
 * Broadcast order update
 */
export const broadcastOrderUpdate = (order) => {
  broadcast({
    type: 'order_update',
    data: {
      order_id: order.order_id,
      status: order.status,
      filled_quantity: parseFloat(order.filled_quantity),
      remaining_quantity: parseFloat(order.quantity) - parseFloat(order.filled_quantity),
    },
    timestamp: new Date().toISOString(),
  }, 'orders');
};

/**
 * Get connected clients count
 */
export const getConnectedClientsCount = () => clients.size;
