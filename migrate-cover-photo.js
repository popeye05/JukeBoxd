// Simple migration script that can be run on Render
const { Pool } = require('pg');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Adding cover_photo_url column...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
    `);
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Don't throw error if column already exists
    if (error.message.includes('already exists')) {
      console.log('✅ Column already exists, migration skipped');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);