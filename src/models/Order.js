import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Order = sequelize.define('Order', {
    order_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    client_id: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
    },
    instrument: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'BTC-USD',
      index: true,
    },
    side: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('limit', 'market'),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: true, // null for market orders
    },
    quantity: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    filled_quantity: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM('open', 'partially_filled', 'filled', 'cancelled', 'rejected'),
      allowNull: false,
      defaultValue: 'open',
      index: true,
    },
    idempotency_key: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      index: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['instrument', 'side', 'status'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['client_id', 'created_at'],
      },
    ],
  });

  return Order;
};
