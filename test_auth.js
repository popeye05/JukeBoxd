
const axios = require('axios');

async function testRegistration() {
    const url = 'http://localhost:3001/api/auth/register';
    const userData = {
        username: 'scube22200',
        email: 'scube22200@example.com',
        password: 'Shiv@21924'
    };

    console.log(`Attempting to register user at ${url}...`);
    console.log('Data:', userData);

    try {
        const response = await axios.post(url, userData);
        console.log('✅ Registration Successful!');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Registration Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received (Network Error)');
        } else {
            console.error('Error:', error.message);
        }
    }
}

testRegistration();
