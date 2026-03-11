import { query } from '../config/database';

export async function autoMigrateCoverPhoto() {
  try {
    // Check if cover_photo_url column exists
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'cover_photo_url'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('🔄 Adding cover_photo_url column to users table...');
      
      await query(`
        ALTER TABLE users 
        ADD COLUMN cover_photo_url TEXT;
      `);
      
      console.log('✅ Cover photo column added successfully');
    } else {
      console.log('✅ Cover photo column already exists');
    }
  } catch (error) {
    console.error('❌ Auto migration failed:', error);
    // Don't throw error - let the app continue without cover photos
  }
}