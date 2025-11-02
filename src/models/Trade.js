import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Trade = sequelize.define('Trade', {
    trade_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
    },
    buy_order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true,
    },
    sell_order_id: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true,
    },
    instrument: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'BTC-USD',
      index: true,
    },
    price: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    buy_client_id: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
    },
    sell_client_id: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      index: true,
    },
  }, {
    tableName: 'trades',
    timestamps: false,
    indexes: [
      {
        fields: ['instrument', 'timestamp'],
      },
      {
        fields: ['timestamp'],
        order: [['timestamp', 'DESC']],
      },
    ],
  });

  return Trade;
};
