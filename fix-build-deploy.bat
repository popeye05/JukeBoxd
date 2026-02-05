@echo off
echo ========================================
echo JukeBoxd Build Fix Deployment Script
echo ========================================
echo.

echo Step 1: Adding all changes to git...
"C:\Program Files\Git\bin\git.exe" add .
if %errorlevel% neq 0 (
    echo Error: Failed to add files to git
    pause
    exit /b 1
)

echo Step 2: Committing changes...
"C:\Program Files\Git\bin\git.exe" commit -m "Fix build issues - exclude test files and fix React hooks"
if %errorlevel% neq 0 (
    echo Error: Failed to commit changes
    pause
    exit /b 1
)

echo Step 3: Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push origin main
if %errorlevel% neq 0 (
    echo Error: Failed to push to GitHub
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Build fixes deployed to GitHub
echo ========================================
echo.
echo Next steps:
echo 1. Go to your Render dashboard
echo 2. Your web service should automatically redeploy
echo 3. Wait for the build to complete (5-10 minutes)
echo 4. Your app should now work at your Render URL
echo.
pause