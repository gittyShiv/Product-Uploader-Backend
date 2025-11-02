import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import OrderModel from '../models/Order.js';
import TradeModel from '../models/Trade.js';
import OrderbookSnapshotModel from '../models/OrderbookSnapshot.js';

dotenv.config();

const sequelize = new Sequelize(process.env.POSTGRES_URI || 'postgres://postgres:root@localhost:5432/trading', {
  dialect: 'postgres',
  logging: process.env.NODE_ENV !== 'production' ? console.log : false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
});

// Initialize models
const Order = OrderModel(sequelize);
const Trade = TradeModel(sequelize);
const OrderbookSnapshot = OrderbookSnapshotModel(sequelize);

// Define associations
Order.hasMany(Trade, {
  foreignKey: 'buy_order_id',
  as: 'buyTrades',
});

Order.hasMany(Trade, {
  foreignKey: 'sell_order_id',
  as: 'sellTrades',
});

Trade.belongsTo(Order, {
  foreignKey: 'buy_order_id',
  as: 'buyOrder',
});

Trade.belongsTo(Order, {
  foreignKey: 'sell_order_id',
  as: 'sellOrder',
});

// Test connection and sync
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    if (process.env.NODE_ENV !== 'test') {
      await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
      console.log('✅ Database models synchronized.');
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export { sequelize, Order, Trade, OrderbookSnapshot, connectDB };
