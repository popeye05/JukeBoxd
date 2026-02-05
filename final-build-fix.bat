@echo off
echo ========================================
echo JukeBoxd Final Build Fix Deployment
echo ========================================
echo.

echo Step 1: Adding TypeScript configuration fixes...
"C:\Program Files\Git\bin\git.exe" add .
if %errorlevel% neq 0 (
    echo Error: Failed to add files to git
    pause
    exit /b 1
)

echo Step 2: Committing TypeScript fixes...
"C:\Program Files\Git\bin\git.exe" commit -m "Fix TypeScript build errors - add Node.js types and Express Request import"
if %errorlevel% neq 0 (
    echo Note: No changes to commit or commit failed
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
echo SUCCESS! TypeScript fixes deployed!
echo ========================================
echo.
echo The build should now work on Render!
echo.
echo Next steps:
echo 1. Go to your Render dashboard
echo 2. Your web service should automatically redeploy
echo 3. Wait for the build to complete (5-10 minutes)
echo 4. Your JukeBoxd app will be live!
echo.
pause