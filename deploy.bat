@echo off
echo 🚀 JukeBoxd Deployment Script
echo ================================

echo Step 1: Testing Git installation...
git --version
if %errorlevel% neq 0 (
    echo ❌ Git not found! Please:
    echo 1. Close this Command Prompt
    echo 2. Open a NEW Command Prompt
    echo 3. Run this script again
    pause
    exit /b 1
)

echo ✅ Git is working!
echo.

echo Step 2: Setting up Git configuration...
git config --global user.name "popeye05"
git config --global user.email "your.email@example.com"

echo Step 3: Initializing Git repository...
git init

echo Step 4: Adding all files...
git add .

echo Step 5: Creating initial commit...
git commit -m "Initial JukeBoxd deployment - Ready for production"

echo Step 6: Adding GitHub remote...
git remote add origin https://github.com/popeye05/jukeboxd.git

echo Step 7: Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo 🎉 SUCCESS! Your code is now on GitHub!
echo.
echo Next steps:
echo 1. Go to render.com and sign up
echo 2. Create PostgreSQL database (free)
echo 3. Create Redis database (free)  
echo 4. Create Web Service connected to your GitHub repo
echo 5. Your app will be live!
echo.
echo See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions.
pause