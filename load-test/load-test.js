import http from 'http';
import { v4 as uuidv4 } from 'uuid';

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 8000;
const DURATION_SECONDS = parseInt(process.env.DURATION || '60');
const TARGET_RPS = parseInt(process.env.TARGET_RPS || '2000');

let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
const latencies = [];

/**
 * Make an HTTP POST request
 */
const makeRequest = (orderData) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const data = JSON.stringify(orderData);

    const options = {
      hostname: HOST,
      port: PORT,
      path: '/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const latency = Date.now() - startTime;
        latencies.push(latency);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          successfulRequests++;
          resolve({ statusCode: res.statusCode, latency, data: responseData });
        } else {
          failedRequests++;
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      failedRequests++;
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

/**
 * Generate a random order
 */
const generateRandomOrder = () => {
  const isBuy = Math.random() > 0.5;
  const isLimit = Math.random() > 0.3; // 70% limit, 30% market
  const basePrice = 70000;

  const order = {
    order_id: uuidv4(),
    client_id: `load-test-${Math.floor(Math.random() * 100)}`,
    instrument: 'BTC-USD',
    side: isBuy ? 'buy' : 'sell',
    type: isLimit ? 'limit' : 'market',
    quantity: (Math.random() * 0.5 + 0.01).toFixed(8),
  };

  if (isLimit) {
    const priceOffset = (Math.random() - 0.5) * 2000;
    order.price = (basePrice + priceOffset).toFixed(2);
  }

  return order;
};

/**
 * Calculate statistics
 */
const calculateStats = () => {
  if (latencies.length === 0) {
    return {};
  }

  latencies.sort((a, b) => a - b);

  const percentile = (p) => {
    const index = Math.ceil((p / 100) * latencies.length) - 1;
    return latencies[index];
  };

  return {
    count: latencies.length,
    min: latencies[0],
    max: latencies[latencies.length - 1],
    mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50: percentile(50),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
  };
};

/**
 * Run load test
 */
const runLoadTest = async () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║        Trading Exchange Load Test                    ║
╠══════════════════════════════════════════════════════╣
║  Target:       ${TARGET_RPS} requests/second                   ║
║  Duration:     ${DURATION_SECONDS} seconds                             ║
║  Endpoint:     http://${HOST}:${PORT}/orders          ║
╚══════════════════════════════════════════════════════╝
  `);

  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;
  const intervalMs = 1000 / TARGET_RPS;

  // Progress reporting
  const progressInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const currentRPS = Math.floor(totalRequests / elapsed);
    const stats = calculateStats();

    console.log(`[${elapsed}s] Requests: ${totalRequests} | Success: ${successfulRequests} | Failed: ${failedRequests} | RPS: ${currentRPS} | P50: ${stats.p50?.toFixed(0)}ms | P95: ${stats.p95?.toFixed(0)}ms`);
  }, 5000);

  // Send requests
  while (Date.now() < endTime) {
    const order = generateRandomOrder();
    totalRequests++;

    makeRequest(order).catch((err) => {
      // Errors are already counted in failedRequests
    });

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Wait for remaining requests
  await new Promise(resolve => setTimeout(resolve, 2000));

  clearInterval(progressInterval);

  // Final statistics
  const stats = calculateStats();
  const duration = (Date.now() - startTime) / 1000;
  const actualRPS = totalRequests / duration;

  console.log(`
╔══════════════════════════════════════════════════════╗
║            Load Test Results                          ║
╠══════════════════════════════════════════════════════╣
║  Duration:              ${duration.toFixed(2)}s                       ║
║  Total Requests:        ${totalRequests}                         ║
║  Successful:            ${successfulRequests}                         ║
║  Failed:                ${failedRequests}                            ║
║  Success Rate:          ${((successfulRequests/totalRequests)*100).toFixed(2)}%                    ║
║  Actual RPS:            ${actualRPS.toFixed(2)}                       ║
╠══════════════════════════════════════════════════════╣
║  Latency Statistics (ms)                              ║
╠══════════════════════════════════════════════════════╣
║  Min:                   ${stats.min?.toFixed(2)}                         ║
║  Max:                   ${stats.max?.toFixed(2)}                        ║
║  Mean:                  ${stats.mean?.toFixed(2)}                        ║
║  P50 (Median):          ${stats.p50?.toFixed(2)}                        ║
║  P90:                   ${stats.p90?.toFixed(2)}                        ║
║  P95:                   ${stats.p95?.toFixed(2)}                        ║
║  P99:                   ${stats.p99?.toFixed(2)}                        ║
╚══════════════════════════════════════════════════════╝
  `);

  if (stats.p50 && stats.p50 < 100 && actualRPS >= TARGET_RPS * 0.9) {
    console.log('✅ Load test PASSED: System meets performance targets');
  } else {
    console.log('⚠️  Load test completed but performance targets not fully met');
  }

  process.exit(0);
};

runLoadTest().catch((error) => {
  console.error('Load test failed:', error);
  process.exit(1);
});
