# 🚀 Quick Render Deployment Steps (FREE)

Follow these steps to deploy your JukeBoxd app to Render for **FREE**:

## 1. Push to GitHub (popeye05 account)

```bash
git init
git add .
git commit -m "Ready for Render deployment"
git remote add origin https://github.com/popeye05/jukeboxd.git
git push -u origin main
```

## 2. Create Render Account & Services

1. **Sign up**: Go to [render.com](https://render.com) (free account)

2. **Create PostgreSQL** (FREE):
   - New → PostgreSQL
   - Name: `jukeboxd-db`
   - Plan: **Free**
   - Save the Database URL

3. **Create Redis** (FREE):
   - New → Redis  
   - Name: `jukeboxd-redis`
   - Plan: **Free**
   - Save the Redis URL

4. **Create Web Service** (FREE):
   - New → Web Service
   - Connect: `popeye05/jukeboxd`
   - Name: `jukeboxd-app`
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Plan: **Free**

## 3. Add Environment Variables

In your web service settings, add:

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=change-this-super-secure-secret-now
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
LASTFM_API_KEY=your-free-lastfm-api-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

**Get the real DATABASE_URL and REDIS_URL from your Render database dashboards!**

## 4. Deploy & Test

- Render will auto-deploy from GitHub
- Get your URL: `https://jukeboxd-app.onrender.com`
- Test your live JukeBoxd app! 🎵

## What You Get (FREE):

✅ **Full JukeBoxd app** with all features  
✅ **PostgreSQL database** (1GB, renewable every 90 days)  
✅ **Redis cache** (25MB)  
✅ **Custom domain support**  
✅ **SSL certificates**  
✅ **Demo Last.fm** with 12 classic albums  

## Limitations:

⚠️ **Sleeps after 15 min** (wakes up in ~30 seconds)  
⚠️ **Database expires** after 90 days (create new one)  
⚠️ **Limited resources** (512MB RAM)  

## Keep It Awake (Optional):

Use **UptimeRobot** (free) to ping your app every 5 minutes and prevent sleeping.

## Cost: **$0/month** 🎉

Perfect for testing and portfolios!