# 🚀 Complete JukeBoxd Deployment Steps

## Quick Deployment Checklist

### Step 1: Push to GitHub (5 minutes)
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit your changes
git commit -m "JukeBoxd - Ready for deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/popeye05/jukeboxd.git

# Push to GitHub
git push -u origin main
```

### Step 2: Create Render Account (2 minutes)
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account (free)
3. Verify your email

### Step 3: Create Database Services (5 minutes)

**PostgreSQL Database:**
1. Click "New" → "PostgreSQL"
2. Name: `jukeboxd-db`
3. Database: `jukeboxd`
4. User: `jukeboxd_user`
5. Plan: **Free**
6. Click "Create Database"
7. **Copy the External Database URL** (save it!)

**Redis Database:**
1. Click "New" → "Redis"
2. Name: `jukeboxd-redis`
3. Plan: **Free**
4. Click "Create Redis"
5. **Copy the Redis URL** (save it!)

### Step 4: Create Web Service (5 minutes)
1. Click "New" → "Web Service"
2. Connect GitHub: `popeye05/jukeboxd`
3. Configure:
   - **Name**: `jukeboxd-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

### Step 5: Set Environment Variables (3 minutes)
Add these in your web service settings:

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=jukeboxd-super-secure-production-secret-2024
JWT_EXPIRES_IN=7d

# Replace with your actual database URLs from Step 3
DATABASE_URL=postgresql://jukeboxd_user:password@hostname:5432/jukeboxd
REDIS_URL=redis://red-xxxxx:6379

# Your Last.fm API key (already working)
LASTFM_API_KEY=26ee2f684fce7981dc6b88e6264c4914

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### Step 6: Deploy (10 minutes)
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Your app will be live at: `https://jukeboxd-app.onrender.com`

## Total Time: ~30 minutes
## Cost: **100% FREE** 🎉

## What You'll Have:
- ✅ Live JukeBoxd app with your custom domain
- ✅ Full user registration and authentication
- ✅ Real Last.fm album search (12+ million albums)
- ✅ Rating and review system
- ✅ Social features (follow users, activity feed)
- ✅ Beautiful dark theme with your JukeBoxd branding
- ✅ Mobile responsive design

## After Deployment:
1. Test all features on your live URL
2. Share your app with friends!
3. Add to your portfolio/resume