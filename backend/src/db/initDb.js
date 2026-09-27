const fs = require('fs');
const path = require('path');
const db = require('../config/db');

/**
 * Automates the creation of database tables if they do not exist.
 * Reads backend/src/db/schema.sql and applies it to the configured PostgreSQL database.
 */
async function initDatabase() {
  console.log(' Checking database connection and initializing tables...');

  try {
    const connCheck = await db.testConnection();
    if (!connCheck.connected) {
      console.warn('  Could not connect to PostgreSQL database:', connCheck.error);
      console.warn(' Please ensure PostgreSQL is running and your .env connection settings (DATABASE_URL or DB_* fields) are correct.');
      return false;
    }

    console.log(` Connected to PostgreSQL successfully (DB Server Time: ${connCheck.timestamp})`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(sql);

    console.log(' Database schema verified! Tables "customers" and "conversations" are ready.');
    return true;
  } catch (err) {
    console.error(' Error initializing database tables:', err.message);
    throw err;
  }
}

// Run directly from command line if invoked as script
if (require.main === module) {
  initDatabase()
    .then((success) => {
      if (success) {
        console.log(' Database setup completed successfully.\n');
        process.exit(0);
      } else {
        console.log('Database setup skipped due to unreachable host.\n');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(' Database setup failed:', err);
      process.exit(1);
    })
    .finally(() => {
      db.closePool();
    });
}

module.exports = {
  initDatabase
};
