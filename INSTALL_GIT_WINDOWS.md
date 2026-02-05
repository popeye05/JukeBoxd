# 🔧 Install Git on Windows

## Method 1: Download Git for Windows (Recommended)

### Step 1: Download Git
1. Go to [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Click "Download for Windows" 
3. The download will start automatically (64-bit version)

### Step 2: Install Git
1. Run the downloaded `.exe` file
2. **Important Installation Options:**
   - ✅ **Use Git from the Windows Command Prompt** (select this!)
   - ✅ **Use the OpenSSL library**
   - ✅ **Checkout Windows-style, commit Unix-style line endings**
   - ✅ **Use Windows' default console window**
3. Click "Next" through all other options (defaults are fine)
4. Click "Install"

### Step 3: Verify Installation
Open **Command Prompt** (cmd) and type:
```cmd
git --version
```
You should see something like: `git version 2.42.0.windows.1`

## Method 2: Using Chocolatey (If you have it)

```cmd
choco install git
```

## Method 3: Using Winget (Windows 10/11)

```cmd
winget install --id Git.Git -e --source winget
```

## After Installation

**Restart your Command Prompt** and you'll be able to use git commands!

## Quick Test
```cmd
git --version
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## Next: Deploy to GitHub + Render

Once Git is installed, you can deploy your JukeBoxd app:

1. **Push to GitHub** (5 minutes)
2. **Deploy to Render** (15 minutes)
3. **Your app will be live!** 🚀

Total time: ~20 minutes after Git installation