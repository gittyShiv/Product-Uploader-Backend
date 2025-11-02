import request from 'supertest';
import { app } from '../../src/server.js';

describe('Trading Exchange API', () => {
  describe('POST /orders', () => {
    test('should create a limit order', async () => {
      const order = {
        client_id: 'test-client',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: 70000,
        quantity: 0.5,
      };

      const response = await request(app)
        .post('/orders')
        .send(order)
        .expect(201);

      expect(response.body).toHaveProperty('order_id');
      expect(response.body.client_id).toBe('test-client');
      expect(response.body.status).toMatch(/open|filled|partially_filled/);
    });

    test('should create a market order', async () => {
      const order = {
        client_id: 'test-client',
        instrument: 'BTC-USD',
        side: 'sell',
        type: 'market',
        quantity: 0.1,
      };

      const response = await request(app)
        .post('/orders')
        .send(order)
        .expect(201);

      expect(response.body).toHaveProperty('order_id');
      expect(response.body.type).toBe('market');
    });

    test('should reject order with missing fields', async () => {
      const order = {
        client_id: 'test-client',
        side: 'buy',
      };

      const response = await request(app)
        .post('/orders')
        .send(order)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle idempotency', async () => {
      const order = {
        idempotency_key: 'unique-key-123',
        client_id: 'test-client',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: 70000,
        quantity: 0.5,
      };

      const response1 = await request(app)
        .post('/orders')
        .send(order)
        .expect(201);

      const response2 = await request(app)
        .post('/orders')
        .send(order)
        .expect(201);

      expect(response1.body.order_id).toBe(response2.body.order_id);
    });
  });

  describe('GET /orderbook', () => {
    test('should return orderbook', async () => {
      const response = await request(app)
        .get('/orderbook')
        .expect(200);

      expect(response.body).toHaveProperty('instrument');
      expect(response.body).toHaveProperty('bids');
      expect(response.body).toHaveProperty('asks');
      expect(Array.isArray(response.body.bids)).toBe(true);
      expect(Array.isArray(response.body.asks)).toBe(true);
    });

    test('should accept levels parameter', async () => {
      const response = await request(app)
        .get('/orderbook?levels=5')
        .expect(200);

      expect(response.body.bids.length).toBeLessThanOrEqual(5);
      expect(response.body.asks.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /trades', () => {
    test('should return recent trades', async () => {
      const response = await request(app)
        .get('/trades')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/trades?limit=10')
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /healthz', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /metrics', () => {
    test('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('orders_received_total');
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });

  describe('POST /orders/:order_id/cancel', () => {
    test('should cancel an order', async () => {
      // First create an order
      const order = {
        client_id: 'test-client',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: 60000, // Low price so it won't match
        quantity: 0.1,
      };

      const createResponse = await request(app)
        .post('/orders')
        .send(order)
        .expect(201);

      const orderId = createResponse.body.order_id;

      // Cancel the order
      const cancelResponse = await request(app)
        .post(`/orders/${orderId}/cancel`)
        .expect(200);

      expect(cancelResponse.body.status).toBe('cancelled');
    });

    test('should return 404 for non-existent order', async () => {
      await request(app)
        .post('/orders/non-existent-id/cancel')
        .expect(404);
    });
  });

  describe('GET /orders/:order_id', () => {
    test('should return order details', async () => {
      // Create an order first
      const order = {
        client_id: 'test-client',
        instrument: 'BTC-USD',
        side: 'buy',
        type: 'limit',
        price: 70000,
        quantity: 0.5,
      };

      const createResponse = await request(app)
        .post('/orders')
        .send(order)
        .expect(201);

      const orderId = createResponse.body.order_id;

      // Get order details
      const getResponse = await request(app)
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(getResponse.body.order_id).toBe(orderId);
      expect(getResponse.body.client_id).toBe('test-client');
    });

    test('should return 404 for non-existent order', async () => {
      await request(app)
        .get('/orders/non-existent-id')
        .expect(404);
    });
  });
});
