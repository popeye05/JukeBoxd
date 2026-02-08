
require('dotenv').config();
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function seedUserData() {
    const username = 'scube22200'; // Target user

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Get user
        const userRes = await client.query('SELECT id FROM users WHERE username = $1', [username]);

        if (userRes.rows.length === 0) {
            console.log(`❌ User '${username}' not found.`);
            return;
        }

        const userId = userRes.rows[0].id;
        console.log(`found User: ${username} (${userId})`);

        // Get albums
        const albumsRes = await client.query('SELECT id, name FROM albums LIMIT 5');
        if (albumsRes.rows.length === 0) {
            console.log('❌ No albums found.');
            return;
        }

        // Create 3 reviews for this user
        let reviewsCreated = 0;
        for (const album of albumsRes.rows.slice(0, 3)) {
            const id = uuidv4();
            const content = `This is a test review for ${album.name}. Really enjoyed it!`;

            const exists = await client.query(
                'SELECT id FROM reviews WHERE user_id = $1 AND album_id = $2',
                [userId, album.id]
            );

            if (exists.rows.length === 0) {
                await client.query(
                    `INSERT INTO reviews (id, user_id, album_id, content, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                    [id, userId, album.id, content]
                );
                console.log(`✅ Added review for ${album.name}`);
                reviewsCreated++;
            }
        }

        // Add some ratings
        let ratingsCreated = 0;
        // Get more albums for ratings
        const moreAlbumsRes = await client.query('SELECT id, name FROM albums LIMIT 10 OFFSET 3');

        for (const album of moreAlbumsRes.rows) {
            const exists = await client.query(
                'SELECT id FROM ratings WHERE user_id = $1 AND album_id = $2',
                [userId, album.id]
            );

            if (exists.rows.length === 0) {
                // Random rating 1-5
                const rating = Math.floor(Math.random() * 5) + 1;
                const id = uuidv4();

                await client.query(
                    `INSERT INTO ratings (id, user_id, album_id, rating, created_at, updated_at) 
               VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                    [id, userId, album.id, rating]
                );
                console.log(`✅ Added ${rating}★ rating for ${album.name}`);
                ratingsCreated++;
            }
        }

        console.log(`\n🎉 Added ${reviewsCreated} reviews and ${ratingsCreated} ratings for ${username}. Profile should now show data.`);

    } catch (err) {
        console.error('Seeding Failed:', err.message);
    } finally {
        await client.end();
    }
}

seedUserData();
