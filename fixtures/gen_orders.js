import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate realistic limit orders across a price band
 */
const generateLimitOrders = (count = 100000) => {
  const orders = [];
  const basePrice = 70000; // BTC-USD base price
  const priceRange = 5000; // Price band: 67500 - 72500

  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.5;
    const priceOffset = (Math.random() - 0.5) * priceRange;
    const price = basePrice + priceOffset;
    const quantity = (Math.random() * 2 + 0.01).toFixed(8); // 0.01 to 2.01 BTC

    orders.push({
      order_id: uuidv4(),
      client_id: `client-${Math.floor(Math.random() * 1000)}`,
      instrument: 'BTC-USD',
      side: isBuy ? 'buy' : 'sell',
      type: 'limit',
      price: price.toFixed(2),
      quantity,
    });
  }

  return orders;
};

/**
 * Generate market orders for testing matching
 */
const generateMarketOrders = (count = 1000) => {
  const orders = [];

  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.5;
    const quantity = (Math.random() * 1 + 0.05).toFixed(8); // 0.05 to 1.05 BTC

    orders.push({
      order_id: uuidv4(),
      client_id: `client-${Math.floor(Math.random() * 100)}`,
      instrument: 'BTC-USD',
      side: isBuy ? 'buy' : 'sell',
      type: 'market',
      quantity,
    });
  }

  return orders;
};

/**
 * Save orders to JSON file
 */
const saveOrders = (orders, filename) => {
  fs.writeFileSync(filename, JSON.stringify(orders, null, 2));
  console.log(`✅ Generated ${orders.length} orders and saved to ${filename}`);
};

// Generate fixtures
console.log('Generating order fixtures...');

const limitOrders = generateLimitOrders(100000);
saveOrders(limitOrders, 'fixtures/limit_orders.json');

const marketOrders = generateMarketOrders(1000);
saveOrders(marketOrders, 'fixtures/market_orders.json');

// Generate a smaller set for quick testing
const testOrders = generateLimitOrders(1000);
saveOrders(testOrders, 'fixtures/test_orders.json');

console.log('✅ All fixtures generated successfully!');
