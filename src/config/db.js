// config/db.js
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // 🔹 SSL required kwa Render
  },
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL...');
});

pool.on('error', (err) => {
  console.error('❌ Postgres pool error', err);
});

module.exports = pool;