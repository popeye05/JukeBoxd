import { query } from '../config/database';

async function runCoverPhotoMigration() {
  try {
    console.log('🔄 Running cover photo migration...');
    
    // Add cover_photo_url column to users table
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
    `);
    
    console.log('✅ Cover photo migration completed successfully');
  } catch (error) {
    console.error('❌ Cover photo migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runCoverPhotoMigration()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runCoverPhotoMigration };