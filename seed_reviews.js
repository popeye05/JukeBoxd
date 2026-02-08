
require('dotenv').config();
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const REVIEWS = [
    "A masterpiece of modern music. Every track feels like a journey.",
    "The production on this is absolutely insane. Best album of the year.",
    "Took me a few listens, but now I can't stop playing it.",
    "Generic and boring. Expected more from them.",
    "Solid 8/10. Great lyrics but the mixing could be better.",
    "This album changed my life. I'm not even exaggerating.",
    "Overhyped. It's good, but not THAT good.",
    "Simply incredible. No skips on this one.",
    "The second half drags a bit, but the first 4 tracks are fire.",
    "A return to form. Glad they went back to their roots."
];

async function seedReviews() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Get users and albums
        const users = await client.query('SELECT id, username FROM users');
        const albums = await client.query('SELECT id, name FROM albums');

        if (users.rows.length === 0 || albums.rows.length === 0) {
            console.log('❌ Need at least one user and one album to seed reviews.');
            return;
        }

        console.log(`Found ${users.rows.length} users and ${albums.rows.length} albums.`);

        let createdCount = 0;

        // Create 10 reviews
        for (let i = 0; i < 10; i++) {
            const user = users.rows[Math.floor(Math.random() * users.rows.length)];
            const album = albums.rows[Math.floor(Math.random() * albums.rows.length)];
            const content = REVIEWS[i % REVIEWS.length];
            const id = uuidv4();

            // Check if review already exists
            const exists = await client.query(
                'SELECT id FROM reviews WHERE user_id = $1 AND album_id = $2',
                [user.id, album.id]
            );

            if (exists.rows.length === 0) {
                await client.query(
                    `INSERT INTO reviews (id, user_id, album_id, content, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                    [id, user.id, album.id, content]
                );
                console.log(`✅ Created review for ${album.name} by ${user.username}`);
                createdCount++;
            } else {
                console.log(`⚠️ Review already exists for ${album.name} by ${user.username}`);
            }
        }

        console.log(`\n🎉 Successfully created ${createdCount} new reviews.`);

    } catch (err) {
        console.error('Seeding Failed:', err.message);
    } finally {
        await client.end();
    }
}

seedReviews();
