// Quick database connection test
import { neon } from '@neondatabase/serverless';

async function testConnection() {
  const connectionString = process.env.NEON_NEON_DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ NEON_NEON_DATABASE_URL not found in environment');
    return;
  }
  
  console.log('🔍 Testing database connection...');
  console.log('Connection string starts with:', connectionString.substring(0, 30) + '...');
  
  try {
    const sql = neon(connectionString);
    const result = await sql`SELECT NOW() as current_time, version()`;
    console.log('✅ Database connection successful!');
    console.log('Server time:', result[0].current_time);
    console.log('PostgreSQL version:', result[0].version.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    if (error.cause) {
      console.error('Cause:', error.cause.message);
    }
  }
}

testConnection();
