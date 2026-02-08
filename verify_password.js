
require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function checkUserAndPassword() {
    const username = 'scube22200';
    const passwordToTest = 'Shiv@21924';

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log(`\n🔍 Checking for user: ${username}...`);

        const res = await client.query('SELECT id, username, email, password_hash, created_at FROM users WHERE username = $1', [username]);

        if (res.rows.length > 0) {
            const user = res.rows[0];
            console.log(`\n✅ User found!`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Created: ${user.created_at}`);

            // Verify password
            console.log(`\n🔐 Testing password: "${passwordToTest}"...`);
            const passwordMatch = await bcrypt.compare(passwordToTest, user.password_hash);

            if (passwordMatch) {
                console.log(`✅ PASSWORD MATCHES! Login should work.`);
            } else {
                console.log(`❌ PASSWORD DOES NOT MATCH!`);
                console.log(`   The password "${passwordToTest}" is incorrect for this account.`);
            }
        } else {
            console.log(`\n❌ No user found with username '${username}'.`);
        }
    } catch (err) {
        console.error('Database Query Failed:', err.message);
    } finally {
        await client.end();
    }
}

checkUserAndPassword();
