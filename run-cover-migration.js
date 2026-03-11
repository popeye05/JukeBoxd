const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('🔄 Running cover photo migration...');
    
    // Add cover_photo_url column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
    `);
    
    console.log('✅ Cover photo migration completed successfully');
  } catch (error) {
    console.error('❌ Cover photo migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });