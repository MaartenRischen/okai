const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatHistory = sequelize.define('ChatHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  platform: { // e.g., 'chatgpt', 'gemini'
    type: DataTypes.STRING,
    allowNull: false,
  },
  conversationId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Each message should be unique
  },
  role: { // e.g., 'user', 'assistant', 'system'
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: true, // Use Sequelize default createdAt/updatedAt
  indexes: [
    { fields: ['platform'] },
    { fields: ['conversationId'] },
    { fields: ['timestamp'] },
  ],
});

module.exports = ChatHistory; 