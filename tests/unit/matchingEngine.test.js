import { MatchingEngine } from '../../src/services/matchingEngine.js';
import { Order, Trade } from '../../src/config/database.js';

// Mock the dependencies
jest.mock('../../src/config/database.js', () => ({
  Order: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  Trade: {
    create: jest.fn(),
  },
}));

jest.mock('../../src/services/websocketService.js', () => ({
  broadcastOrderbookUpdate: jest.fn(),
  broadcastTrade: jest.fn(),
  broadcastOrderUpdate: jest.fn(),
}));

jest.mock('../../src/services/metricsService.js', () => ({
  incrementCounter: jest.fn(),
  observeHistogram: jest.fn(),
}));

describe('MatchingEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new MatchingEngine('BTC-USD');
    jest.clearAllMocks();
    
    // Mock Trade.create to return a trade object
    Trade.create.mockImplementation((data) => Promise.resolve({
      ...data,
      save: jest.fn(),
    }));
  });

  describe('Limit Orders', () => {
    test('should add a buy limit order to the book', async () => {
      const order = {
        order_id: 'order-1',
        client_id: 'client-1',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: '70000',
        quantity: '1.0',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      };

      const result = await engine.processLimitOrder(order);

      expect(result.status).toBe('open');
      expect(result.filled_quantity).toBe('0.00000000');
      expect(engine.bids).toHaveLength(1);
      expect(engine.bids[0].order_id).toBe('order-1');
    });

    test('should add a sell limit order to the book', async () => {
      const order = {
        order_id: 'order-2',
        client_id: 'client-1',
        instrument: 'BTC-USD',
        side: 'sell',
        type: 'limit',
        price: '71000',
        quantity: '0.5',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      };

      const result = await engine.processLimitOrder(order);

      expect(result.status).toBe('open');
      expect(engine.asks).toHaveLength(1);
      expect(engine.asks[0].order_id).toBe('order-2');
    });

    test('should match crossing limit orders', async () => {
      // Add a sell order first
      const sellOrder = {
        order_id: 'sell-1',
        client_id: 'client-1',
        instrument: 'BTC-USD',
        side: 'sell',
        type: 'limit',
        price: '70000',
        quantity: '1.0',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      };

      await engine.processLimitOrder(sellOrder);

      // Add a buy order at the same price
      const buyOrder = {
        order_id: 'buy-1',
        client_id: 'client-2',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: '70000',
        quantity: '0.5',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      };

      const result = await engine.processLimitOrder(buyOrder);

      expect(result.status).toBe('filled');
      expect(result.filled_quantity).toBe('0.50000000');
      expect(result.trades).toHaveLength(1);
      expect(Trade.create).toHaveBeenCalledTimes(1);
    });

    test('should maintain price-time priority', async () => {
      // Add multiple buy orders at different prices
      const orders = [
        { order_id: 'buy-1', price: '69000', quantity: '1.0' },
        { order_id: 'buy-2', price: '70000', quantity: '0.5' },
        { order_id: 'buy-3', price: '69500', quantity: '0.3' },
      ];

      for (const orderData of orders) {
        await engine.processLimitOrder({
          ...orderData,
          client_id: 'client-1',
          instrument: 'BTC-USD',
          side: 'buy',
          type: 'limit',
          filled_quantity: '0',
          status: 'open',
          created_at: new Date(),
          save: jest.fn(),
        });
      }

      // Best bid should be at price 70000
      expect(engine.bids[0].order_id).toBe('buy-2');
      expect(parseFloat(engine.bids[0].price)).toBe(70000);
      
      // Second best at 69500
      expect(engine.bids[1].order_id).toBe('buy-3');
      expect(parseFloat(engine.bids[1].price)).toBe(69500);
    });
  });

  describe('Market Orders', () => {
    test('should match market buy against best ask', async () => {
      // Add a sell limit order
      const sellOrder = {
        order_id: 'sell-1',
        client_id: 'client-1',
        instrument: 'BTC-USD',
        side: 'sell',
        type: 'limit',
        price: '70000',
        quantity: '1.0',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      };

      await engine.processLimitOrder(sellOrder);

      // Submit market buy
      const marketBuy = {
        order_id: 'buy-market',
        client_id: 'client-2',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'market',
        quantity: '0.5',
        filled_quantity: '0',
        status: 'open',
        save: jest.fn(),
      };

      const result = await engine.processMarketOrder(marketBuy);

      expect(result.status).toBe('filled');
      expect(result.filled_quantity).toBe('0.50000000');
      expect(result.trades).toHaveLength(1);
    });

    test('should partially fill market order if book is insufficient', async () => {
      // Add a small sell order
      const sellOrder = {
        order_id: 'sell-1',
        client_id: 'client-1',
        instrument: 'BTC-USD',
        side: 'sell',
        type: 'limit',
        price: '70000',
        quantity: '0.3',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      };

      await engine.processLimitOrder(sellOrder);

      // Submit market buy for more than available
      const marketBuy = {
        order_id: 'buy-market',
        client_id: 'client-2',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'market',
        quantity: '1.0',
        filled_quantity: '0',
        status: 'open',
        save: jest.fn(),
      };

      const result = await engine.processMarketOrder(marketBuy);

      expect(result.status).toBe('partially_filled');
      expect(result.filled_quantity).toBe('0.30000000');
      expect(result.remaining_quantity).toBe('0.70000000');
    });

    test('should reject market order if book is empty', async () => {
      const marketBuy = {
        order_id: 'buy-market',
        client_id: 'client-2',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'market',
        quantity: '1.0',
        filled_quantity: '0',
        status: 'open',
        save: jest.fn(),
      };

      const result = await engine.processMarketOrder(marketBuy);

      expect(result.status).toBe('rejected');
      expect(result.filled_quantity).toBe('0.00000000');
      expect(result.trades).toHaveLength(0);
    });
  });

  describe('Order Cancellation', () => {
    test('should cancel an open order from the book', async () => {
      const order = {
        order_id: 'order-1',
        client_id: 'client-1',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: '70000',
        quantity: '1.0',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      };

      await engine.processLimitOrder(order);
      expect(engine.bids).toHaveLength(1);

      const cancelled = await engine.cancelOrder('order-1');

      expect(cancelled).not.toBeNull();
      expect(cancelled.status).toBe('cancelled');
      expect(engine.bids).toHaveLength(0);
    });

    test('should return null when cancelling non-existent order', async () => {
      const cancelled = await engine.cancelOrder('non-existent');
      expect(cancelled).toBeNull();
    });
  });

  describe('Orderbook', () => {
    test('should return current orderbook state', async () => {
      // Add some orders
      await engine.processLimitOrder({
        order_id: 'buy-1',
        client_id: 'client-1',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: '69000',
        quantity: '1.0',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      });

      await engine.processLimitOrder({
        order_id: 'sell-1',
        client_id: 'client-2',
        instrument: 'BTC-USD',
        side: 'sell',
        type: 'limit',
        price: '71000',
        quantity: '0.5',
        filled_quantity: '0',
        status: 'open',
        created_at: new Date(),
        save: jest.fn(),
      });

      const orderbook = engine.getOrderbook(10);

      expect(orderbook.instrument).toBe('BTC-USD');
      expect(orderbook.bids.length).toBeGreaterThan(0);
      expect(orderbook.asks.length).toBeGreaterThan(0);
      expect(orderbook.bids[0].price).toBe(69000);
      expect(orderbook.asks[0].price).toBe(71000);
    });
  });
});
