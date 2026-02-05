import { connectDatabase, query, closeDatabase } from '@/config/database';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async (): Promise<void> => {
  console.log('🔄 Creating database tables...');

  // Enable UUID extension
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Albums table
  await query(`
    CREATE TABLE IF NOT EXISTS albums (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      spotify_id VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      artist VARCHAR(255) NOT NULL,
      release_date DATE,
      image_url TEXT,
      spotify_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ratings table
  await query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, album_id)
    );
  `);

  // Reviews table
  await query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, album_id)
    );
  `);

  // Follows table
  await query(`
    CREATE TABLE IF NOT EXISTS follows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
      followee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, followee_id),
      CHECK(follower_id != followee_id)
    );
  `);

  // Activities table
  await query(`
    CREATE TABLE IF NOT EXISTS activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
      data JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Tables created successfully');
};

const createIndexes = async (): Promise<void> => {
  console.log('🔄 Creating database indexes...');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_ratings_album_id ON ratings(album_id);',
    'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_reviews_album_id ON reviews(album_id);',
    'CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);',
    'CREATE INDEX IF NOT EXISTS idx_follows_followee_id ON follows(followee_id);',
    'CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_albums_spotify_id ON albums(spotify_id);',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);'
  ];

  for (const indexQuery of indexes) {
    await query(indexQuery);
  }

  console.log('✅ Indexes created successfully');
};

const createTriggers = async (): Promise<void> => {
  console.log('🔄 Creating database triggers...');

  // Function to update updated_at timestamp
  await query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Triggers for updated_at
  const tables = ['users', 'albums', 'ratings', 'reviews'];
  for (const table of tables) {
    await query(`
      DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
      CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  console.log('✅ Triggers created successfully');
};

const runMigrations = async (): Promise<void> => {
  try {
    await connectDatabase();
    console.log('🔗 Connected to database');

    await createTables();
    await createIndexes();
    await createTriggers();

    console.log('🎉 Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };