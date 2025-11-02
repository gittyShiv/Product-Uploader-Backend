const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

/**
 * Simple rate limiter middleware
 */
export const rateLimiter = (req, res, next) => {
  const clientId = req.body.client_id || req.ip || 'anonymous';
  const now = Date.now();
  
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const clientData = requestCounts.get(clientId);

  if (now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retry_after: Math.ceil((clientData.resetTime - now) / 1000),
    });
  }

  clientData.count += 1;
  next();
};

/**
 * Cleanup old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [clientId, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(clientId);
    }
  }
}, RATE_LIMIT_WINDOW);
