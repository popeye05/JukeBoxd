
const axios = require('axios');

async function testRecentReviews() {
    const url = 'http://localhost:3001/api/reviews/recent';
    console.log(`Getting recent reviews from ${url}...`);

    try {
        const response = await axios.get(url);
        console.log('✅ Success!');
        console.log(`Received ${response.data.data.reviews.length} reviews.`);
        const firstReview = response.data.data.reviews[0];
        console.log('Sample Review:', {
            id: firstReview.id,
            album: firstReview.album.name,
            user: firstReview.user.username,
            content: firstReview.content
        });
    } catch (error) {
        console.error('❌ Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testRecentReviews();
