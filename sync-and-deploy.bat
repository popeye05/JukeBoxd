@echo off
echo ========================================
echo JukeBoxd Sync and Deploy Script
echo ========================================
echo.

echo Step 1: Pulling latest changes from GitHub...
"C:\Program Files\Git\bin\git.exe" pull origin main
if %errorlevel% neq 0 (
    echo Error: Failed to pull from GitHub
    echo This might be due to merge conflicts.
    echo Please resolve any conflicts manually.
    pause
    exit /b 1
)

echo Step 2: Adding all changes to git...
"C:\Program Files\Git\bin\git.exe" add .
if %errorlevel% neq 0 (
    echo Error: Failed to add files to git
    pause
    exit /b 1
)

echo Step 3: Committing changes...
"C:\Program Files\Git\bin\git.exe" commit -m "Fix build issues - exclude test files and fix React hooks"
if %errorlevel% neq 0 (
    echo Note: No changes to commit or commit failed
    echo Checking if there are any changes to push...
)

echo Step 4: Pushing to GitHub...
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