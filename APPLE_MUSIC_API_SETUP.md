# Apple Music API Setup Guide

This guide will help you set up Apple Music API credentials for JukeBoxd.

## Overview

Apple Music API uses JWT (JSON Web Token) authentication with ES256 algorithm. You'll need:
- Apple Developer Account
- MusicKit identifier
- Private key file
- Team ID and Key ID

## Step 1: Apple Developer Account

1. Visit [developer.apple.com](https://developer.apple.com)
2. Sign in with your Apple ID or create a new Apple Developer account
3. Enroll in the Apple Developer Program (requires annual fee)

## Step 2: Create MusicKit Identifier

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Click "Identifiers" in the sidebar
4. Click the "+" button to create a new identifier
5. Select "MusicKit Identifier" and click "Continue"
6. Enter a description (e.g., "JukeBoxd Music App")
7. Enter a unique identifier (e.g., `com.yourcompany.jukeboxd`)
8. Click "Continue" and then "Register"

## Step 3: Create Private Key

1. In the same "Certificates, Identifiers & Profiles" section
2. Click "Keys" in the sidebar
3. Click the "+" button to create a new key
4. Enter a key name (e.g., "JukeBoxd MusicKit Key")
5. Check "MusicKit" in the services list
6. Click "Continue" and then "Register"
7. **Important**: Download the `.p8` private key file immediately (you can only download it once)
8. Note the Key ID (10-character string) displayed on the page

## Step 4: Find Your Team ID

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Your Team ID is displayed in the top-right corner of the page (10-character string)

## Step 5: Configure Environment Variables

1. Open your `.env` file in the JukeBoxd project
2. Update the Apple Music configuration:

```env
# Apple Music API Configuration
APPLE_MUSIC_TEAM_ID=YOUR_TEAM_ID_HERE
APPLE_MUSIC_KEY_ID=YOUR_KEY_ID_HERE
APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_PRIVATE_KEY_CONTENT_HERE
-----END PRIVATE KEY-----"
```

### Important Notes:

- **Team ID**: 10-character string from your Apple Developer account
- **Key ID**: 10-character string from the key you created
- **Private Key**: The entire content of the `.p8` file, including the header and footer lines

### Private Key Format:

The private key should be formatted as a single string with `\n` for line breaks:

```env
APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
```

Or as a multi-line string (as shown above).

## Step 6: Test the Integration

1. Restart your JukeBoxd backend server
2. The Apple Music service will automatically detect the configured credentials
3. Try searching for albums in the frontend - it should now use real Apple Music data
4. Check the server logs for any authentication errors

## Troubleshooting

### Common Issues:

1. **"Invalid JWT" errors**:
   - Verify your Team ID and Key ID are correct
   - Ensure the private key is properly formatted
   - Check that the key has MusicKit enabled

2. **"Key not found" errors**:
   - Make sure you downloaded the correct `.p8` file
   - Verify the Key ID matches the key you created

3. **"Forbidden" errors**:
   - Ensure your Apple Developer account has an active membership
   - Verify the MusicKit identifier is properly configured

4. **Rate limiting**:
   - Apple Music API has rate limits (20 requests per second)
   - The service includes automatic rate limiting and retry logic

### Demo Mode

If you don't configure Apple Music credentials, the service will run in demo mode with mock album data. This is useful for development and testing.

## API Limits

- **Rate Limit**: 20 requests per second
- **Token Expiry**: JWT tokens expire after 6 months (automatically refreshed)
- **Geographic Restrictions**: Apple Music catalog varies by country
- **Usage Limits**: Check your Apple Developer agreement for usage restrictions

## Security Best Practices

1. **Never commit credentials**: Keep your `.env` file out of version control
2. **Rotate keys regularly**: Generate new keys periodically
3. **Monitor usage**: Keep track of your API usage through Apple Developer portal
4. **Use environment-specific keys**: Use different keys for development and production

## Additional Resources

- [Apple Music API Documentation](https://developer.apple.com/documentation/applemusicapi)
- [MusicKit Documentation](https://developer.apple.com/documentation/musickit)
- [JWT.io](https://jwt.io) - For debugging JWT tokens
- [Apple Developer Forums](https://developer.apple.com/forums/tags/musickit)

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify your credentials in the Apple Developer portal
3. Test with a simple JWT token generator to isolate authentication issues
4. Consult the Apple Music API documentation for specific error codes