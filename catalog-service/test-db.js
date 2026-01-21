import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

console.log('Testing database connection with:');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Password:', process.env.DB_PASS);
console.log('Database:', process.env.DB_NAME);
console.log('Port:', process.env.DB_PORT);
console.log('Schema:', process.env.DB_SCHEMA);
console.log('\nPassword length:', process.env.DB_PASS?.length);
console.log('Password bytes:', Buffer.from(process.env.DB_PASS || '', 'utf8').toString('hex'));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASS || 'admin',
  database: process.env.DB_NAME || 'ticketbuster',
  port: Number(process.env.DB_PORT || 5433),
  max: 10,
  idleTimeoutMillis: 30_000,
});

const schema = process.env.DB_SCHEMA || 'db_catalog';

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}, public`);
});

async function testConnection() {
  try {
    console.log('\n--- Testing connection ---');
    const client = await pool.connect();
    console.log('✓ Connection successful');
    
    console.log('\n--- Testing query ---');
    const result = await client.query('SELECT * FROM events LIMIT 3');
    console.log('✓ Query successful. Found', result.rowCount, 'events:');
    console.log(result.rows);
    
    client.release();
    await pool.end();
    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
