
require('dotenv').config();
const { Client } = require('pg');

async function checkAlbums() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        const res = await client.query('SELECT COUNT(*) FROM albums');
        console.log(`\n📊 Total Albums: ${res.rows[0].count}`);

        if (parseInt(res.rows[0].count) > 0) {
            const albums = await client.query('SELECT * FROM albums LIMIT 5');
            console.log('Sample Albums:', albums.rows.map(a => ({ id: a.id, name: a.name, artist: a.artist })));
        }
    } catch (err) {
        console.error('Database Query Failed:', err.message);
    } finally {
        await client.end();
    }
}

checkAlbums();
