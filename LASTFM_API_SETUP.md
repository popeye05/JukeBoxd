# Last.fm API Setup Guide (FREE!)

This guide will help you set up Last.fm API credentials for JukeBoxd. **Last.fm API is completely FREE** with no usage limits!

## Why Last.fm?

- ✅ **Completely FREE** - No payment required
- ✅ **No usage limits** - Unlimited API calls
- ✅ **Massive database** - Over 12 million albums
- ✅ **High-quality metadata** - Album art, release dates, artist info
- ✅ **Simple setup** - Just one API key needed
- ✅ **Reliable service** - Been running since 2002

## Step 1: Create Last.fm Account

1. Go to [last.fm](https://www.last.fm)
2. Click "Sign Up" if you don't have an account
3. Create your free Last.fm account

## Step 2: Get Your FREE API Key

1. Go to [last.fm/api/account/create](https://www.last.fm/api/account/create)
2. Fill out the application form:
   - **Application name**: `JukeBoxd`
   - **Application description**: `Social music discovery web application`
   - **Application homepage URL**: `http://localhost:3000` (or your domain)
   - **Application type**: Select "Desktop Application" or "Web Application"
3. Click "Submit"
4. You'll get your **API Key** immediately - copy it!

## Step 3: Configure Environment Variables

1. Open your `.env` file in the JukeBoxd project
2. Update the Last.fm configuration:

```env
# Last.fm API Configuration (FREE)
LASTFM_API_KEY=your-api-key-here
```

**Example:**
```env
LASTFM_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

## Step 4: Test the Integration

1. Restart your JukeBoxd backend server:
   ```bash
   npm run dev
   ```

2. The Last.fm service will automatically detect your API key
3. Try searching for albums in the frontend - it should now use real Last.fm data!
4. Check the server logs - you should see: `🎵 Last.fm Service using real API`

## Step 5: Verify It's Working

1. Open your JukeBoxd app at `http://localhost:3001`
2. Go to "Search Albums"
3. Search for any artist or album (e.g., "Beatles", "Pink Floyd")
4. You should see real album results with high-quality artwork
5. Click "Open in Last.fm" to verify the links work

## Demo Mode vs Real API

### Demo Mode (no API key):
- Uses 12 hardcoded classic albums
- Limited search results
- No real-time data

### Real Last.fm API:
- Access to 12+ million albums
- Real-time search results
- High-quality album artwork
- Accurate release dates and metadata
- Links to Last.fm pages

## API Features You Get

With your free Last.fm API key, you can:

- **Search albums** by name or artist
- **Get album details** including artwork and release dates
- **Access metadata** for millions of albums
- **No rate limits** - make as many requests as you need
- **High-quality images** - album artwork in multiple sizes

## Troubleshooting

### Common Issues:

1. **"Last.fm API key invalid" errors**:
   - Double-check your API key is correct
   - Make sure there are no extra spaces
   - Verify the key is active in your Last.fm account

2. **"Album not found" errors**:
   - Try different search terms
   - Some albums might not be in Last.fm's database
   - Check spelling of artist/album names

3. **Still seeing demo mode**:
   - Restart your backend server after adding the API key
   - Check the server logs for confirmation
   - Verify the `.env` file is in the correct location

### Viewing Logs:
Check your terminal where you run `npm run dev` to see:
- `🎵 Last.fm Service using real API` (success)
- `🎵 Last.fm Service running in DEMO MODE` (no API key)

## API Limits

Last.fm is very generous:
- **Rate Limit**: No official limit (be reasonable)
- **Usage Limit**: Unlimited
- **Cost**: FREE forever
- **Registration**: Simple and instant

## Security Best Practices

1. **Keep your API key private**: Don't commit it to version control
2. **Use environment variables**: Store in `.env` file
3. **Different keys for different environments**: Use separate keys for development and production

## Additional Resources

- [Last.fm API Documentation](https://www.last.fm/api)
- [Last.fm API Methods](https://www.last.fm/api/intro)
- [Last.fm Terms of Service](https://www.last.fm/legal/terms)

## Support

If you encounter issues:
1. Check the Last.fm API documentation
2. Verify your API key in your Last.fm account settings
3. Test with simple API calls to isolate issues
4. Check the JukeBoxd server logs for detailed error messages

## Migration from Apple Music

Your app will automatically work with Last.fm data:
- All existing ratings and reviews are preserved
- Album URLs now point to Last.fm instead of Apple Music
- Search results come from Last.fm's database
- No changes needed to your user data

**Cost: FREE forever! 🎉**