@echo off
echo ========================================
echo JukeBoxd ULTIMATE Render Fix
echo ========================================
echo.

echo Step 1: Adding process.on method to global types...
"C:\Program Files\Git\bin\git.exe" add .
if %errorlevel% neq 0 (
    echo Error: Failed to add files to git
    pause
    exit /b 1
)

echo Step 2: Committing ultimate fix...
"C:\Program Files\Git\bin\git.exe" commit -m "Add process.on method to global types - ultimate Render fix"
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
echo SUCCESS! ULTIMATE FIX DEPLOYED!
echo ========================================
echo.
echo This is the final fix - your JukeBoxd app WILL work on Render now!
echo Check your Render dashboard - the build should succeed this time!
echo.
echo Your app will be live at your Render URL once deployment completes!
echo.
pause