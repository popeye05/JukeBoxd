#!/usr/bin/env node

/**
 * Script to update property-based tests to use 100+ iterations for final system testing
 */

const fs = require('fs');
const path = require('path');

// Files to update with their target iteration counts
const testFiles = [
  { file: 'src/services/SpotifyService.property.test.ts', iterations: 100 },
  { file: 'src/models/Rating.property.test.ts', iterations: 100 },
  { file: 'src/models/Review.property.test.ts', iterations: 100 },
  { file: 'src/models/Follow.property.test.ts', iterations: 100 },
  { file: 'src/services/ActivityFeedService.property.test.ts', iterations: 100 },
  { file: 'src/services/SocialService.profile.property.test.ts', iterations: 100 },
  { file: 'src/services/DataPersistence.property.test.ts', iterations: 100 },
  { file: 'src/services/AccountDeletion.property.test.ts', iterations: 100 },
  { file: 'frontend/src/components/albums/AlbumSearch.property.test.tsx', iterations: 100 },
  { file: 'frontend/src/components/albums/RatingReview.property.test.tsx', iterations: 100 },
  { file: 'frontend/src/components/social/FollowButton.property.test.tsx', iterations: 100 },
  { file: 'frontend/src/components/social/UserProfile.property.test.tsx', iterations: 100 },
  { file: 'frontend/src/components/feed/ActivityFeed.property.test.tsx', iterations: 100 }
];

function updateTestFile(filePath, targetIterations) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Update numRuns values that are less than target iterations
    const numRunsRegex = /numRuns:\s*(\d+)/g;
    content = content.replace(numRunsRegex, (match, currentValue) => {
      const current = parseInt(currentValue);
      if (current < targetIterations) {
        updated = true;
        return `numRuns: ${targetIterations}`;
      }
      return match;
    });

    // Add comment for final system testing
    if (updated) {
      content = content.replace(
        /numRuns:\s*100(?!\d)/g,
        'numRuns: 100 // Final system testing with 100+ iterations'
      );
    }

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath} to use ${targetIterations} iterations`);
      return true;
    } else {
      console.log(`ℹ️  ${filePath} already uses sufficient iterations`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔄 Updating property-based tests for final system testing...\n');

  let totalUpdated = 0;
  let totalFiles = 0;

  for (const { file, iterations } of testFiles) {
    totalFiles++;
    if (updateTestFile(file, iterations)) {
      totalUpdated++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files updated: ${totalUpdated}`);
  console.log(`   Files already optimal: ${totalFiles - totalUpdated}`);

  if (totalUpdated > 0) {
    console.log('\n✅ Property-based tests updated for final system testing');
    console.log('   All tests now configured for 100+ iterations');
  } else {
    console.log('\n✅ All property-based tests already configured optimally');
  }
}

main();