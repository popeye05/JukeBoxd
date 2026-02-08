# Deployment Guide: JukeBoxd (Free Tier)

This guide explains how to deploy JukeBoxd for free using:
-   **Frontend**: Cloudflare Pages
-   **Backend**: Render.com
-   **Database**: Neon.tech (PostgreSQL)

## Prerequisites
-   GitHub Account (Push your code to a repository)
-   Accounts on Neon.tech, Render.com, and Cloudflare.

---

## Step 0: Push Changes to GitHub
Since you already have the repo, run these commands in your terminal:

```bash
# 1. Add all changes
git add .

# 2. Commit changes
git commit -m "Ready for deployment: Added deployment config and docs"

# 3. Push to main branch
git push origin main
```

> **Note**: If `git push` fails, you might need to pull first: `git pull origin main --rebase` or check your branch name (e.g., `master` vs `main`).

## Step 1: Database (Neon.tech)
1.  Log in to [Neon.tech](https://console.neon.tech/).
2.  Create a **New Project** named `jukeboxd`.
3.  Copy the **Connection String** provided on the dashboard.
    -   It looks like: `postgres://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require`

## Step 2: Backend (Render.com)
1.  Log in to [Render.com](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the service:
    -   **Name**: `jukeboxd-backend`
    -   **Region**: Closest to you.
    -   **Branch**: `main` (or your working branch).
    -   **Root Directory**: (Leave empty).
    -   **Runtime**: **Node**.
    -   **Build Command**: `npm install && npm run build:backend`
    -   **Start Command**: `npm start`
5.  Scroll down to **Environment Variables** and add:
    -   `DATABASE_URL`: (Paste Neon connection string from Step 1)
    -   `JWT_SECRET`: (Enter a long random string for security)
    -   `NODE_ENV`: `production`
    -   `PORT`: `10000`
    -   `FRONTEND_URL`: (Leave empty for now, or put `*` to allow all temporarily)
6.  Click **Create Web Service**.
7.  Wait for deployment. Copy the **Service URL** (e.g., `https://jukeboxd-backend.onrender.com`).

## Step 3: Frontend (Cloudflare Pages)
1.  Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3.  Select your GitHub repository.
4.  Configure Build Settings:
    -   **Project Name**: `jukeboxd`
    -   **Production branch**: `main`
    -   **Framework preset**: **Create React App**
    -   **Build command**: `npm run build`
    -   **Build output directory**: `build`
    -   **Root directory**: `frontend` (Click "Path filters" or "Root directory" setting to specify this. **Crucial!**)
5.  **Environment Variables**:
    -   `REACT_APP_API_URL`: `https://jukeboxd-backend.onrender.com/api` (The Render URL from Step 2 + `/api`)
    -   `NODE_VERSION`: `16` (or higher, e.g., `18`)
6.  Click **Save and Deploy**.

### Alternative: Manual Upload (Drag & Drop)
If you prefer not to connect GitHub to Cloudflare:
1.  **Backend MUST be running** (Step 1 & 2 are still required).
2.  On your computer, navigate to `frontend` folder.
3.  Create a file named `.env.production` in `frontend` folder.
4.  Add this line: `REACT_APP_API_URL=https://your-backend-url.onrender.com/api` (Replace with actual Backend URL).
5.  Run build command: `npm run build`.
6.  Go to [Cloudflare Pages](https://dash.cloudflare.com/) -> Create Application -> Upload Assets.
7.  Upload the `frontend/build` folder.

## Step 4: Finalize Configuration
1.  Once Cloudflare deploys, copy your site URL (e.g., `https://jukeboxd.pages.dev`).
2.  Go back to **Render Dashboard** -> **Environment Variables**.
3.  Update `FRONTEND_URL` to your Cloudflare URL (e.g., `https://jukeboxd.pages.dev`).
4.  Render will restart automatically.

## database Migration
The app will try to connect. You may need to run migrations.
Render console allows "Shell".
You can run: `npm run db:migrate` in the Render Shell.
Or set the `Build Command` to: `npm install && npm run build:backend && npm run db:migrate` (but be careful, this runs migrate on every build).
Better: Access Render Shell tab and run `node dist/scripts/migrate.js`.

✅ **Done!** Your app is live.
