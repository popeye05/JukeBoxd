@echo off
echo ========================================
echo JukeBoxd Render Build Fix
echo ========================================
echo.

echo Step 1: Adding Render-compatible TypeScript fixes...
"C:\Program Files\Git\bin\git.exe" add .
if %errorlevel% neq 0 (
    echo Error: Failed to add files to git
    pause
    exit /b 1
)

echo Step 2: Committing Render fixes...
"C:\Program Files\Git\bin\git.exe" commit -m "Fix Render build - remove Node types dependency and add explicit any types"
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
echo SUCCESS! Render build fix deployed!
echo ========================================
echo.
echo The build should now work on Render!
echo Your JukeBoxd app will be live soon!
echo.
pause