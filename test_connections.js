
require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('redis');

async function testConnections() {
    console.log('Testing connections...');

    // TCP/IP Database Check
    const dbConfig = {
        connectionString: process.env.DATABASE_URL,
    };

    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('✅ PostgreSQL Connection Successful');
        const res = await client.query('SELECT NOW()');
        console.log('   Time:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ PostgreSQL Connection Failed:', err.message);
    }

    // Redis Check
    const redisClient = createClient({
        url: process.env.REDIS_URL
    });

    redisClient.on('error', (err) => {
        console.error('❌ Redis Connection Failed:', err.message);
    });

    try {
        await redisClient.connect();
        console.log('✅ Redis Connection Successful');
        await redisClient.set('test_key', 'test_value');
        const value = await redisClient.get('test_key');
        console.log('   Redis Test Value:', value);
        await redisClient.disconnect();
    } catch (err) {
        console.log('   (Expected if Redis is not installed)');
    }
}

testConnections();
