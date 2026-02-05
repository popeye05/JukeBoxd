@echo off
echo ========================================
echo JukeBoxd FORCE Deploy Script
echo ========================================
echo.
echo WARNING: This will override any changes on GitHub!
echo Only use this if you're sure your local code is correct.
echo.
set /p confirm="Are you sure you want to force push? (y/N): "
if /i not "%confirm%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

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
    echo Note: No changes to commit or commit failed
)

echo Step 3: Force pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push -f origin main
if %errorlevel% neq 0 (
    echo Error: Failed to force push to GitHub
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Build fixes force deployed to GitHub
echo ========================================
echo.
echo Next steps:
echo 1. Go to your Render dashboard
echo 2. Your web service should automatically redeploy
echo 3. Wait for the build to complete (5-10 minutes)
echo 4. Your app should now work at your Render URL
echo.
pause