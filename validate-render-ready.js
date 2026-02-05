#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 Validating JukeBoxd for Render deployment...\n');

const checks = [
  {
    name: 'package.json has build and start scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts.build && pkg.scripts.start && pkg.scripts['build:backend'] && pkg.scripts['build:frontend'];
    }
  },
  {
    name: 'Server serves static files in production',
    check: () => {
      const serverContent = fs.readFileSync('src/server.ts', 'utf8');
      return serverContent.includes('express.static') && serverContent.includes('NODE_ENV === \'production\'');
    }
  },
  {
    name: 'Frontend API configured for production',
    check: () => {
      const apiContent = fs.readFileSync('frontend/src/services/api.ts', 'utf8');
      return apiContent.includes('/api') && apiContent.includes('NODE_ENV');
    }
  },
  {
    name: 'Frontend production env exists',
    check: () => fs.existsSync('frontend/.env.production')
  },
  {
    name: 'Render config exists',
    check: () => fs.existsSync('render.yaml')
  },
  {
    name: 'Demo mode configured',
    check: () => {
      const serviceContent = fs.readFileSync('src/services/TidalService.ts', 'utf8');
      return serviceContent.includes('Apple Music Service running in DEMO MODE') && serviceContent.includes('MOCK_ALBUMS');
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
  console.log('🎉 All checks passed! Ready for Render deployment.');
  console.log('\n📋 Next steps:');
  console.log('1. Push to GitHub: https://github.com/popeye05/jukeboxd');
  console.log('2. Follow deploy-to-render.md for step-by-step guide');
  console.log('3. Your app will be live at: https://jukeboxd-app.onrender.com');
  console.log('\n💰 Cost: FREE (with some limitations)');
  console.log('🎵 Features: Full JukeBoxd with demo Apple Music data');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
}

console.log('\n📖 See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions.');