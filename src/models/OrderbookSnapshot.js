import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const OrderbookSnapshot = sequelize.define('OrderbookSnapshot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    instrument: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
    },
    bids: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    asks: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      index: true,
    },
  }, {
    tableName: 'orderbook_snapshots',
    timestamps: false,
    indexes: [
      {
        fields: ['instrument', 'timestamp'],
      },
    ],
  });

  return OrderbookSnapshot;
};
