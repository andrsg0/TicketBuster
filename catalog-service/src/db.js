import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'admin',
  database: process.env.DB_NAME || 'ticketbuster',
  port: Number(process.env.DB_PORT || 5432),
  max: 10,
  idleTimeoutMillis: 30_000,
});

const schema = process.env.DB_SCHEMA || 'db_catalog';

// Set search_path to db_catalog schema on every connection
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}, public`);
});

// Wrapper to ensure search_path is set before executing queries
const queryWithSchema = async (text, values) => {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schema}, public`);
    const result = await client.query(text, values);
    return result;
  } finally {
    client.release();
  }
};

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

export default pool;
export { queryWithSchema };
