@echo off
echo 🔧 Fixing GitHub Push Error
echo =============================

echo Step 1: Pulling any existing content from GitHub...
git pull origin main --allow-unrelated-histories

echo Step 2: Pushing your code to GitHub...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo 🎉 SUCCESS! Your code is now on GitHub!
    echo.
    echo Your repository: https://github.com/popeye05/jukeboxd
    echo.
    echo Next steps:
    echo 1. Go to render.com and sign up
    echo 2. Create PostgreSQL database ^(free^)
    echo 3. Create Redis database ^(free^)  
    echo 4. Create Web Service connected to your GitHub repo
    echo 5. Your app will be live!
    echo.
    echo See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions.
) else (
    echo ❌ Still having issues. Let's try a different approach...
    echo.
    echo Alternative: Force push ^(this will overwrite any existing content^)
    echo Run: git push -f origin main
    echo.
    echo Or delete the GitHub repository and create a new empty one.
)

pause