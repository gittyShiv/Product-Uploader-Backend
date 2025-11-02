import { v4 as uuidv4 } from 'uuid';
import { Order } from '../config/database.js';
import { matchingEngine } from './matchingEngine.js';
import { redisClient } from '../config/redis.js';

/**
 * Validate order parameters
 */
export const validateOrder = (orderData) => {
  const { instrument, side, type, price, quantity } = orderData;

  // Required fields
  if (!instrument || !side || !type || !quantity) {
    return { valid: false, error: 'Missing required fields' };
  }

  // Valid sides
  if (!['buy', 'sell'].includes(side)) {
    return { valid: false, error: 'Invalid side. Must be "buy" or "sell"' };
  }

  // Valid types
  if (!['limit', 'market'].includes(type)) {
    return { valid: false, error: 'Invalid type. Must be "limit" or "market"' };
  }

  // Quantity validation
  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: 'Quantity must be a positive number' };
  }

  // Price validation for limit orders
  if (type === 'limit') {
    if (!price) {
      return { valid: false, error: 'Price is required for limit orders' };
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return { valid: false, error: 'Price must be a positive number' };
    }
  }

  return { valid: true };
};

/**
 * Create and process a new order
 */
export const createOrder = async (orderData) => {
  const { idempotency_key, order_id, client_id, instrument, side, type, price, quantity } = orderData;

  // Check idempotency
  if (idempotency_key) {
    try {
      // Check Redis first for fast lookup
      if (redisClient.isOpen) {
        const cached = await redisClient.get(`idempotency:${idempotency_key}`);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.error('Redis error in idempotency check:', error);
    }

    // Check database
    const existing = await Order.findOne({ where: { idempotency_key } });
    if (existing) {
      const result = {
        order_id: existing.order_id,
        status: existing.status,
        filled_quantity: parseFloat(existing.filled_quantity),
        message: 'Order already exists (idempotent)',
      };
      
      // Cache in Redis
      try {
        if (redisClient.isOpen) {
          await redisClient.setEx(`idempotency:${idempotency_key}`, 3600, JSON.stringify(result));
        }
      } catch (error) {
        console.error('Redis error caching idempotency:', error);
      }
      
      return result;
    }
  }

  // Validate order
  const validation = validateOrder(orderData);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate order ID if not provided
  const finalOrderId = order_id || uuidv4();

  // Create order in database
  const order = await Order.create({
    order_id: finalOrderId,
    client_id: client_id || 'anonymous',
    instrument: instrument || 'BTC-USD',
    side,
    type,
    price: type === 'limit' ? parseFloat(price).toFixed(8) : null,
    quantity: parseFloat(quantity).toFixed(8),
    filled_quantity: '0',
    status: 'open',
    idempotency_key,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Submit to matching engine
  const result = await matchingEngine.addOrder(order);

  // Update order status in database
  order.status = result.status;
  order.filled_quantity = result.filled_quantity;
  await order.save();

  // Cache result for idempotency
  if (idempotency_key) {
    const cacheData = {
      order_id: order.order_id,
      status: order.status,
      filled_quantity: parseFloat(order.filled_quantity),
      trades: result.trades.map(t => ({
        trade_id: t.trade_id,
        price: parseFloat(t.price),
        quantity: parseFloat(t.quantity),
      })),
    };
    
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(`idempotency:${idempotency_key}`, 3600, JSON.stringify(cacheData));
      }
    } catch (error) {
      console.error('Redis error caching result:', error);
    }
  }

  return {
    order_id: order.order_id,
    client_id: order.client_id,
    instrument: order.instrument,
    side: order.side,
    type: order.type,
    price: order.price ? parseFloat(order.price) : null,
    quantity: parseFloat(order.quantity),
    filled_quantity: parseFloat(order.filled_quantity),
    status: order.status,
    trades: result.trades.map(t => ({
      trade_id: t.trade_id,
      price: parseFloat(t.price),
      quantity: parseFloat(t.quantity),
      timestamp: t.timestamp,
    })),
    created_at: order.created_at,
  };
};

/**
 * Cancel an order
 */
export const cancelOrder = async (orderId) => {
  const order = await Order.findOne({ where: { order_id: orderId } });
  
  if (!order) {
    throw new Error('Order not found');
  }

  if (order.status === 'filled') {
    throw new Error('Cannot cancel a filled order');
  }

  if (order.status === 'cancelled') {
    throw new Error('Order is already cancelled');
  }

  // Try to cancel in matching engine
  const cancelledOrder = await matchingEngine.cancelOrder(orderId);
  
  if (!cancelledOrder) {
    // Order not in book, just update in DB
    order.status = 'cancelled';
    await order.save();
    return order;
  }

  return cancelledOrder;
};

/**
 * Get order by ID
 */
export const getOrder = async (orderId) => {
  const order = await Order.findOne({ where: { order_id: orderId } });
  
  if (!order) {
    return null;
  }

  return {
    order_id: order.order_id,
    client_id: order.client_id,
    instrument: order.instrument,
    side: order.side,
    type: order.type,
    price: order.price ? parseFloat(order.price) : null,
    quantity: parseFloat(order.quantity),
    filled_quantity: parseFloat(order.filled_quantity),
    status: order.status,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
};
