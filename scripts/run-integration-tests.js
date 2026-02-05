#!/usr/bin/env node

/**
 * Integration Test Runner
 * 
 * This script runs the complete integration test suite for JukeBoxd,
 * including backend API tests, frontend component tests, and end-to-end tests.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${message}`, colors.cyan + colors.bright);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logStep(message) {
  log(`\n${colors.blue}▶ ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkPrerequisites() {
  logStep('Checking prerequisites...');

  // Check if .env.test exists
  const envTestPath = path.join(process.cwd(), '.env.test');
  if (!fs.existsSync(envTestPath)) {
    logWarning('.env.test file not found. Creating from .env.example...');
    
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envTestPath);
      logSuccess('Created .env.test from .env.example');
    } else {
      logError('.env.example not found. Please create .env.test manually.');
      process.exit(1);
    }
  }

  // Check if test database is configured
  const envContent = fs.readFileSync(envTestPath, 'utf8');
  if (!envContent.includes('DATABASE_URL') || !envContent.includes('REDIS_URL')) {
    logWarning('Please ensure DATABASE_URL and REDIS_URL are configured in .env.test');
  }

  logSuccess('Prerequisites checked');
}

async function setupTestEnvironment() {
  logStep('Setting up test environment...');

  try {
    // Install dependencies if needed
    if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
      logStep('Installing dependencies...');
      await runCommand('npm', ['install']);
      logSuccess('Dependencies installed');
    }

    // Run database migrations for test environment
    logStep('Running database migrations...');
    await runCommand('npm', ['run', 'migrate'], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    logSuccess('Database migrations completed');

  } catch (error) {
    logError(`Test environment setup failed: ${error.message}`);
    throw error;
  }
}

async function runBackendIntegrationTests() {
  logStep('Running backend integration tests...');

  try {
    await runCommand('npx', [
      'jest',
      '--config=jest.integration.config.js',
      '--testPathPattern=src/tests/integration',
      '--verbose',
      '--coverage',
      '--coverageDirectory=coverage/backend-integration'
    ], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    logSuccess('Backend integration tests completed');
  } catch (error) {
    logError(`Backend integration tests failed: ${error.message}`);
    throw error;
  }
}

async function runFrontendIntegrationTests() {
  logStep('Running frontend integration tests...');

  try {
    await runCommand('npx', [
      'jest',
      '--config=jest.integration.config.js',
      '--testPathPattern=frontend/src/tests/integration',
      '--verbose',
      '--coverage',
      '--coverageDirectory=coverage/frontend-integration'
    ], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    logSuccess('Frontend integration tests completed');
  } catch (error) {
    logError(`Frontend integration tests failed: ${error.message}`);
    throw error;
  }
}

async function runPropertyBasedTests() {
  logStep('Running property-based integration tests...');

  try {
    await runCommand('npx', [
      'jest',
      '--config=jest.integration.config.js',
      '--testNamePattern=Property-Based',
      '--verbose'
    ], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    logSuccess('Property-based integration tests completed');
  } catch (error) {
    logError(`Property-based integration tests failed: ${error.message}`);
    throw error;
  }
}

async function generateCoverageReport() {
  logStep('Generating coverage report...');

  try {
    // Merge coverage reports
    await runCommand('npx', [
      'nyc',
      'merge',
      'coverage',
      'coverage/merged-coverage.json'
    ]);

    // Generate HTML report
    await runCommand('npx', [
      'nyc',
      'report',
      '--reporter=html',
      '--reporter=text-summary',
      '--temp-dir=coverage',
      '--report-dir=coverage/html'
    ]);

    logSuccess('Coverage report generated in coverage/html/');
  } catch (error) {
    logWarning(`Coverage report generation failed: ${error.message}`);
  }
}

async function runIntegrationTestSuite() {
  const startTime = Date.now();
  
  logHeader('JukeBoxd Integration Test Suite');
  log(`Started at: ${new Date().toISOString()}`, colors.blue);

  try {
    await checkPrerequisites();
    await setupTestEnvironment();
    
    logHeader('Running Integration Tests');
    
    // Run tests in sequence to avoid database conflicts
    await runBackendIntegrationTests();
    await runFrontendIntegrationTests();
    await runPropertyBasedTests();
    
    await generateCoverageReport();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logHeader('Integration Tests Completed Successfully');
    logSuccess(`Total duration: ${duration} seconds`);
    log(`Completed at: ${new Date().toISOString()}`, colors.green);
    
    // Display coverage summary
    logStep('Coverage Summary:');
    log('📊 Detailed coverage report available in coverage/html/index.html', colors.blue);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logHeader('Integration Tests Failed');
    logError(`Error: ${error.message}`);
    logError(`Duration: ${duration} seconds`);
    log(`Failed at: ${new Date().toISOString()}`, colors.red);
    
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('JukeBoxd Integration Test Runner', colors.bright);
  log('\nUsage: node scripts/run-integration-tests.js [options]');
  log('\nOptions:');
  log('  --help, -h     Show this help message');
  log('  --backend      Run only backend integration tests');
  log('  --frontend     Run only frontend integration tests');
  log('  --property     Run only property-based tests');
  log('  --coverage     Generate coverage report only');
  log('\nExamples:');
  log('  node scripts/run-integration-tests.js');
  log('  node scripts/run-integration-tests.js --backend');
  log('  node scripts/run-integration-tests.js --frontend --coverage');
  process.exit(0);
}

// Run specific test suites based on arguments
async function main() {
  try {
    await checkPrerequisites();
    
    if (args.includes('--backend')) {
      await setupTestEnvironment();
      await runBackendIntegrationTests();
    } else if (args.includes('--frontend')) {
      await setupTestEnvironment();
      await runFrontendIntegrationTests();
    } else if (args.includes('--property')) {
      await setupTestEnvironment();
      await runPropertyBasedTests();
    } else if (args.includes('--coverage')) {
      await generateCoverageReport();
    } else {
      await runIntegrationTestSuite();
    }
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();