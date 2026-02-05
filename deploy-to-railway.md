# 🚀 Quick Railway Deployment Steps

Follow these steps to deploy your JukeBoxd app to Railway:

## 1. Push to GitHub (if not already done)

```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

## 2. Deploy to Railway

1. **Go to Railway**: Visit [railway.app](https://railway.app)
2. **Sign in** with your GitHub account
3. **New Project** → **Deploy from GitHub repo**
4. **Select** your JukeBoxd repository
5. **Wait** for initial deployment (may fail - that's normal)

## 3. Add Databases

**Add PostgreSQL:**
- Click "New Service" → "Database" → "PostgreSQL"

**Add Redis:**
- Click "New Service" → "Database" → "Redis"

## 4. Configure Environment Variables

Click on your main service, go to "Variables" tab, and add:

```
NODE_ENV=production
JWT_SECRET=your-super-secure-production-jwt-secret-change-this
JWT_EXPIRES_IN=7d
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
APPLE_MUSIC_TEAM_ID=demo-mode
APPLE_MUSIC_KEY_ID=demo-mode
APPLE_MUSIC_PRIVATE_KEY=demo-mode
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## 5. Redeploy

- Go to "Deployments" tab
- Click "Deploy Latest"
- Wait for build to complete

## 6. Test Your App

- Railway will give you a URL like `https://your-app.up.railway.app`
- Your JukeBoxd app will be live with demo Apple Music data!

## What You'll Get

✅ **Full-stack app** running on one domain  
✅ **PostgreSQL database** for user data  
✅ **Redis cache** for performance  
✅ **Demo mode** with 12 classic albums  
✅ **All features working**: auth, ratings, reviews, social  
✅ **Beautiful dark theme** with your JukeBoxd branding  

## Cost: ~$13/month

Perfect for testing and showing off your app! 🎵