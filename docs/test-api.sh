#!/bin/bash
# Trading Exchange API - cURL Examples
# Make sure the server is running on http://localhost:8000

BASE_URL="http://localhost:8000"

echo "========================================="
echo "Trading Exchange API Tests"
echo "========================================="
echo ""

# 1. Health Check
echo "1. Health Check"
echo "GET /healthz"
curl -s "$BASE_URL/healthz" | jq '.'
echo ""
echo ""

# 2. Get Current Orderbook
echo "2. Get Current Orderbook"
echo "GET /orderbook?levels=5"
curl -s "$BASE_URL/orderbook?levels=5" | jq '.'
echo ""
echo ""

# 3. Submit Limit Buy Order
echo "3. Submit Limit Buy Order"
echo "POST /orders"
BUY_ORDER=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test-client-1",
    "instrument": "BTC-USD",
    "side": "buy",
    "type": "limit",
    "price": 69000,
    "quantity": 0.5
  }')
echo "$BUY_ORDER" | jq '.'
BUY_ORDER_ID=$(echo "$BUY_ORDER" | jq -r '.order_id')
echo ""
echo ""

# 4. Submit Limit Sell Order
echo "4. Submit Limit Sell Order"
echo "POST /orders"
SELL_ORDER=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test-client-2",
    "instrument": "BTC-USD",
    "side": "sell",
    "type": "limit",
    "price": 71000,
    "quantity": 0.3
  }')
echo "$SELL_ORDER" | jq '.'
SELL_ORDER_ID=$(echo "$SELL_ORDER" | jq -r '.order_id')
echo ""
echo ""

# 5. Submit Market Order (will match if possible)
echo "5. Submit Market Sell Order"
echo "POST /orders"
curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test-client-3",
    "instrument": "BTC-USD",
    "side": "sell",
    "type": "market",
    "quantity": 0.1
  }' | jq '.'
echo ""
echo ""

# 6. Get Order Status
echo "6. Get Order Status"
echo "GET /orders/$BUY_ORDER_ID"
curl -s "$BASE_URL/orders/$BUY_ORDER_ID" | jq '.'
echo ""
echo ""

# 7. Get Recent Trades
echo "7. Get Recent Trades"
echo "GET /trades?limit=5"
curl -s "$BASE_URL/trades?limit=5" | jq '.'
echo ""
echo ""

# 8. Get Trade Statistics
echo "8. Get Trade Statistics (last 60 minutes)"
echo "GET /trades/stats?minutes=60"
curl -s "$BASE_URL/trades/stats?minutes=60" | jq '.'
echo ""
echo ""

# 9. Submit Order with Idempotency Key
echo "9. Submit Order with Idempotency Key"
echo "POST /orders (with idempotency_key)"
IDEMP_KEY="test-key-$(date +%s)"
curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"idempotency_key\": \"$IDEMP_KEY\",
    \"client_id\": \"test-client-4\",
    \"instrument\": \"BTC-USD\",
    \"side\": \"buy\",
    \"type\": \"limit\",
    \"price\": 68500,
    \"quantity\": 0.2
  }" | jq '.'
echo ""
echo "Submitting same request again..."
curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"idempotency_key\": \"$IDEMP_KEY\",
    \"client_id\": \"test-client-4\",
    \"instrument\": \"BTC-USD\",
    \"side\": \"buy\",
    \"type\": \"limit\",
    \"price\": 68500,
    \"quantity\": 0.2
  }" | jq '.'
echo ""
echo ""

# 10. Cancel Order
echo "10. Cancel Order"
echo "POST /orders/$SELL_ORDER_ID/cancel"
curl -s -X POST "$BASE_URL/orders/$SELL_ORDER_ID/cancel" | jq '.'
echo ""
echo ""

# 11. Create Orderbook Snapshot
echo "11. Create Orderbook Snapshot"
echo "POST /orderbook/snapshot"
curl -s -X POST "$BASE_URL/orderbook/snapshot" \
  -H "Content-Type: application/json" \
  -d '{"instrument": "BTC-USD"}' | jq '.'
echo ""
echo ""

# 12. Get Metrics
echo "12. Get Prometheus Metrics"
echo "GET /metrics"
curl -s "$BASE_URL/metrics" | grep -E "^(orders|trades|current)" | head -20
echo "... (truncated)"
echo ""
echo ""

# 13. Get Updated Orderbook
echo "13. Get Updated Orderbook"
echo "GET /orderbook?levels=10"
curl -s "$BASE_URL/orderbook?levels=10" | jq '.'
echo ""
echo ""

echo "========================================="
echo "All API tests completed!"
echo "========================================="
