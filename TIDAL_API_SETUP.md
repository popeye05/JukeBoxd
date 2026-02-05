# TIDAL API Setup Guide

## Getting TIDAL API Credentials

### Step 1: Create TIDAL Developer Account
1. Visit [developer.tidal.com](https://developer.tidal.com)
2. Click "Sign Up" or "Get Started"
3. Sign in with your existing TIDAL account or create a new one
4. Complete the developer registration process

### Step 2: Create Your Application
1. Once logged in, go to the Developer Dashboard
2. Click "Create New App" or "Add Application"
3. Fill in your application details:
   - **App Name**: JukeBoxd
   - **Description**: Social music discovery web application
   - **App Type**: Web Application
   - **Redirect URI**: `http://localhost:3000/auth/callback` (for development)
   - **Website**: `http://localhost:3001` (your frontend URL)

### Step 3: Get Your Credentials
1. After creating the app, you'll see your **Client ID** and **Client Secret**
2. Copy these credentials (the Client Secret will be hidden after you leave the page)
3. Store them securely

### Step 4: Update Environment Variables
1. Open your `.env` file in the project root
2. Replace the placeholder values:
   ```env
   # TIDAL API Configuration
   TIDAL_CLIENT_ID=your-actual-client-id-here
   TIDAL_CLIENT_SECRET=your-actual-client-secret-here
   ```

### Step 5: Restart the Server
1. Stop your backend server (Ctrl+C)
2. Restart it: `npm start`
3. You should see: `🎵 TIDAL Service using official API`

## Testing the Real TIDAL API

Once configured, test the API:

```bash
# Search for albums
curl "http://localhost:3000/api/albums/search?q=beatles"

# The response should now include real TIDAL album data instead of mock data
```

## TIDAL API Features

With real TIDAL credentials, you get:
- **Full Album Catalog**: Access to TIDAL's complete music library
- **High-Quality Metadata**: Detailed album information, release dates, and artwork
- **Real Album URLs**: Direct links to albums on TIDAL
- **Rate Limiting**: Proper API rate limiting and caching
- **Search Functionality**: Advanced search across TIDAL's catalog

## Troubleshooting

### Common Issues:

1. **"TIDAL authentication failed"**
   - Check your Client ID and Client Secret are correct
   - Ensure no extra spaces in the .env file
   - Verify your TIDAL developer account is active

2. **"TIDAL rate limit exceeded"**
   - The service automatically handles rate limiting
   - Wait a moment and try again

3. **"TIDAL service temporarily unavailable"**
   - TIDAL API might be down
   - The app will fall back to demo mode automatically

### Fallback Behavior:
- If TIDAL API fails, the service automatically falls back to demo mode
- Users will still see the 6 classic albums and all functionality works
- No disruption to the user experience

## Development vs Production

### Development (localhost):
- Use `http://localhost:3000/auth/callback` as redirect URI
- Client credentials flow for server-to-server API calls

### Production:
- Update redirect URI to your production domain
- Use environment variables for credentials
- Enable HTTPS for security

## API Limits

TIDAL API has usage limits:
- **Requests per minute**: Varies by plan
- **Daily requests**: Check your developer dashboard
- **Concurrent requests**: Limited to prevent abuse

The service includes automatic rate limiting and caching to optimize usage.

## Next Steps

1. Get your TIDAL developer credentials
2. Update the `.env` file
3. Restart the server
4. Test the search functionality
5. Enjoy access to TIDAL's full music catalog!

## Support

If you encounter issues:
1. Check the TIDAL Developer Portal documentation
2. Verify your credentials in the developer dashboard
3. Check the server logs for detailed error messages
4. The app will work in demo mode even if TIDAL API is unavailable