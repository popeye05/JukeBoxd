# 🚀 JukeBoxd Deployment Guide - Railway

This guide will help you deploy your JukeBoxd application to Railway with PostgreSQL and Redis databases.

## Prerequisites

1. **GitHub Account**: Your code needs to be in a GitHub repository
2. **Railway Account**: Sign up at [railway.app](https://railway.app)

## Step 1: Push Your Code to GitHub

1. Create a new repository on GitHub (if you haven't already)
2. Push your JukeBoxd code to the repository:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your JukeBoxd repository
5. Railway will automatically detect it's a Node.js project

## Step 3: Add Databases

### Add PostgreSQL Database:
1. In your Railway project dashboard, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will create a PostgreSQL instance

### Add Redis Database:
1. Click "New Service" again
2. Select "Database" → "Redis"
3. Railway will create a Redis instance

## Step 4: Configure Environment Variables

In your Railway project dashboard, go to your main service (the Node.js app) and add these environment variables:

### Required Variables:
```env
NODE_ENV=production
PORT=$PORT
JWT_SECRET=your-super-secure-jwt-secret-for-production-change-this
JWT_EXPIRES_IN=7d

# Database URLs (Railway will provide these automatically)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Apple Music API (use demo mode for now)
APPLE_MUSIC_TEAM_ID=demo-mode
APPLE_MUSIC_KEY_ID=demo-mode
APPLE_MUSIC_PRIVATE_KEY=demo-mode

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Important Notes:
- `$PORT` is automatically provided by Railway
- `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}` are automatically linked to your databases
- The Apple Music credentials are set to demo mode, so your app will use mock data

## Step 5: Deploy

1. Railway will automatically deploy when you push to your main branch
2. The deployment process will:
   - Install backend dependencies
   - Install frontend dependencies
   - Build the TypeScript backend
   - Build the React frontend
   - Start the server

## Step 6: Run Database Migrations

After your first deployment:

1. Go to your Railway project dashboard
2. Click on your main service
3. Go to the "Deploy" tab
4. Click "View Logs" to see if the deployment was successful
5. If successful, you can run migrations by adding a one-time script

## Step 7: Access Your Application

1. Railway will provide you with a public URL (something like `https://your-app-name.up.railway.app`)
2. Your application will be accessible at this URL
3. Both frontend and backend are served from the same domain

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check the build logs in Railway dashboard
   - Ensure all dependencies are in package.json
   - Verify TypeScript compilation works locally

2. **Database Connection Issues**:
   - Verify DATABASE_URL and REDIS_URL are properly linked
   - Check that the database services are running

3. **Frontend Not Loading**:
   - Ensure the build process completed successfully
   - Check that static files are being served correctly

4. **API Errors**:
   - Verify environment variables are set correctly
   - Check application logs in Railway dashboard

### Viewing Logs:
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deploy" tab
4. Click "View Logs" to see real-time logs

## Demo Mode Features

Your app will run in demo mode with:
- ✅ Full user authentication and registration
- ✅ Album search with 12 classic albums (Beatles, Pink Floyd, etc.)
- ✅ Rating and review system
- ✅ Social features (follow users, activity feed)
- ✅ Beautiful Letterboxd-inspired dark theme
- ✅ Responsive design for mobile and desktop

## Next Steps

Once deployed successfully, you can:

1. **Custom Domain**: Add your own domain in Railway settings
2. **Real Apple Music API**: Configure real Apple Music credentials for live music data
3. **Monitoring**: Set up monitoring and alerts
4. **Scaling**: Railway automatically scales based on usage

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month for the app service
- **PostgreSQL**: ~$5/month for small database
- **Redis**: ~$3/month for small cache
- **Total**: ~$13/month for a production-ready deployment

## Support

If you encounter issues:
1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Review application logs in Railway dashboard
3. Test locally first to isolate deployment-specific issues