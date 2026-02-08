
require('dotenv').config();
const { Client } = require('pg');

async function checkUser() {
    const username = 'scube22200';
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log(`Checking for user: ${username}...`);

        const res = await client.query('SELECT * FROM users WHERE username = $1', [username]);

        if (res.rows.length > 0) {
            console.log(`Found ${res.rows.length} user(s) with username '${username}':`);
            res.rows.forEach(user => {
                console.log(`- ID: ${user.id}, Email: ${user.email}, Created At: ${user.created_at}`);
            });
        } else {
            console.log(`No user found with username '${username}'.`);
        }
    } catch (err) {
        console.error('Database Query Failed:', err.message);
    } finally {
        await client.end();
    }
}

checkUser();
