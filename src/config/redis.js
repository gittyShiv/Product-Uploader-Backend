import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis reconnection limit reached');
        return new Error('Redis reconnection limit exceeded');
      }
      const delay = Math.min(retries * 100, 3000);
      console.log(`⏳ Reconnecting to Redis... attempt ${retries}, delay: ${delay}ms`);
      return delay;
    },
  },
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

redisClient.on('reconnecting', () => {
  console.log('⏳ Redis client reconnecting...');
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ Redis connection established successfully.');
    }
  } catch (error) {
    console.error('❌ Unable to connect to Redis:', error);
    // Don't throw - allow system to run without Redis for testing
    console.warn('⚠️  System will continue without Redis caching');
  }
};

export { redisClient, connectRedis };
