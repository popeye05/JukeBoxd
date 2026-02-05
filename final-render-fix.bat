@echo off
echo ========================================
echo JukeBoxd FINAL Render Fix
echo ========================================
echo.

echo Step 1: Adding global type declarations fix...
"C:\Program Files\Git\bin\git.exe" add .
if %errorlevel% neq 0 (
    echo Error: Failed to add files to git
    pause
    exit /b 1
)

echo Step 2: Committing final fix...
"C:\Program Files\Git\bin\git.exe" commit -m "Add global type declarations for Node.js - final Render deployment fix"
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
echo SUCCESS! FINAL FIX DEPLOYED!
echo ========================================
echo.
echo Your JukeBoxd app should now build successfully on Render!
echo Check your Render dashboard for the deployment status.
echo.
echo Once deployed, your app will be live at your Render URL!
echo.
pause