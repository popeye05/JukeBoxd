# 🚀 JukeBoxd Deployment Guide - Render (FREE, No Redis)

Deploy your JukeBoxd application to Render completely free! Since Render no longer offers free Redis, we'll deploy without it.

## Prerequisites

1. **GitHub Account**: Your code needs to be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com) (free)

## Step 1: Your Code Should Already Be on GitHub

If you successfully pushed your code earlier, skip to Step 2. Otherwise:

```cmd
git add .
git commit -m "JukeBoxd deployment ready"
git push -u origin main
```

## Step 2: Create Render Services

### 2.1 Create PostgreSQL Database (FREE)

1. Go to [render.com](https://render.com) and sign in
2. Click "New" → "PostgreSQL"
3. Configure:
   - **Name**: `jukeboxd-db`
   - **Database**: `jukeboxd`
   - **User**: `jukeboxd_user`
   - **Region**: Choose closest to you
   - **Plan**: **Free** (1 GB storage, expires in 90 days but can be renewed)
4. Click "Create Database"
5. **Save the External Database URL** (you'll need it later)

### 2.2 Create Web Service (FREE)

1. Click "New" → "Web Service"
2. Connect your GitHub repository:
   - **Repository**: `popeye05/jukeboxd`
   - **Branch**: `main`
3. Configure:
   - **Name**: `jukeboxd-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (512 MB RAM, sleeps after 15 min of inactivity)

## Step 3: Configure Environment Variables

In your web service settings, add these environment variables:

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=jukeboxd-super-secure-production-secret-2024-change-this
JWT_EXPIRES_IN=7d

# Database URL (get this from your PostgreSQL service dashboard)
DATABASE_URL=postgresql://jukeboxd_user:password@hostname:5432/jukeboxd

# NO REDIS - Leave this empty or remove it
REDIS_URL=

# Last.fm API (FREE - you already have this)
LASTFM_API_KEY=26ee2f684fce7981dc6b88e6264c4914

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### How to Get Database URL:

**PostgreSQL URL:**
1. Go to your PostgreSQL service dashboard
2. Copy the "External Database URL"
3. Use this as your `DATABASE_URL`

## Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build your TypeScript backend
   - Build your React frontend
   - Start the server
3. Wait for deployment to complete (5-10 minutes)

## Step 5: Access Your Application

1. Render will provide you with a URL like: `https://jukeboxd-app.onrender.com`
2. Your JukeBoxd app will be live!
3. Both frontend and backend are served from the same domain

## What Works Without Redis:

✅ **All core features work perfectly:**
- User authentication and registration
- Album search with Last.fm (12+ million albums)
- Rating and review system
- Social features (follow users, activity feed)
- Beautiful dark theme with JukeBoxd branding
- Mobile responsive design

❌ **What you lose without Redis:**
- Session caching (uses database instead - slightly slower but works fine)
- Rate limiting caching (still works, just uses memory)

## Free Tier Limitations

### What You Get FREE:
- ✅ **Web Service**: 512 MB RAM, sleeps after 15 min inactivity
- ✅ **PostgreSQL**: 1 GB storage, expires after 90 days (renewable)
- ✅ **Custom domain support**
- ✅ **Automatic SSL certificates**
- ✅ **Git-based deployments**

### Limitations:
- **Sleep Mode**: App sleeps after 15 minutes of inactivity (takes ~30 seconds to wake up)
- **Database Expiry**: Free PostgreSQL expires after 90 days (but you can create a new one)
- **Build Time**: Limited build minutes per month
- **Storage**: Limited database storage

## Step 6: Keep Your App Awake (Optional)

To prevent your app from sleeping, you can use a free service like:
- **UptimeRobot**: Pings your app every 5 minutes
- **Cron-job.org**: Free HTTP monitoring

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   ```bash
   # Check build logs in Render dashboard
   # Ensure all dependencies are in package.json
   ```

2. **Database Connection Issues**:
   ```bash
   # Verify DATABASE_URL format is correct
   # Check that PostgreSQL service is running
   ```

3. **App Won't Start**:
   ```bash
   # Check that PORT=10000 is set
   # Verify start command is "npm start"
   ```

4. **Redis Errors** (if any):
   ```bash
   # Make sure REDIS_URL is empty or not set
   # App will work fine without Redis
   ```

### Viewing Logs:
1. Go to Render dashboard
2. Click on your web service
3. Go to "Logs" tab to see real-time logs

## Cost: **100% FREE** 🎉

Perfect for testing, portfolios, and showing off your app!

## Next Steps

Once deployed:
1. **Test all features** on your live URL
2. **Set up monitoring** with UptimeRobot
3. **Add custom domain** (free with Render)
4. **Share your app** with friends!

## Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Community**: [community.render.com](https://community.render.com)
- **Status**: [status.render.com](https://status.render.com)