const { Sequelize } = require('sequelize');
// require('dotenv').config(); // dotenv is loaded in server.js

// Use environment variables for DB connection
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/okai_db',
  {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

module.exports = sequelize; 