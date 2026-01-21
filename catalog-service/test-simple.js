import pg from 'pg';

async function test() {
  const client = new pg.Client({
    host: '127.0.0.1',
    port: 5433,
    database: 'ticketbuster',
    user: 'admin',
    password: 'admin',
  });
  
  console.log('Attempting connection...');
  await client.connect();
  console.log('Connected!');
  
  const result = await client.query('SELECT version()');
  console.log('Result:', result.rows[0]);
  
  await client.end();
}

test().catch(err => {
  console.error('Error:', err.message);
  console.error('Code:', err.code);
  process.exit(1);
});
