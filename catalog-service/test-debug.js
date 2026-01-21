import pg from 'pg';
import os from 'os';

const client = new pg.Client({
  host: '127.0.0.1',
  port: 15433,
  database: 'ticketbuster',
  user: 'admin',
  password: 'admin',
});

console.log('=== Debug Info ===');
console.log('Hostname:', os.hostname());
console.log('Client config:', {
  host: client.host,
  port: client.port,
  user: client.user,
  database: client.database,
});

console.log('\nAttempting connection...');
client.connect()
  .then(() => {
    console.log('✓ Connected!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('Version:', result.rows[0].version);
    return client.end();
  })
  .catch(err => {
    console.error('✗ Error:', err.message);
    console.error('SQL State:', err.code);
  });
