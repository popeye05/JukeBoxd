
require('dotenv').config();
const { Client } = require('pg');

async function cleanUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Find test users
        const res = await client.query("SELECT id, username FROM users WHERE username LIKE 'testuser_%'");

        if (res.rows.length === 0) {
            console.log('✅ No test users found to delete.');
            return;
        }

        console.log(`Found ${res.rows.length} test users to delete.`);

        // Delete them
        for (const user of res.rows) {
            console.log(`Deleting user: ${user.username} (${user.id})...`);
            // Delete user (cascade should handle related data like reviews/followers)
            await client.query('DELETE FROM users WHERE id = $1', [user.id]);
        }

        console.log(`\n🎉 Successfully deleted ${res.rows.length} test users.`);

    } catch (err) {
        console.error('Cleanup Failed:', err.message);
    } finally {
        await client.end();
    }
}

cleanUsers();
