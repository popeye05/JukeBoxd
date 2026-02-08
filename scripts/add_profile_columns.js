
const { Client } = require('pg');
require('dotenv').config();

async function updateSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database...');

        // Add bio column
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
    `);

        console.log('✅ Added bio, avatar_url, and display_name columns to users table.');

    } catch (err) {
        console.error('❌ Schema update failed:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
