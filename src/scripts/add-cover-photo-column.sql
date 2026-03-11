-- Add cover_photo_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Add index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_users_cover_photo_url ON users(cover_photo_url);