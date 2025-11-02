import { Trade } from '../config/database.js';
import { Op } from 'sequelize';

/**
 * Get recent trades
 */
export const getRecentTrades = async (instrument = 'BTC-USD', limit = 50) => {
  const trades = await Trade.findAll({
    where: { instrument },
    order: [['timestamp', 'DESC']],
    limit: Math.min(limit, 100),
  });

  return trades.map(trade => ({
    trade_id: trade.trade_id,
    instrument: trade.instrument,
    price: parseFloat(trade.price),
    quantity: parseFloat(trade.quantity),
    buy_order_id: trade.buy_order_id,
    sell_order_id: trade.sell_order_id,
    timestamp: trade.timestamp,
  }));
};

/**
 * Get trades for a specific order
 */
export const getTradesForOrder = async (orderId) => {
  const trades = await Trade.findAll({
    where: {
      [Op.or]: [
        { buy_order_id: orderId },
        { sell_order_id: orderId },
      ],
    },
    order: [['timestamp', 'DESC']],
  });

  return trades.map(trade => ({
    trade_id: trade.trade_id,
    instrument: trade.instrument,
    price: parseFloat(trade.price),
    quantity: parseFloat(trade.quantity),
    buy_order_id: trade.buy_order_id,
    sell_order_id: trade.sell_order_id,
    timestamp: trade.timestamp,
  }));
};

/**
 * Get trade statistics
 */
export const getTradeStats = async (instrument = 'BTC-USD', minutes = 60) => {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const trades = await Trade.findAll({
    where: {
      instrument,
      timestamp: { [Op.gte]: since },
    },
    order: [['timestamp', 'ASC']],
  });

  if (trades.length === 0) {
    return null;
  }

  let totalVolume = 0;
  let totalValue = 0;
  let high = 0;
  let low = Infinity;

  trades.forEach(trade => {
    const price = parseFloat(trade.price);
    const quantity = parseFloat(trade.quantity);
    
    totalVolume += quantity;
    totalValue += price * quantity;
    high = Math.max(high, price);
    low = Math.min(low, price);
  });

  const vwap = totalValue / totalVolume;
  const lastPrice = parseFloat(trades[trades.length - 1].price);

  return {
    instrument,
    period_minutes: minutes,
    trade_count: trades.length,
    volume: totalVolume.toFixed(8),
    vwap: vwap.toFixed(8),
    high: high.toFixed(8),
    low: low.toFixed(8),
    last_price: lastPrice.toFixed(8),
    timestamp: new Date().toISOString(),
  };
};
