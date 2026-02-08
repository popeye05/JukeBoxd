
require('dotenv').config();
const { Client } = require('pg');

async function listUsers() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT id, username, email, created_at FROM users');
        console.log('\n👥 Users in Database:');
        res.rows.forEach(user => {
            console.log(`- [${user.username}] (${user.email}) - ID: ${user.id}`);
        });
    } catch (err) {
        console.error('Database Query Failed:', err.message);
    } finally {
        await client.end();
    }
}

listUsers();
