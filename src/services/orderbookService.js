import { OrderbookSnapshot } from '../config/database.js';
import { matchingEngine } from './matchingEngine.js';

/**
 * Create an orderbook snapshot
 */
export const createSnapshot = async (instrument = 'BTC-USD') => {
  const orderbook = matchingEngine.getOrderbook(100);

  const snapshot = await OrderbookSnapshot.create({
    instrument,
    bids: orderbook.bids,
    asks: orderbook.asks,
    timestamp: new Date(),
  });

  return {
    snapshot_id: snapshot.id,
    instrument: snapshot.instrument,
    timestamp: snapshot.timestamp,
    bid_levels: orderbook.bids.length,
    ask_levels: orderbook.asks.length,
  };
};

/**
 * Get latest orderbook snapshot
 */
export const getLatestSnapshot = async (instrument = 'BTC-USD') => {
  const snapshot = await OrderbookSnapshot.findOne({
    where: { instrument },
    order: [['timestamp', 'DESC']],
  });

  if (!snapshot) {
    return null;
  }

  return {
    snapshot_id: snapshot.id,
    instrument: snapshot.instrument,
    bids: snapshot.bids,
    asks: snapshot.asks,
    timestamp: snapshot.timestamp,
  };
};

/**
 * Get current orderbook from matching engine
 */
export const getCurrentOrderbook = (instrument = 'BTC-USD', levels = 20) => {
  const orderbook = matchingEngine.getOrderbook(levels);

  // Add cumulative depth
  let bidCumulative = 0;
  orderbook.bids = orderbook.bids.map(level => {
    bidCumulative += level.quantity;
    return { ...level, cumulative: bidCumulative };
  });

  let askCumulative = 0;
  orderbook.asks = orderbook.asks.map(level => {
    askCumulative += level.quantity;
    return { ...level, cumulative: askCumulative };
  });

  return orderbook;
};
