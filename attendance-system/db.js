require('dotenv').config();
const { Pool, types } = require('pg');

types.setTypeParser(1082, (v) => v);              // DATE  -> 'YYYY-MM-DD' (no timezone shifts)
types.setTypeParser(20, (v) => parseInt(v, 10));  // COUNT -> number

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Neon closes idle connections; without this handler the app would crash.
pool.on('error', (err) => console.error('Idle database client error:', err.message));

module.exports = pool;
