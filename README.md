# 🚀 Trading Exchange Backend

A scalable, high-performance trading exchange backend with real-time order matching, WebSocket streaming, and comprehensive observability.

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

---

## 📖 About The Project

A production-grade trading exchange backend that handles order ingestion, matching, and real-time market data distribution. Built with Node.js, PostgreSQL, and Redis, this system demonstrates:

- **Order Matching Engine** with price-time priority
- **WebSocket Streaming** for real-time market data
- **Idempotent APIs** with Redis caching
- **Prometheus Metrics** for observability
- **High Performance** capable of 2,000+ orders/second
- **Persistence & Recovery** with PostgreSQL

---

## 🎯 Features

### Core Features
- ✅ **Order Types**: Limit and Market orders
- ✅ **Order Matching**: Price-time priority matching engine
- ✅ **WebSocket Streaming**: Real-time orderbook, trades, and order updates
- ✅ **Idempotency**: Duplicate order prevention with idempotency keys
- ✅ **Persistence**: Full order and trade history in PostgreSQL
- ✅ **Recovery**: Orderbook restoration on restart

### API Endpoints
- `POST /orders` - Submit new orders
- `POST /orders/:id/cancel` - Cancel orders
- `GET /orders/:id` - Get order status
- `GET /orderbook` - Current orderbook snapshot
- `GET /trades` - Recent trade history
- `GET /trades/stats` - Trade statistics (VWAP, volume)
- `GET /healthz` - Health check
- `GET /metrics` - Prometheus metrics

### Observability
- Prometheus-compatible metrics endpoint
- Comprehensive logging
- Performance monitoring (latency, throughput)
- WebSocket connection tracking

---

## 🧰 Built With

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **WebSocket**: ws library
- **Metrics**: prom-client (Prometheus)
- **ORM**: Sequelize
- **Testing**: Jest + Supertest
- **Containerization**: Docker & Docker Compose

---

## 🛠️ Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

### Quick Start with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/gittyShiv/Product-Uploader-Backend.git
cd Product-Uploader-Backend

# Start all services
docker compose up --build
```

The system will start:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Trading Exchange** on port 8000

Access the application:
- HTTP API: http://localhost:8000
- WebSocket: ws://localhost:8000/stream
- Health Check: http://localhost:8000/healthz
- Metrics: http://localhost:8000/metrics

---

## 📡 API Documentation

### Submit Order

**POST** `/orders`

```json
{
  "idempotency_key": "abc-123",
  "client_id": "client-A",
  "instrument": "BTC-USD",
  "side": "buy",
  "type": "limit",
  "price": 70150.5,
  "quantity": 0.25
}
```

**Response:**
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "client-A",
  "instrument": "BTC-USD",
  "side": "buy",
  "type": "limit",
  "price": 70150.5,
  "quantity": 0.25,
  "filled_quantity": 0.25,
  "status": "filled",
  "trades": [
    {
      "trade_id": "...",
      "price": 70150.5,
      "quantity": 0.25,
      "timestamp": "2025-11-02T10:00:00.000Z"
    }
  ]
}
```

### Cancel Order

**POST** `/orders/:order_id/cancel`

```bash
curl -X POST http://localhost:8000/orders/{order_id}/cancel
```

### Get Orderbook

**GET** `/orderbook?instrument=BTC-USD&levels=20`

```bash
curl http://localhost:8000/orderbook?levels=10
```

**Response:**
```json
{
  "instrument": "BTC-USD",
  "bids": [
    {"price": 70000, "quantity": 1.5, "orders": 3, "cumulative": 1.5}
  ],
  "asks": [
    {"price": 70100, "quantity": 2.0, "orders": 2, "cumulative": 2.0}
  ],
  "timestamp": "2025-11-02T10:00:00.000Z"
}
```

### Get Recent Trades

**GET** `/trades?limit=50`

```bash
curl http://localhost:8000/trades?limit=10
```

### WebSocket Streaming

**WS** `/stream`

```javascript
const ws = new WebSocket('ws://localhost:8000/stream');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log(message.type); // 'orderbook_delta', 'trade', or 'order_update'
});

// Subscribe to specific channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['orderbook_deltas', 'trades', 'orders']
}));
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Unit Tests

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:integration
```

### Load Testing

```bash
# Generate test fixtures
npm run fixtures

# Run load test (2000 orders/sec for 60 seconds)
npm run load-test
```

**Load Test Configuration:**
```bash
# Customize via environment variables
TARGET_RPS=2000 DURATION=60 npm run load-test
```

---

## 📊 Performance

### Target Metrics
- **Throughput**: 2,000+ orders/second
- **Latency**: Sub-100ms median latency (P50)
- **Availability**: 99.9% uptime

### Measured Performance
Run `npm run load-test` to verify performance on your system.

---

## 🏗️ Architecture

### System Design

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/WS
       ▼
┌─────────────────────────────────────┐
│       Express API Server            │
│  ┌──────────┐    ┌──────────────┐  │
│  │  Routes  │───▶│ Order Service│  │
│  └──────────┘    └──────┬───────┘  │
│                         │           │
│              ┌──────────▼─────────┐ │
│              │ Matching Engine    │ │
│              │ (Single-threaded)  │ │
│              └──────────┬─────────┘ │
│                         │           │
│  ┌─────────────────────▼────────┐  │
│  │   WebSocket Broadcaster      │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│ PostgreSQL  │      │   Redis     │
│ (Persistence)      │   (Cache)   │
└─────────────┘      └─────────────┘
```

### Concurrency Model

The matching engine uses a **single-threaded queue** to process orders sequentially, ensuring:
- No race conditions
- Correct order matching
- Accurate filled quantities
- Price-time priority enforcement

### Recovery Strategy

On startup:
1. Connect to PostgreSQL and Redis
2. Query all open/partially-filled orders
3. Rebuild in-memory orderbook with price-time sorting
4. Resume accepting new orders

### Tradeoffs

- **Single-threaded matching**: Simpler, correct, limited to one CPU core
- **In-memory orderbook**: Fast access, requires recovery on restart
- **PostgreSQL**: Strong consistency, potential bottleneck at high scale
- **Redis**: Optional caching layer, system works without it

---

## 🔧 Configuration

### Environment Variables

```bash
PORT=8000
NODE_ENV=development
POSTGRES_URI=postgres://postgres:root@postgres:5432/trading
REDIS_URL=redis://redis:6379
```

---

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t trading-exchange .
```

### Run with Docker Compose

```bash
docker compose up -d
```

### View Logs

```bash
docker compose logs -f backend
```

---

## 📈 Scaling Considerations

### Current Design (Single Node)
- Single matching engine instance
- Single instrument (BTC-USD)
- Vertical scaling only

### Future Enhancements
- **Multi-Instrument**: Partition matching engines by instrument
- **Horizontal Scaling**: Multiple API servers with shared matching engine
- **Event Sourcing**: Persist only events, derive state via replay
- **Message Queue**: Kafka/NATS for order ingestion
- **Sharding**: Partition orderbook by price range

---

## 🔐 Security

- Input validation on all endpoints
- Rate limiting (100 req/min per client)
- Idempotency key support
- Prepared statements (SQL injection prevention)
- No authentication (assignment scope - add JWT/OAuth for production)

---

## 📋 License

For educational purposes.

---

## 📬 Contact

**Shivam Maurya**  
📧 shivamvision.email@example.com  
🔗 [GitHub Repo](https://github.com/gittyShiv/Product-Uploader-Backend)

---

## 🙏 Acknowledgments

Built as a demonstration of scalable trading system architecture.