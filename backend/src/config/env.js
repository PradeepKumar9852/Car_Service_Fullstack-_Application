const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

module.exports = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  SERVICE_CENTER_NAME: process.env.SERVICE_CENTER_NAME || 'Precision Auto Care & Service Center',
  MAX_HISTORY_LENGTH: parseInt(process.env.MAX_HISTORY_LENGTH || '20', 10),

  // Database Configuration (PostgreSQL)
  DATABASE_URL: process.env.DATABASE_URL || '',
  DB_HOST: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
  DB_USER: process.env.DB_USER || process.env.PGUSER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
  DB_NAME: process.env.DB_NAME || process.env.DB_DATABASE || process.env.PGDATABASE || 'carservice',
  DB_SSL: process.env.DB_SSL === 'true'
};
