import { v4 as uuidv4 } from 'uuid';
import { Order, Trade } from '../config/database.js';
import { broadcastOrderbookUpdate, broadcastTrade, broadcastOrderUpdate } from './websocketService.js';
import { incrementCounter, observeHistogram } from './metricsService.js';

/**
 * Matching Engine - Implements price-time priority matching
 * This engine processes orders and matches them against the orderbook
 */
class MatchingEngine {
  constructor(instrument = 'BTC-USD') {
    this.instrument = instrument;
    this.bids = []; // Buy orders sorted by price DESC, time ASC
    this.asks = []; // Sell orders sorted by price ASC, time ASC
    this.isProcessing = false;
    this.orderQueue = [];
  }

  /**
   * Add an order to the engine and process it
   */
  async addOrder(orderData) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      this.orderQueue.push({ orderData, resolve, reject, startTime });
      this.processQueue();
    });
  }

  /**
   * Process orders sequentially to avoid race conditions
   */
  async processQueue() {
    if (this.isProcessing || this.orderQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.orderQueue.length > 0) {
      const { orderData, resolve, reject, startTime } = this.orderQueue.shift();
      
      try {
        const result = await this.processOrder(orderData);
        const latency = (Date.now() - startTime) / 1000;
        observeHistogram('order_latency_seconds', latency);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single order
   */
  async processOrder(orderData) {
    const { type, side } = orderData;

    incrementCounter('orders_received_total');

    if (type === 'market') {
      return await this.processMarketOrder(orderData);
    } else if (type === 'limit') {
      return await this.processLimitOrder(orderData);
    } else {
      incrementCounter('orders_rejected_total');
      throw new Error(`Invalid order type: ${type}`);
    }
  }

  /**
   * Process a market order - match immediately
   */
  async processMarketOrder(orderData) {
    const { order_id, side, quantity, client_id } = orderData;
    let remainingQty = parseFloat(quantity);
    const trades = [];
    const oppositeBook = side === 'buy' ? this.asks : this.bids;

    // Match against opposite side of the book
    while (remainingQty > 0 && oppositeBook.length > 0) {
      const bestOrder = oppositeBook[0];
      const availableQty = parseFloat(bestOrder.quantity) - parseFloat(bestOrder.filled_quantity);
      const matchQty = Math.min(remainingQty, availableQty);

      // Create trade
      const trade = await this.executeTrade(
        side === 'buy' ? order_id : bestOrder.order_id,
        side === 'sell' ? order_id : bestOrder.order_id,
        parseFloat(bestOrder.price),
        matchQty,
        side === 'buy' ? client_id : bestOrder.client_id,
        side === 'sell' ? client_id : bestOrder.client_id
      );

      trades.push(trade);
      remainingQty -= matchQty;

      // Update the matched order
      bestOrder.filled_quantity = (parseFloat(bestOrder.filled_quantity) + matchQty).toFixed(8);
      
      if (parseFloat(bestOrder.filled_quantity) >= parseFloat(bestOrder.quantity)) {
        bestOrder.status = 'filled';
        oppositeBook.shift(); // Remove filled order from book
      } else {
        bestOrder.status = 'partially_filled';
      }

      await bestOrder.save();
      broadcastOrderUpdate(bestOrder);
    }

    // Determine final status
    const filledQty = parseFloat(quantity) - remainingQty;
    const status = filledQty === 0 ? 'rejected' : 
                   filledQty < parseFloat(quantity) ? 'partially_filled' : 'filled';

    if (status === 'rejected') {
      incrementCounter('orders_rejected_total');
    } else {
      incrementCounter('orders_matched_total');
    }

    // Broadcast orderbook update
    broadcastOrderbookUpdate(this.instrument, this.getOrderbook(10));

    return {
      order_id,
      status,
      filled_quantity: filledQty.toFixed(8),
      remaining_quantity: remainingQty.toFixed(8),
      trades,
    };
  }

  /**
   * Process a limit order - add to book or match
   */
  async processLimitOrder(orderData) {
    const { order_id, side, price, quantity, client_id } = orderData;
    let remainingQty = parseFloat(quantity);
    const trades = [];
    const orderPrice = parseFloat(price);

    // Try to match against opposite side
    const oppositeBook = side === 'buy' ? this.asks : this.bids;

    while (remainingQty > 0 && oppositeBook.length > 0) {
      const bestOrder = oppositeBook[0];
      const bestPrice = parseFloat(bestOrder.price);

      // Check if prices cross
      const canMatch = side === 'buy' ? orderPrice >= bestPrice : orderPrice <= bestPrice;
      
      if (!canMatch) break;

      const availableQty = parseFloat(bestOrder.quantity) - parseFloat(bestOrder.filled_quantity);
      const matchQty = Math.min(remainingQty, availableQty);

      // Create trade at the price of the resting order (price-time priority)
      const trade = await this.executeTrade(
        side === 'buy' ? order_id : bestOrder.order_id,
        side === 'sell' ? order_id : bestOrder.order_id,
        bestPrice,
        matchQty,
        side === 'buy' ? client_id : bestOrder.client_id,
        side === 'sell' ? client_id : bestOrder.client_id
      );

      trades.push(trade);
      remainingQty -= matchQty;

      // Update the matched order
      bestOrder.filled_quantity = (parseFloat(bestOrder.filled_quantity) + matchQty).toFixed(8);
      
      if (parseFloat(bestOrder.filled_quantity) >= parseFloat(bestOrder.quantity)) {
        bestOrder.status = 'filled';
        oppositeBook.shift();
      } else {
        bestOrder.status = 'partially_filled';
      }

      await bestOrder.save();
      broadcastOrderUpdate(bestOrder);
    }

    const filledQty = parseFloat(quantity) - remainingQty;

    // If there's remaining quantity, add to the book
    if (remainingQty > 0) {
      const bookOrder = {
        ...orderData,
        filled_quantity: filledQty.toFixed(8),
        status: filledQty > 0 ? 'partially_filled' : 'open',
      };

      // Add to appropriate side of the book
      if (side === 'buy') {
        this.bids.push(bookOrder);
        this.bids.sort((a, b) => {
          const priceDiff = parseFloat(b.price) - parseFloat(a.price);
          return priceDiff !== 0 ? priceDiff : new Date(a.created_at) - new Date(b.created_at);
        });
      } else {
        this.asks.push(bookOrder);
        this.asks.sort((a, b) => {
          const priceDiff = parseFloat(a.price) - parseFloat(b.price);
          return priceDiff !== 0 ? priceDiff : new Date(a.created_at) - new Date(b.created_at);
        });
      }
    }

    const status = remainingQty === 0 ? 'filled' : 
                   filledQty > 0 ? 'partially_filled' : 'open';

    if (status === 'filled' || status === 'partially_filled') {
      incrementCounter('orders_matched_total');
    }

    // Broadcast orderbook update
    broadcastOrderbookUpdate(this.instrument, this.getOrderbook(10));

    return {
      order_id,
      status,
      filled_quantity: filledQty.toFixed(8),
      remaining_quantity: remainingQty.toFixed(8),
      trades,
    };
  }

  /**
   * Execute a trade and persist it
   */
  async executeTrade(buyOrderId, sellOrderId, price, quantity, buyClientId, sellClientId) {
    const trade = await Trade.create({
      trade_id: uuidv4(),
      buy_order_id: buyOrderId,
      sell_order_id: sellOrderId,
      instrument: this.instrument,
      price: price.toFixed(8),
      quantity: quantity.toFixed(8),
      buy_client_id: buyClientId,
      sell_client_id: sellClientId,
      timestamp: new Date(),
    });

    incrementCounter('trades_total');
    broadcastTrade(trade);

    return trade;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId) {
    // Remove from bids
    const bidIndex = this.bids.findIndex(o => o.order_id === orderId);
    if (bidIndex !== -1) {
      const order = this.bids.splice(bidIndex, 1)[0];
      order.status = 'cancelled';
      await order.save();
      broadcastOrderUpdate(order);
      broadcastOrderbookUpdate(this.instrument, this.getOrderbook(10));
      return order;
    }

    // Remove from asks
    const askIndex = this.asks.findIndex(o => o.order_id === orderId);
    if (askIndex !== -1) {
      const order = this.asks.splice(askIndex, 1)[0];
      order.status = 'cancelled';
      await order.save();
      broadcastOrderUpdate(order);
      broadcastOrderbookUpdate(this.instrument, this.getOrderbook(10));
      return order;
    }

    return null;
  }

  /**
   * Get current orderbook state
   */
  getOrderbook(levels = 20) {
    const bids = this.bids.slice(0, levels).map(order => ({
      price: parseFloat(order.price),
      quantity: parseFloat(order.quantity) - parseFloat(order.filled_quantity),
      orders: 1,
    }));

    const asks = this.asks.slice(0, levels).map(order => ({
      price: parseFloat(order.price),
      quantity: parseFloat(order.quantity) - parseFloat(order.filled_quantity),
      orders: 1,
    }));

    // Aggregate by price level
    const aggregatedBids = this.aggregateByPrice(bids);
    const aggregatedAsks = this.aggregateByPrice(asks);

    return {
      instrument: this.instrument,
      bids: aggregatedBids,
      asks: aggregatedAsks,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Aggregate orders by price level
   */
  aggregateByPrice(orders) {
    const priceMap = {};
    
    orders.forEach(order => {
      const price = order.price.toString();
      if (!priceMap[price]) {
        priceMap[price] = {
          price: order.price,
          quantity: 0,
          orders: 0,
        };
      }
      priceMap[price].quantity += order.quantity;
      priceMap[price].orders += order.orders;
    });

    return Object.values(priceMap).map(level => ({
      ...level,
      cumulative: 0, // Will be calculated when returning
    }));
  }

  /**
   * Restore orderbook from database
   */
  async restore() {
    const openOrders = await Order.findAll({
      where: {
        instrument: this.instrument,
        status: ['open', 'partially_filled'],
      },
      order: [['created_at', 'ASC']],
    });

    this.bids = [];
    this.asks = [];

    openOrders.forEach(order => {
      if (order.side === 'buy') {
        this.bids.push(order);
      } else {
        this.asks.push(order);
      }
    });

    // Sort books
    this.bids.sort((a, b) => {
      const priceDiff = parseFloat(b.price) - parseFloat(a.price);
      return priceDiff !== 0 ? priceDiff : new Date(a.created_at) - new Date(b.created_at);
    });

    this.asks.sort((a, b) => {
      const priceDiff = parseFloat(a.price) - parseFloat(b.price);
      return priceDiff !== 0 ? priceDiff : new Date(a.created_at) - new Date(b.created_at);
    });

    console.log(`✅ Restored ${this.bids.length} bids and ${this.asks.length} asks for ${this.instrument}`);
  }

  /**
   * Get orderbook depth metrics
   */
  getDepth() {
    const bidDepth = this.bids.reduce((sum, order) => {
      return sum + (parseFloat(order.quantity) - parseFloat(order.filled_quantity));
    }, 0);

    const askDepth = this.asks.reduce((sum, order) => {
      return sum + (parseFloat(order.quantity) - parseFloat(order.filled_quantity));
    }, 0);

    return { bidDepth, askDepth, totalDepth: bidDepth + askDepth };
  }
}

// Singleton instance for BTC-USD
const matchingEngine = new MatchingEngine('BTC-USD');

export { MatchingEngine, matchingEngine };
