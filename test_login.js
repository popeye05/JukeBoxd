
const axios = require('axios');

async function testLogin() {
    const url = 'http://localhost:3001/api/auth/login';
    const loginData = {
        usernameOrEmail: 'scube22200',
        password: 'Shiv@21924'
    };

    console.log(`Attempting to login at ${url}...`);
    console.log('Data:', loginData);

    try {
        const response = await axios.post(url, loginData);
        console.log('✅ Login Successful!');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Login Failed!');
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

testLogin();
