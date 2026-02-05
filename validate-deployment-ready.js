#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating JukeBoxd deployment readiness...\n');

const checks = [
  {
    name: 'package.json has correct scripts',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts.build && pkg.scripts.start && pkg.scripts.postinstall;
    }
  },
  {
    name: 'Frontend package.json exists',
    check: () => fs.existsSync('frontend/package.json')
  },
  {
    name: 'Railway config exists',
    check: () => fs.existsSync('railway.json')
  },
  {
    name: 'Procfile exists',
    check: () => fs.existsSync('Procfile')
  },
  {
    name: 'Frontend production env exists',
    check: () => fs.existsSync('frontend/.env.production')
  },
  {
    name: 'Server.ts has static file serving',
    check: () => {
      const serverContent = fs.readFileSync('src/server.ts', 'utf8');
      return serverContent.includes('express.static') && serverContent.includes('frontend/build');
    }
  },
  {
    name: 'API service has production config',
    check: () => {
      const apiContent = fs.readFileSync('frontend/src/services/api.ts', 'utf8');
      return apiContent.includes('/api') && apiContent.includes('NODE_ENV');
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

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Your app is ready for Railway deployment.');
  console.log('\nNext steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Follow the steps in deploy-to-railway.md');
  console.log('3. Your app will be live with demo Apple Music data!');
} else {
  console.log('❌ Some checks failed. Please fix the issues above before deploying.');
}

console.log('\n📖 See DEPLOYMENT_GUIDE.md for detailed instructions.');