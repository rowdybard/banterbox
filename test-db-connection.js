import { Pool } from 'pg';

console.log('🔍 Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

try {
  const client = await pool.connect();
  console.log('✅ Database connection successful!');
  console.log('Database:', client.database);
  console.log('Host:', client.connectionParameters.host);
  await client.release();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.error('Full error:', error);
} finally {
  await pool.end();
}
