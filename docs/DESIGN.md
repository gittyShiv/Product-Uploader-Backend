# Trading Exchange System Design

## Executive Summary

This document describes the architecture, design decisions, and implementation details of a scalable trading exchange backend system capable of processing 2,000+ orders per second with sub-100ms latency.

---

## 1. Architecture Overview

### 1.1 High-Level Components

```
┌──────────────────────────────────────────────────────────────┐
│                     Client Layer                              │
│  (HTTP Clients, WebSocket Clients, Load Balancers)          │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  API Gateway Layer                            │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │Rate Limiter│  │  Validation  │  │  Idempotency     │    │
│  └────────────┘  └──────────────┘  │  Middleware      │    │
│                                     └──────────────────┘    │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  Business Logic Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Order Service                              │   │
│  │  - Order Validation                                  │   │
│  │  - Order Creation & Persistence                      │   │
│  │  - Idempotency Checks                                │   │
│  └────────────┬──────────────┬──────────────────────────┘   │
│               │              │                               │
│  ┌────────────▼──────────────▼───────────────────────────┐  │
│  │         Matching Engine (Core)                        │  │
│  │  - Price-Time Priority Queue                          │  │
│  │  - Order Matching Algorithm                           │  │
│  │  - Trade Execution                                    │  │
│  │  - Orderbook Management                               │  │
│  └────────────┬──────────────┬────────────────────────────┘ │
│               │              │                               │
│  ┌────────────▼──────────┐  ┌▼───────────────────────────┐  │
│  │ WebSocket Broadcaster │  │ Metrics Service            │  │
│  │ - Orderbook Deltas    │  │ - Prometheus Counters      │  │
│  │ - Trade Events        │  │ - Histograms               │  │
│  │ - Order Updates       │  │ - Gauges                   │  │
│  └────────────┬──────────┘  └────────────────────────────┘  │
└───────────────┼──────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────┐
│                   Data Layer                                  │
│  ┌─────────────────┐         ┌──────────────────────┐       │
│  │   PostgreSQL    │         │      Redis           │       │
│  │  - Orders       │         │  - Idempotency Cache │       │
│  │  - Trades       │         │  - Session Data      │       │
│  │  - Snapshots    │         └──────────────────────┘       │
│  └─────────────────┘                                         │
└───────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| Runtime | Node.js 18+ | Non-blocking I/O, excellent for high-concurrency |
| Framework | Express.js | Lightweight, proven, extensive ecosystem |
| Database | PostgreSQL 15 | ACID compliance, JSONB support, reliability |
| Cache | Redis 7 | Fast KV store, pub/sub capabilities |
| WebSocket | ws | Lightweight, performant, mature |
| ORM | Sequelize | Type-safe queries, migrations support |
| Metrics | prom-client | Prometheus standard, rich metrics |
| Testing | Jest + Supertest | Comprehensive, well-documented |

---

## 2. Core Components

### 2.1 Matching Engine

**Design Philosophy:** Single-threaded sequential processing to ensure correctness.

**Key Features:**
- Price-time priority algorithm
- In-memory orderbook (bids/asks arrays)
- Sequential order processing via queue
- Zero-copy trade execution

**Concurrency Model:**
```javascript
class MatchingEngine {
  constructor() {
    this.bids = [];      // Sorted: price DESC, time ASC
    this.asks = [];      // Sorted: price ASC, time ASC
    this.isProcessing = false;
    this.orderQueue = [];
  }

  async addOrder(order) {
    // Enqueue order with promise
    return new Promise((resolve, reject) => {
      this.orderQueue.push({ order, resolve, reject });
      this.processQueue();  // Trigger processing
    });
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    while (this.orderQueue.length > 0) {
      const { order, resolve, reject } = this.orderQueue.shift();
      try {
        const result = await this.match(order);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    }
    
    this.isProcessing = false;
  }
}
```

**Matching Algorithm:**
1. Market orders: Sweep best available prices until filled or book exhausted
2. Limit orders: Match crossing orders, then add remainder to book
3. Partial fills: Update `filled_quantity` and status
4. Book updates: Remove filled orders, update partially filled

**Tradeoffs:**
- ✅ Simple, correct, no race conditions
- ✅ Easy to reason about and test
- ❌ Limited to single CPU core
- ❌ Not horizontally scalable without partitioning

### 2.2 Order Service

**Responsibilities:**
- Input validation (type, price, quantity)
- Idempotency checking (Redis → PostgreSQL)
- Order persistence
- Integration with matching engine

**Idempotency Implementation:**
```javascript
// 1. Check Redis cache (fast path)
const cached = await redis.get(`idempotency:${key}`);
if (cached) return JSON.parse(cached);

// 2. Check database (slow path)
const existing = await Order.findOne({ where: { idempotency_key: key } });
if (existing) {
  await redis.setEx(`idempotency:${key}`, 3600, JSON.stringify(existing));
  return existing;
}

// 3. Process new order
```

### 2.3 Persistence Layer

**Database Schema:**

```sql
-- Orders table
CREATE TABLE orders (
  order_id UUID PRIMARY KEY,
  client_id VARCHAR NOT NULL,
  instrument VARCHAR NOT NULL,
  side VARCHAR(4) NOT NULL,  -- 'buy' or 'sell'
  type VARCHAR(6) NOT NULL,  -- 'limit' or 'market'
  price DECIMAL(20, 8),
  quantity DECIMAL(20, 8) NOT NULL,
  filled_quantity DECIMAL(20, 8) DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  idempotency_key VARCHAR UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_instrument_status ON orders(instrument, status);
CREATE INDEX idx_orders_idempotency ON orders(idempotency_key);

-- Trades table
CREATE TABLE trades (
  trade_id UUID PRIMARY KEY,
  buy_order_id UUID NOT NULL,
  sell_order_id UUID NOT NULL,
  instrument VARCHAR NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  buy_client_id VARCHAR NOT NULL,
  sell_client_id VARCHAR NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trades_timestamp ON trades(timestamp DESC);
CREATE INDEX idx_trades_instrument ON trades(instrument, timestamp);

-- Orderbook snapshots
CREATE TABLE orderbook_snapshots (
  id SERIAL PRIMARY KEY,
  instrument VARCHAR NOT NULL,
  bids JSONB NOT NULL,
  asks JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

**Recovery Strategy:**
On system startup:
1. Query all open/partially_filled orders
2. Sort by created_at ASC
3. Rebuild bids/asks arrays with proper sorting
4. Resume normal operation

**Alternative Considered:** Event Sourcing
- Persist only events (OrderPlaced, OrderMatched, OrderCancelled)
- Derive orderbook state via replay
- Pros: Complete audit trail, time-travel debugging
- Cons: Higher complexity, slower recovery
- **Decision:** Defer to future iteration

### 2.4 WebSocket Service

**Architecture:**
- Single WebSocket server attached to HTTP server
- Client subscription model (orderbook_deltas, trades, orders)
- Fan-out broadcasting to all subscribed clients

**Message Format:**
```javascript
{
  type: 'trade',
  data: {
    trade_id: '...',
    price: 70150.5,
    quantity: 0.25,
    timestamp: '2025-11-02T10:00:00.000Z'
  },
  timestamp: '2025-11-02T10:00:00.001Z'
}
```

**Scalability Consideration:**
- Current: All clients connected to single process
- Future: Redis Pub/Sub for multi-instance broadcasting

---

## 3. Non-Functional Requirements

### 3.1 Performance

**Targets:**
- Throughput: 2,000 orders/second
- Latency: P50 < 50ms, P95 < 100ms, P99 < 200ms
- Orderbook depth: 10,000+ orders per side

**Optimizations:**
- In-memory orderbook for O(1) best price access
- Array-based storage with binary search for insertions
- Batch database writes (future)
- Redis caching for idempotency

### 3.2 Reliability

**Failure Scenarios & Handling:**

| Failure | Detection | Recovery | Data Loss Risk |
|---------|-----------|----------|----------------|
| App crash | Process monitor | Restart + restore from DB | None (orders persisted) |
| DB disconnect | Connection error | Retry with exponential backoff | Orders rejected during outage |
| Redis failure | Connection error | Continue without cache | Performance degradation only |
| Network partition | Timeout | Graceful degradation | Client retry needed |

**Persistence Guarantees:**
- Orders: Written to DB before matching (durability)
- Trades: Written immediately after match (atomicity)
- Orderbook: Restored from open orders (consistency)

### 3.3 Observability

**Metrics Exposed:**
- `orders_received_total` - Counter by instrument/type/side
- `orders_matched_total` - Counter by instrument
- `orders_rejected_total` - Counter by instrument/reason
- `trades_total` - Counter by instrument
- `order_latency_seconds` - Histogram by instrument/type
- `current_orderbook_depth` - Gauge by instrument/side
- `websocket_connections` - Gauge

**Logging Strategy:**
- INFO: Order received, trade executed, order cancelled
- WARN: Validation failures, rate limit hits
- ERROR: Database errors, unexpected exceptions

### 3.4 Security

**Current Implementation:**
- Input validation on all endpoints
- Rate limiting (100 req/min per client_id)
- Prepared statements (SQL injection prevention)
- CORS enabled for browser access

**Production Enhancements (Future):**
- JWT authentication
- Role-based access control
- API key management
- TLS/SSL termination
- DDoS protection

---

## 4. Scalability Path

### 4.1 Vertical Scaling (Current)
- Increase CPU/RAM of single instance
- Optimize PostgreSQL (indexes, connection pooling)
- Add read replicas for query endpoints

### 4.2 Horizontal Scaling (Future)

**Multi-Instrument:**
```
Instrument Router
    ├─> BTC-USD Matching Engine (Instance 1)
    ├─> ETH-USD Matching Engine (Instance 2)
    └─> SOL-USD Matching Engine (Instance 3)
```

**API Layer:**
- Multiple API servers (stateless)
- Load balancer distributes requests
- Matching engine as separate service

**Message Queue Integration:**
- Kafka/NATS for order ingestion
- Durable queue for reliability
- Multiple consumers for throughput

### 4.3 Sharding Strategy
- Partition by instrument (easiest)
- Partition by price range (advanced)
- Partition by client_id (complex, not recommended)

---

## 5. Testing Strategy

### 5.1 Unit Tests
- Matching engine logic (price-time priority)
- Order validation
- Idempotency checks
- Orderbook operations

### 5.2 Integration Tests
- API endpoints (happy path + error cases)
- WebSocket connections
- Database persistence
- End-to-end order flow

### 5.3 Load Tests
- Concurrent order submission
- Sustained throughput measurement
- Latency percentile tracking
- Resource utilization monitoring

### 5.4 Chaos Testing (Future)
- Database failure injection
- Network latency simulation
- Partial system degradation

---

## 6. Deployment

### 6.1 Container Setup
- Docker multi-stage build
- Docker Compose for local development
- Health checks for readiness probes

### 6.2 Production Checklist
- [ ] Enable connection pooling
- [ ] Configure PostgreSQL for OLTP workload
- [ ] Set up Redis persistence (AOF)
- [ ] Configure log aggregation
- [ ] Set up Prometheus scraping
- [ ] Deploy monitoring dashboards
- [ ] Configure alerts (latency, error rate)
- [ ] Set up backups (DB + snapshots)

---

## 7. Future Enhancements

### 7.1 Immediate (Next Sprint)
- Multi-instrument support
- Stop-loss orders
- Order modification (amend)

### 7.2 Medium Term
- WebSocket feed from Binance integration
- Settlement service (daily reconciliation)
- Market data aggregation (OHLCV)

### 7.3 Long Term
- Event sourcing architecture
- Multi-region deployment
- Advanced order types (iceberg, TWA P)
- Algorithmic trading support

---

## 8. Conclusion

This trading exchange backend demonstrates a production-quality architecture capable of handling significant load while maintaining correctness and observability. The single-threaded matching engine ensures correctness at the cost of horizontal scalability, which is an acceptable tradeoff for the current requirements. Future iterations can adopt more complex distributed matching strategies as needed.

**Key Strengths:**
- Simple, correct matching algorithm
- Strong persistence guarantees
- Comprehensive observability
- Production-ready error handling

**Known Limitations:**
- Single-core matching bottleneck
- No authentication layer
- Limited to one instrument
- No geographical distribution

**Recommendation:** This design is suitable for a medium-scale exchange (thousands of orders/sec) and provides a solid foundation for scaling to higher throughput with the outlined enhancements.
