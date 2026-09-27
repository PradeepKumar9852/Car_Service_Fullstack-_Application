const { Pool } = require('pg');
const env = require('./env');

/**
 * PostgreSQL Connection Pool Configuration
 * Supports full connection string (DATABASE_URL) or individual credentials.
 */
const poolConfig = env.DATABASE_URL && env.DATABASE_URL.trim() !== ''
  ? {
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      ...(env.DB_PASSWORD ? { password: String(env.DB_PASSWORD) } : {}),
      database: env.DB_NAME,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };

const pool = new Pool(poolConfig);

// Pool event listeners
pool.on('connect', () => {
  // Client connected to pool
});

pool.on('error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('PostgreSQL idle client warning:', err.message);
  }
});

/**
 * Execute a parameterized query using the pool.
 * 
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Database query note:', error.message);
    }
    throw error;
  }
}

/**
 * Acquire a dedicated client from the pool (for transactions).
 * Remember to call client.release() when finished!
 * 
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Verify database connection health.
 * 
 * @returns {Promise<{ connected: boolean, timestamp?: string, error?: string }>}
 */
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() AS current_time');
    return {
      connected: true,
      timestamp: res.rows[0].current_time
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Gracefully close the connection pool.
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool
};
