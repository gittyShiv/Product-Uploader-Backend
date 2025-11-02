# Trading Exchange API Examples

## Base URL
```
http://localhost:8000
```

---

## 1. Health Check

### Request
```bash
curl http://localhost:8000/healthz
```

### Response
```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T10:00:00.000Z",
  "uptime": 123.45
}
```

---

## 2. Submit Limit Buy Order

### Request
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-A",
    "instrument": "BTC-USD",
    "side": "buy",
    "type": "limit",
    "price": 70000,
    "quantity": 0.5
  }'
```

### Response
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "client-A",
  "instrument": "BTC-USD",
  "side": "buy",
  "type": "limit",
  "price": 70000,
  "quantity": 0.5,
  "filled_quantity": 0,
  "status": "open",
  "trades": [],
  "created_at": "2025-11-02T10:00:00.000Z"
}
```

---

## 3. Submit Market Sell Order

### Request
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client-B",
    "instrument": "BTC-USD",
    "side": "sell",
    "type": "market",
    "quantity": 0.25
  }'
```

### Response (if matched)
```json
{
  "order_id": "660f9511-f3ac-52e5-b827-557766551111",
  "client_id": "client-B",
  "instrument": "BTC-USD",
  "side": "sell",
  "type": "market",
  "price": null,
  "quantity": 0.25,
  "filled_quantity": 0.25,
  "status": "filled",
  "trades": [
    {
      "trade_id": "770fa622-g4bd-63f6-c938-668877662222",
      "price": 70000,
      "quantity": 0.25,
      "timestamp": "2025-11-02T10:00:01.000Z"
    }
  ],
  "created_at": "2025-11-02T10:00:01.000Z"
}
```

---

## 4. Submit Order with Idempotency Key

### Request
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "unique-key-12345",
    "client_id": "client-C",
    "instrument": "BTC-USD",
    "side": "buy",
    "type": "limit",
    "price": 69500,
    "quantity": 1.0
  }'
```

### First Response
```json
{
  "order_id": "880fb733-h5ce-74g7-d049-779988773333",
  "client_id": "client-C",
  "instrument": "BTC-USD",
  "side": "buy",
  "type": "limit",
  "price": 69500,
  "quantity": 1.0,
  "filled_quantity": 0,
  "status": "open",
  "trades": [],
  "created_at": "2025-11-02T10:00:02.000Z"
}
```

### Duplicate Request (same idempotency_key)
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "idempotency_key": "unique-key-12345",
    "client_id": "client-C",
    "instrument": "BTC-USD",
    "side": "buy",
    "type": "limit",
    "price": 69500,
    "quantity": 1.0
  }'
```

### Duplicate Response (returns same order)
```json
{
  "order_id": "880fb733-h5ce-74g7-d049-779988773333",
  "status": "open",
  "filled_quantity": 0,
  "message": "Order already exists (idempotent)"
}
```

---

## 5. Get Order Status

### Request
```bash
curl http://localhost:8000/orders/550e8400-e29b-41d4-a716-446655440000
```

### Response
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "client-A",
  "instrument": "BTC-USD",
  "side": "buy",
  "type": "limit",
  "price": 70000,
  "quantity": 0.5,
  "filled_quantity": 0.25,
  "status": "partially_filled",
  "created_at": "2025-11-02T10:00:00.000Z",
  "updated_at": "2025-11-02T10:00:05.000Z"
}
```

---

## 6. Cancel Order

### Request
```bash
curl -X POST http://localhost:8000/orders/550e8400-e29b-41d4-a716-446655440000/cancel
```

### Response
```json
{
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled",
  "message": "Order cancelled successfully"
}
```

### Error Response (already filled)
```json
{
  "error": "Cannot cancel a filled order"
}
```

---

## 7. Get Orderbook

### Request
```bash
curl "http://localhost:8000/orderbook?instrument=BTC-USD&levels=10"
```

### Response
```json
{
  "instrument": "BTC-USD",
  "bids": [
    {
      "price": 70000,
      "quantity": 1.5,
      "orders": 3,
      "cumulative": 1.5
    },
    {
      "price": 69900,
      "quantity": 2.0,
      "orders": 2,
      "cumulative": 3.5
    }
  ],
  "asks": [
    {
      "price": 70100,
      "quantity": 0.8,
      "orders": 1,
      "cumulative": 0.8
    },
    {
      "price": 70200,
      "quantity": 1.2,
      "orders": 2,
      "cumulative": 2.0
    }
  ],
  "timestamp": "2025-11-02T10:00:10.000Z"
}
```

---

## 8. Get Recent Trades

### Request
```bash
curl "http://localhost:8000/trades?limit=10"
```

### Response
```json
[
  {
    "trade_id": "770fa622-g4bd-63f6-c938-668877662222",
    "instrument": "BTC-USD",
    "price": 70000,
    "quantity": 0.25,
    "buy_order_id": "550e8400-e29b-41d4-a716-446655440000",
    "sell_order_id": "660f9511-f3ac-52e5-b827-557766551111",
    "timestamp": "2025-11-02T10:00:01.000Z"
  }
]
```

---

## 9. Get Trade Statistics

### Request
```bash
curl "http://localhost:8000/trades/stats?instrument=BTC-USD&minutes=60"
```

### Response
```json
{
  "instrument": "BTC-USD",
  "period_minutes": 60,
  "trade_count": 125,
  "volume": "31.50000000",
  "vwap": "70125.50000000",
  "high": "70500.00000000",
  "low": "69800.00000000",
  "last_price": "70150.00000000",
  "timestamp": "2025-11-02T10:00:15.000Z"
}
```

---

## 10. Create Orderbook Snapshot

### Request
```bash
curl -X POST http://localhost:8000/orderbook/snapshot \
  -H "Content-Type: application/json" \
  -d '{"instrument": "BTC-USD"}'
```

### Response
```json
{
  "snapshot_id": 42,
  "instrument": "BTC-USD",
  "timestamp": "2025-11-02T10:00:20.000Z",
  "bid_levels": 145,
  "ask_levels": 138
}
```

---

## 11. Get Prometheus Metrics

### Request
```bash
curl http://localhost:8000/metrics
```

### Response (plain text)
```
# HELP orders_received_total Total number of orders received
# TYPE orders_received_total counter
orders_received_total{instrument="BTC-USD",type="limit",side="buy"} 1250
orders_received_total{instrument="BTC-USD",type="limit",side="sell"} 1180
orders_received_total{instrument="BTC-USD",type="market",side="buy"} 320
orders_received_total{instrument="BTC-USD",type="market",side="sell"} 298

# HELP orders_matched_total Total number of orders matched
# TYPE orders_matched_total counter
orders_matched_total{instrument="BTC-USD"} 2145

# HELP order_latency_seconds Order processing latency in seconds
# TYPE order_latency_seconds histogram
order_latency_seconds_bucket{le="0.01",instrument="BTC-USD"} 1850
order_latency_seconds_bucket{le="0.05",instrument="BTC-USD"} 2200
order_latency_seconds_bucket{le="0.1",instrument="BTC-USD"} 2450
order_latency_seconds_bucket{le="+Inf",instrument="BTC-USD"} 2500
order_latency_seconds_sum{instrument="BTC-USD"} 45.5
order_latency_seconds_count{instrument="BTC-USD"} 2500

# HELP current_orderbook_depth Current orderbook depth
# TYPE current_orderbook_depth gauge
current_orderbook_depth{instrument="BTC-USD",side="bid"} 125.5
current_orderbook_depth{instrument="BTC-USD",side="ask"} 138.2
```

---

## 12. WebSocket Connection

### JavaScript Example
```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8000/stream');

ws.on('open', () => {
  console.log('Connected to trading exchange');
  
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['orderbook_deltas', 'trades', 'orders']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'connected':
      console.log('Welcome:', message.message);
      break;
      
    case 'subscribed':
      console.log('Subscribed to:', message.channels);
      break;
      
    case 'orderbook_delta':
      console.log('Orderbook update:', message.data);
      break;
      
    case 'trade':
      console.log('New trade:', message.data);
      break;
      
    case 'order_update':
      console.log('Order update:', message.data);
      break;
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from trading exchange');
});
```

### WebSocket Message Examples

#### Orderbook Delta
```json
{
  "type": "orderbook_delta",
  "instrument": "BTC-USD",
  "data": {
    "bids": [
      {"price": 70000, "quantity": 1.5, "orders": 3, "cumulative": 1.5}
    ],
    "asks": [
      {"price": 70100, "quantity": 0.8, "orders": 1, "cumulative": 0.8}
    ]
  },
  "timestamp": "2025-11-02T10:00:25.000Z"
}
```

#### Trade Event
```json
{
  "type": "trade",
  "data": {
    "trade_id": "990gc844-i6df-85h8-e15a-880099884444",
    "instrument": "BTC-USD",
    "price": 70000,
    "quantity": 0.5,
    "buy_order_id": "550e8400-e29b-41d4-a716-446655440000",
    "sell_order_id": "660f9511-f3ac-52e5-b827-557766551111",
    "timestamp": "2025-11-02T10:00:25.500Z"
  },
  "timestamp": "2025-11-02T10:00:25.501Z"
}
```

#### Order Update
```json
{
  "type": "order_update",
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "partially_filled",
    "filled_quantity": 0.25,
    "remaining_quantity": 0.25
  },
  "timestamp": "2025-11-02T10:00:25.501Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 404 Not Found
```json
{
  "error": "Order not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 45
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```
