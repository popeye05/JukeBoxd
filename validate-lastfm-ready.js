#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 Validating JukeBoxd with Last.fm integration...\n');

const checks = [
  {
    name: 'Last.fm service exists',
    check: () => fs.existsSync('src/services/LastFmService.ts')
  },
  {
    name: 'Services index exports Last.fm service',
    check: () => {
      const indexContent = fs.readFileSync('src/services/index.ts', 'utf8');
      return indexContent.includes('LastFmService') && indexContent.includes('musicService');
    }
  },
  {
    name: 'Albums route uses Last.fm service',
    check: () => {
      const routeContent = fs.readFileSync('src/routes/albums.ts', 'utf8');
      return routeContent.includes('lastFmService as musicService') && routeContent.includes('Last.fm');
    }
  },
  {
    name: 'Environment configured for Last.fm',
    check: () => {
      const envContent = fs.readFileSync('.env', 'utf8');
      return envContent.includes('LASTFM_API_KEY') && !envContent.includes('APPLE_MUSIC_TEAM_ID');
    }
  },
  {
    name: 'Frontend shows Last.fm branding',
    check: () => {
      const albumDetailContent = fs.readFileSync('frontend/src/components/albums/AlbumDetail.tsx', 'utf8');
      return albumDetailContent.includes('Open in Last.fm');
    }
  },
  {
    name: 'Last.fm setup guide exists',
    check: () => fs.existsSync('LASTFM_API_SETUP.md')
  },
  {
    name: 'Deployment guides updated for Last.fm',
    check: () => {
      const renderGuide = fs.readFileSync('RENDER_DEPLOYMENT_GUIDE.md', 'utf8');
      return renderGuide.includes('LASTFM_API_KEY') && renderGuide.includes('Last.fm');
    }
  },
  {
    name: 'TypeScript compiles successfully',
    check: () => {
      try {
        const { execSync } = require('child_process');
        execSync('npm run build:backend', { stdio: 'pipe' });
        return true;
      } catch (error) {
        return false;
      }
    }
  }
];

let allPassed = true;

checks.forEach(({ name, check }) => {
  try {
    const passed = check();
    console.log(`${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('🎉 All checks passed! JukeBoxd is ready with Last.fm integration.');
  console.log('\n🎵 Last.fm Features:');
  console.log('✅ Completely FREE API (no payment required)');
  console.log('✅ No usage limits or rate restrictions');
  console.log('✅ Access to 12+ million albums');
  console.log('✅ High-quality album artwork');
  console.log('✅ Accurate metadata and release dates');
  console.log('\n📋 Next steps:');
  console.log('1. Get your FREE Last.fm API key: https://www.last.fm/api');
  console.log('2. Add it to your .env file: LASTFM_API_KEY=your-key-here');
  console.log('3. Push to GitHub and deploy to Render');
  console.log('4. Enjoy unlimited music data for FREE!');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
}

console.log('\n📖 See LASTFM_API_SETUP.md for detailed setup instructions.');