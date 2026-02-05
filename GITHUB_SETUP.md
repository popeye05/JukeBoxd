# 📁 GitHub Setup for popeye05 Account

Quick guide to push your JukeBoxd code to your popeye05 GitHub account.

## Step 1: Create Repository on GitHub

1. Go to [github.com](https://github.com) and sign in to **popeye05** account
2. Click "New repository" (green button)
3. Repository settings:
   - **Repository name**: `jukeboxd`
   - **Description**: `Social music discovery web application - Letterboxd for music`
   - **Visibility**: Public (recommended) or Private
   - **Don't** initialize with README (your code already has one)
4. Click "Create repository"

## Step 2: Push Your Code

Run these commands in your JukeBoxd folder:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial JukeBoxd commit - ready for deployment"

# Add your GitHub repository as remote
git remote add origin https://github.com/popeye05/jukeboxd.git

# Push to GitHub
git push -u origin main
```

## Step 3: Verify Upload

1. Go to `https://github.com/popeye05/jukeboxd`
2. You should see all your files including:
   - `package.json`
   - `src/` folder
   - `frontend/` folder
   - `RENDER_DEPLOYMENT_GUIDE.md`
   - `deploy-to-render.md`

## Troubleshooting

### If you get authentication errors:

**Option 1: Use GitHub CLI (recommended)**
```bash
# Install GitHub CLI first: https://cli.github.com/
gh auth login
git push -u origin main
```

**Option 2: Use Personal Access Token**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with repo permissions
3. Use token as password when prompted

**Option 3: Use GitHub Desktop**
1. Download GitHub Desktop
2. Clone your repository
3. Copy your files into the cloned folder
4. Commit and push through the GUI

## Next Steps

Once your code is on GitHub:
1. Follow `deploy-to-render.md` for deployment
2. Your app will be live at `https://jukeboxd-app.onrender.com`
3. Share your live JukeBoxd app with the world! 🎵