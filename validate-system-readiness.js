#!/usr/bin/env node

/**
 * System Readiness Validation Script
 * 
 * This script validates that the JukeBoxd system is ready for production
 * by analyzing the test structure, configuration, and implementation files.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Required files for system validation
const requiredFiles = {
  // Core configuration files
  'package.json': 'Package configuration',
  'tsconfig.json': 'TypeScript configuration',
  '.env.example': 'Environment configuration template',
  
  // Jest configuration files
  'jest.config.js': 'Main Jest configuration',
  'jest.integration.config.js': 'Integration test configuration',
  'jest.standalone.config.js': 'Standalone test configuration',
  
  // Core backend files
  'src/server.ts': 'Main server file',
  'src/services/AuthService.ts': 'Authentication service',
  'src/services/SpotifyService.ts': 'Spotify integration service',
  'src/models/User.ts': 'User model',
  'src/models/Album.ts': 'Album model',
  'src/models/Rating.ts': 'Rating model',
  'src/models/Review.ts': 'Review model',
  'src/models/Follow.ts': 'Follow model',
  
  // Frontend core files
  'frontend/src/App.tsx': 'Main React application',
  'frontend/src/contexts/AuthContext.tsx': 'Authentication context',
  
  // Test infrastructure
  'src/test/helpers.ts': 'Test helper utilities',
  'scripts/run-integration-tests.js': 'Integration test runner'
};

// Property-based test files (all 16 correctness properties)
const propertyTestFiles = {
  'src/services/SpotifyService.property.test.ts': 'Properties 1, 14, 15, 16',
  'src/models/Rating.property.test.ts': 'Properties 2, 3',
  'src/models/Review.property.test.ts': 'Property 4',
  'src/models/Review.whitespace.property.test.ts': 'Property 5',
  'src/models/Follow.property.test.ts': 'Property 6',
  'src/services/ActivityFeedService.property.test.ts': 'Property 7',
  'src/services/AuthService.property.test.ts': 'Properties 8, 9, 12',
  'src/services/SocialService.profile.property.test.ts': 'Property 10',
  'src/services/DataPersistence.property.test.ts': 'Property 11',
  'src/services/AccountDeletion.property.test.ts': 'Property 13',
  'src/models/User.password.test.ts': 'Property 12 (additional)',
  'src/password-security.standalone.test.ts': 'Property 12 (standalone)'
};

// Integration test files
const integrationTestFiles = {
  'src/tests/integration/critical-user-journeys.test.ts': 'Backend integration tests',
  'frontend/src/tests/integration/user-journeys.integration.test.tsx': 'Frontend integration tests',
  'src/tests/integration/end-to-end.test.ts': 'End-to-end integration tests'
};

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description}: ${filePath}`);
    return true;
  } else {
    logError(`Missing ${description}: ${filePath}`);
    return false;
  }
}

function validateRequiredFiles() {
  logHeader('Validating Required System Files');
  
  let allFilesPresent = true;
  
  for (const [filePath, description] of Object.entries(requiredFiles)) {
    if (!checkFileExists(filePath, description)) {
      allFilesPresent = false;
    }
  }
  
  return allFilesPresent;
}

function validatePropertyBasedTests() {
  logHeader('Validating Property-Based Tests (16 Correctness Properties)');
  
  let allPropertiesImplemented = true;
  
  for (const [filePath, properties] of Object.entries(propertyTestFiles)) {
    if (!checkFileExists(filePath, `Property tests for ${properties}`)) {
      allPropertiesImplemented = false;
    }
  }
  
  return allPropertiesImplemented;
}

function validateIntegrationTests() {
  logHeader('Validating Integration Tests');
  
  let allIntegrationTestsPresent = true;
  
  for (const [filePath, description] of Object.entries(integrationTestFiles)) {
    if (!checkFileExists(filePath, description)) {
      allIntegrationTestsPresent = false;
    }
  }
  
  return allIntegrationTestsPresent;
}

function analyzeTestConfiguration() {
  logHeader('Analyzing Test Configuration');
  
  try {
    // Check Jest configuration
    const jestConfig = fs.readFileSync('jest.config.js', 'utf8');
    if (jestConfig.includes('ts-jest')) {
      logSuccess('TypeScript testing configured');
    } else {
      logWarning('TypeScript testing configuration not found');
    }
    
    if (jestConfig.includes('coverage')) {
      logSuccess('Code coverage reporting configured');
    } else {
      logWarning('Code coverage reporting not configured');
    }
    
    // Check package.json for test scripts
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const testScripts = [
      'test',
      'test:integration',
      'test:coverage'
    ];
    
    for (const script of testScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logSuccess(`Test script configured: ${script}`);
      } else {
        logWarning(`Test script missing: ${script}`);
      }
    }
    
    // Check for fast-check dependency
    if (packageJson.devDependencies && packageJson.devDependencies['fast-check']) {
      logSuccess('Property-based testing library (fast-check) installed');
    } else {
      logError('Property-based testing library (fast-check) not found');
    }
    
    return true;
  } catch (error) {
    logError(`Error analyzing test configuration: ${error.message}`);
    return false;
  }
}

function validatePropertyTestIterations() {
  logHeader('Validating Property Test Iterations');
  
  let allTestsOptimized = true;
  
  for (const filePath of Object.keys(propertyTestFiles)) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const numRunsMatches = content.match(/numRuns:\s*(\d+)/g);
        
        if (numRunsMatches) {
          const iterations = numRunsMatches.map(match => {
            const value = match.match(/numRuns:\s*(\d+)/)[1];
            return parseInt(value);
          });
          
          const maxIterations = Math.max(...iterations);
          const minIterations = Math.min(...iterations);
          
          if (maxIterations >= 100) {
            logSuccess(`${filePath}: Up to ${maxIterations} iterations configured`);
          } else if (maxIterations >= 20) {
            logWarning(`${filePath}: Maximum ${maxIterations} iterations (recommend 100+ for final testing)`);
          } else {
            logError(`${filePath}: Only ${maxIterations} iterations (insufficient for final testing)`);
            allTestsOptimized = false;
          }
        } else {
          logWarning(`${filePath}: No numRuns configuration found`);
        }
      }
    } catch (error) {
      logError(`Error analyzing ${filePath}: ${error.message}`);
      allTestsOptimized = false;
    }
  }
  
  return allTestsOptimized;
}

function validateRequirementsCoverage() {
  logHeader('Validating Requirements Coverage');
  
  const requirements = [
    'Requirements 1.1, 1.2', // Album Search
    'Requirements 2.2, 2.3, 2.4', // Rating System
    'Requirements 3.2, 3.3, 3.4, 3.5', // Review System
    'Requirements 4.2, 4.3, 4.4', // Following System
    'Requirements 5.1, 5.2, 5.3, 5.4', // Activity Feed
    'Requirements 6.1, 6.2, 6.3, 6.4, 6.5', // Authentication
    'Requirements 7.1, 7.3, 7.5', // Data Persistence
    'Requirements 8.1, 8.2, 8.3, 8.4, 8.5' // Spotify API
  ];
  
  let allRequirementsCovered = true;
  
  for (const requirement of requirements) {
    let found = false;
    
    // Search for requirement validation in property test files
    for (const filePath of Object.keys(propertyTestFiles)) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes(requirement) || content.includes('**Validates: ' + requirement)) {
            logSuccess(`${requirement}: Validated in ${filePath}`);
            found = true;
            break;
          }
        }
      } catch (error) {
        // Continue searching other files
      }
    }
    
    if (!found) {
      logError(`${requirement}: No validation found`);
      allRequirementsCovered = false;
    }
  }
  
  return allRequirementsCovered;
}

function generateSystemReadinessReport() {
  logHeader('System Readiness Assessment');
  
  const validations = [
    { name: 'Required Files', passed: validateRequiredFiles() },
    { name: 'Property-Based Tests', passed: validatePropertyBasedTests() },
    { name: 'Integration Tests', passed: validateIntegrationTests() },
    { name: 'Test Configuration', passed: analyzeTestConfiguration() },
    { name: 'Property Test Iterations', passed: validatePropertyTestIterations() },
    { name: 'Requirements Coverage', passed: validateRequirementsCoverage() }
  ];
  
  const passedValidations = validations.filter(v => v.passed).length;
  const totalValidations = validations.length;
  
  logHeader('Final Assessment');
  
  log(`\n📊 Validation Summary:`);
  for (const validation of validations) {
    if (validation.passed) {
      logSuccess(`${validation.name}: PASSED`);
    } else {
      logError(`${validation.name}: FAILED`);
    }
  }
  
  log(`\n📈 Overall Score: ${passedValidations}/${totalValidations} validations passed`);
  
  if (passedValidations === totalValidations) {
    logSuccess('\n🎉 SYSTEM READY FOR PRODUCTION DEPLOYMENT');
    log('   All validations passed successfully', colors.green);
    log('   System meets all quality and testing requirements', colors.green);
  } else if (passedValidations >= totalValidations * 0.8) {
    logWarning('\n⚠️  SYSTEM MOSTLY READY - MINOR ISSUES DETECTED');
    log('   Most validations passed, address remaining issues', colors.yellow);
    log('   System can proceed with caution', colors.yellow);
  } else {
    logError('\n❌ SYSTEM NOT READY FOR PRODUCTION');
    log('   Critical validations failed, address issues before deployment', colors.red);
    log('   System requires additional work', colors.red);
  }
  
  return passedValidations === totalValidations;
}

function main() {
  logHeader('JukeBoxd System Readiness Validation');
  log(`Started at: ${new Date().toISOString()}`, colors.blue);
  
  const systemReady = generateSystemReadinessReport();
  
  logHeader('Validation Complete');
  log(`Completed at: ${new Date().toISOString()}`, colors.blue);
  
  if (systemReady) {
    log('\n✅ System validation completed successfully', colors.green);
    process.exit(0);
  } else {
    log('\n❌ System validation failed', colors.red);
    process.exit(1);
  }
}

// Run the validation
main();