# JukeBoxd - Running Locally

## ✅ Current Status

### Backend Server
- **Status**: ✅ Running
- **URL**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Database**: ✅ Connected (PostgreSQL on port 5432)
- **Redis**: ✅ Connected (port 6379)

### Frontend Server
- **Status**: 🔄 Starting (compiling...)
- **URL**: http://localhost:3001 (will open automatically when ready)
- **Framework**: React 19 with TypeScript

### Docker Services
- **PostgreSQL**: ✅ Running on port 5432
- **PostgreSQL Test**: ✅ Running on port 5433
- **Redis**: ✅ Running on port 6379

## 🔧 Issues Fixed

1. ✅ Docker database setup and authentication
2. ✅ Database creation (`jukeboxd` and `jukeboxd_test`)
3. ✅ Database migration (all tables, indexes, triggers created)
4. ✅ TypeScript path aliases resolution
5. ✅ Backend server startup
6. ✅ React-scripts installation
7. ✅ Frontend port configuration (3001)
8. ✅ Test file TypeScript errors fixed

## 📝 What's Happening Now

The React frontend is currently compiling. This can take 2-5 minutes on the first run because:
- TypeScript needs to compile all components
- Webpack needs to bundle all dependencies
- React needs to process all JSX/TSX files

**You'll know it's ready when:**
- Your browser automatically opens to http://localhost:3001
- OR you see "Compiled successfully!" in the terminal

## 🚀 How to Use JukeBoxd

Once both servers are running:

1. **Open your browser** to http://localhost:3001
2. **Register a new account** or login
3. **Search for albums** using the Spotify integration
4. **Rate and review** albums (1-5 stars)
5. **Follow other users** to see their activity
6. **View your activity feed** to discover music

## 🛠️ Useful Commands

### Stop/Start Services

```bash
# Stop Docker databases
docker-compose down

# Start Docker databases
docker-compose up -d

# Check Docker status
docker-compose ps
```

### Backend Commands

```bash
# The backend is already running in the background
# To stop it, close the terminal or press Ctrl+C

# To restart manually:
npm run dev
```

### Frontend Commands

```bash
# The frontend is currently starting
# Once it's running, it will auto-reload on file changes

# To restart manually:
cd frontend
npm start
```

## 📊 API Endpoints

All API endpoints are available at `http://localhost:3000/api/`:

- **Auth**: `/api/auth/register`, `/api/auth/login`
- **Albums**: `/api/albums/search`, `/api/albums/:spotifyId`
- **Ratings**: `/api/ratings`
- **Reviews**: `/api/reviews`
- **Social**: `/api/social/follow`, `/api/social/followers/:userId`
- **Feed**: `/api/feed`

## ⚠️ Note About Spotify API

The Spotify API credentials in `.env` are placeholders:
```
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

To use real Spotify data:
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy your Client ID and Client Secret
4. Update the `.env` file with your credentials
5. Restart the backend server

## 🎉 Features Implemented

- ✅ User authentication (register/login/logout)
- ✅ Album search via Spotify API
- ✅ 5-star rating system
- ✅ Album reviews with text content
- ✅ User following system
- ✅ Activity feed (fanout-on-read pattern)
- ✅ User profiles with statistics
- ✅ Account deletion with data cleanup
- ✅ Comprehensive testing (16 property-based tests)
- ✅ Production-ready security (bcrypt, JWT)

## 🐛 Troubleshooting

### Frontend won't start
- Make sure port 3001 is not in use
- Try: `cd frontend && npm install && npm start`

### Backend won't connect to database
- Make sure Docker is running
- Check: `docker-compose ps`
- Restart: `docker-compose down && docker-compose up -d`

### "Module not found" errors
- Run: `npm install` in the root directory
- Run: `cd frontend && npm install`

## 📚 Next Steps

1. **Wait for frontend to finish compiling** (should be done soon!)
2. **Browser will auto-open** to http://localhost:3001
3. **Create an account** and start exploring
4. **Add Spotify credentials** for real album data (optional)

---

**Your JukeBoxd app is almost ready!** The frontend is still compiling but should be done in a few minutes. Watch for the "Compiled successfully!" message or your browser opening automatically.
