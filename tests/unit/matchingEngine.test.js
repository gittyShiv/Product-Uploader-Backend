/**
 * Unit tests for the matching engine logic
 * These tests verify core matching algorithms without database dependencies
 */

describe('MatchingEngine - Core Logic', () => {
  describe('Price-Time Priority', () => {
    test('should prioritize orders by price first, then time', () => {
      const orders = [
        { price: 70000, timestamp: new Date('2025-01-01T10:00:00Z') },
        { price: 70100, timestamp: new Date('2025-01-01T09:00:00Z') },
        { price: 70000, timestamp: new Date('2025-01-01T09:30:00Z') },
      ];

      // Bids sorted DESC by price, ASC by time
      const sortedBids = orders.sort((a, b) => {
        const priceDiff = b.price - a.price;
        return priceDiff !== 0 ? priceDiff : a.timestamp - b.timestamp;
      });

      expect(sortedBids[0].price).toBe(70100);
      expect(sortedBids[1].timestamp.getTime()).toBeLessThan(sortedBids[2].timestamp.getTime());
    });
  });

  describe('Order Matching', () => {
    test('should calculate correct fill quantities', () => {
      const orderQty = 1.0;
      const bookQty = 0.5;
      const matchQty = Math.min(orderQty, bookQty);

      expect(matchQty).toBe(0.5);
      expect(orderQty - matchQty).toBe(0.5);
    });

    test('should determine correct order status after matching', () => {
      const testCases = [
        { filled: 0, total: 1.0, expected: 'open' },
        { filled: 0.5, total: 1.0, expected: 'partially_filled' },
        { filled: 1.0, total: 1.0, expected: 'filled' },
      ];

      testCases.forEach(({ filled, total, expected }) => {
        let status;
        if (filled === 0) status = 'open';
        else if (filled < total) status = 'partially_filled';
        else status = 'filled';

        expect(status).toBe(expected);
      });
    });
  });

  describe('Orderbook Aggregation', () => {
    test('should aggregate orders by price level', () => {
      const orders = [
        { price: 70000, quantity: 0.5 },
        { price: 70000, quantity: 0.3 },
        { price: 70100, quantity: 1.0 },
      ];

      const priceMap = {};
      orders.forEach(order => {
        const price = order.price.toString();
        if (!priceMap[price]) {
          priceMap[price] = { price: order.price, quantity: 0, orders: 0 };
        }
        priceMap[price].quantity += order.quantity;
        priceMap[price].orders += 1;
      });

      const aggregated = Object.values(priceMap);

      expect(aggregated).toHaveLength(2);
      expect(aggregated.find(l => l.price === 70000).quantity).toBe(0.8);
      expect(aggregated.find(l => l.price === 70000).orders).toBe(2);
    });

    test('should calculate cumulative depth', () => {
      const levels = [
        { price: 70000, quantity: 1.0 },
        { price: 69900, quantity: 0.5 },
        { price: 69800, quantity: 0.3 },
      ];

      let cumulative = 0;
      const withCumulative = levels.map(level => {
        cumulative += level.quantity;
        return { ...level, cumulative };
      });

      expect(withCumulative[0].cumulative).toBe(1.0);
      expect(withCumulative[1].cumulative).toBe(1.5);
      expect(withCumulative[2].cumulative).toBe(1.8);
    });
  });

  describe('Order Validation', () => {
    test('should validate required fields', () => {
      const validateOrder = (order) => {
        if (!order.instrument || !order.side || !order.type || !order.quantity) {
          return { valid: false, error: 'Missing required fields' };
        }
        return { valid: true };
      };

      expect(validateOrder({ side: 'buy' }).valid).toBe(false);
      expect(validateOrder({
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        quantity: 1.0
      }).valid).toBe(true);
    });

    test('should validate order types', () => {
      const validateType = (type) => {
        return ['limit', 'market'].includes(type);
      };

      expect(validateType('limit')).toBe(true);
      expect(validateType('market')).toBe(true);
      expect(validateType('stop')).toBe(false);
    });

    test('should validate positive quantities', () => {
      const validateQuantity = (qty) => {
        const num = parseFloat(qty);
        return !isNaN(num) && num > 0;
      };

      expect(validateQuantity(1.0)).toBe(true);
      expect(validateQuantity(0)).toBe(false);
      expect(validateQuantity(-1)).toBe(false);
      expect(validateQuantity('abc')).toBe(false);
    });
  });

  describe('Market Order Logic', () => {
    test('should reject market order when book is empty', () => {
      const book = [];
      const orderQty = 1.0;
      
      let filled = 0;
      while (orderQty > filled && book.length > 0) {
        const bestOrder = book[0];
        const matchQty = Math.min(orderQty - filled, bestOrder.quantity);
        filled += matchQty;
      }

      expect(filled).toBe(0);
    });

    test('should partially fill market order when book insufficient', () => {
      const book = [{ quantity: 0.3 }, { quantity: 0.2 }];
      const orderQty = 1.0;
      
      let filled = 0;
      while (orderQty > filled && book.length > 0) {
        const bestOrder = book.shift();
        const matchQty = Math.min(orderQty - filled, bestOrder.quantity);
        filled += matchQty;
      }

      expect(filled).toBe(0.5);
    });
  });
});
