import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Check coverage file paths and report issues
 */
function checkCoverageFile(lcovPath, expectedPrefix) {
  if (!fs.existsSync(lcovPath)) {
    console.log(`❌ Coverage file not found: ${lcovPath}`);
    return { exists: false, correct: 0, incorrect: 0, total: 0, hasBackslashes: false, missingPrefixes: [] };
  }

  console.log(`\n📋 Checking: ${lcovPath}`);
  console.log(`   Expected prefix: ${expectedPrefix}`);

  const content = fs.readFileSync(lcovPath, 'utf8');
  const lines = content.split('\n');
  const sourceFiles = lines.filter(line => line.startsWith('SF:'));
  
  let correct = 0;
  let incorrect = 0;
  let hasBackslashes = false;
  const incorrectPaths = [];
  const backslashPaths = [];
  const missingPrefixPaths = [];

  sourceFiles.forEach(line => {
    const filePath = line.substring(3);
    const hasBackslash = filePath.includes('\\');
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Check for backslashes
    if (hasBackslash) {
      hasBackslashes = true;
      if (backslashPaths.length < 10) {
        backslashPaths.push(filePath);
      }
    }
    
    // Check for correct prefix
    if (normalizedPath.startsWith(expectedPrefix + '/')) {
      correct++;
    } else {
      incorrect++;
      if (incorrectPaths.length < 10) {
        incorrectPaths.push(normalizedPath);
      }
      
      // Check if it's a missing prefix issue (for backend/frontend specific checks)
      if (expectedPrefix === 'backend') {
        const isBackendFile = normalizedPath === 'server.js' || 
          normalizedPath.match(/^(config|controllers|middleware|services|schedulers|utils|routes)\//);
        if (isBackendFile && !normalizedPath.startsWith('backend/')) {
          missingPrefixPaths.push(normalizedPath);
        }
      } else if (expectedPrefix === 'frontend/src') {
        if (normalizedPath.startsWith('src/') && !normalizedPath.startsWith('frontend/')) {
          missingPrefixPaths.push(normalizedPath);
        }
      }
    }
  });

  console.log(`   ✅ Correct paths: ${correct}`);
  console.log(`   ❌ Incorrect paths: ${incorrect}`);
  
  if (hasBackslashes) {
    console.log(`   ⚠️  Found backslashes in paths (should use forward slashes):`);
    backslashPaths.forEach(p => console.log(`      - ${p}`));
  }
  
  if (missingPrefixPaths.length > 0) {
    console.log(`   ⚠️  Missing prefix (should start with '${expectedPrefix}/'):`);
    missingPrefixPaths.forEach(p => console.log(`      - ${p}`));
  }
  
  if (incorrectPaths.length > 0 && !hasBackslashes && missingPrefixPaths.length === 0) {
    console.log(`   Sample incorrect paths:`);
    incorrectPaths.forEach(p => console.log(`      - ${p}`));
  }

  return { 
    exists: true, 
    correct, 
    incorrect, 
    total: sourceFiles.length,
    hasBackslashes,
    missingPrefixes: missingPrefixPaths
  };
}

// Main execution
console.log('🔍 Checking coverage file paths for SonarQube compatibility...\n');

const results = {
  backend: checkCoverageFile(
    path.join(projectRoot, 'backend', 'coverage', 'lcov.info'),
    'backend'
  ),
  frontend: checkCoverageFile(
    path.join(projectRoot, 'frontend', 'coverage', 'lcov.info'),
    'frontend/src'
  ),
  root: checkCoverageFile(
    path.join(projectRoot, 'coverage', 'lcov.info'),
    'backend' // Root might have both, but we check for backend prefix
  )
};

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

let hasIssues = false;

if (!results.frontend.exists) {
  console.log('\n⚠️  CRITICAL: Frontend coverage file is missing!');
  console.log('   Run: npm run test:coverage:frontend');
  hasIssues = true;
}

if (results.backend.exists) {
  const backendPercent = ((results.backend.correct / results.backend.total) * 100).toFixed(1);
  console.log(`\n📦 Backend Coverage: ${results.backend.correct}/${results.backend.total} correct (${backendPercent}%)`);
  if (results.backend.incorrect > 0 || results.backend.hasBackslashes || results.backend.missingPrefixes.length > 0) {
    console.log(`   ⚠️  ${results.backend.incorrect} paths need fixing`);
    if (results.backend.hasBackslashes) {
      console.log(`   ⚠️  Contains backslashes (should use forward slashes)`);
    }
    if (results.backend.missingPrefixes.length > 0) {
      console.log(`   ⚠️  ${results.backend.missingPrefixes.length} paths missing 'backend/' prefix`);
    }
    hasIssues = true;
  }
}

if (results.frontend.exists) {
  const frontendPercent = ((results.frontend.correct / results.frontend.total) * 100).toFixed(1);
  console.log(`\n📦 Frontend Coverage: ${results.frontend.correct}/${results.frontend.total} correct (${frontendPercent}%)`);
  if (results.frontend.incorrect > 0 || results.frontend.hasBackslashes || results.frontend.missingPrefixes.length > 0) {
    console.log(`   ⚠️  ${results.frontend.incorrect} paths need fixing`);
    if (results.frontend.hasBackslashes) {
      console.log(`   ⚠️  Contains backslashes (should use forward slashes)`);
    }
    if (results.frontend.missingPrefixes.length > 0) {
      console.log(`   ⚠️  ${results.frontend.missingPrefixes.length} paths missing 'frontend/src/' prefix`);
    }
    hasIssues = true;
  }
}

if (results.root.exists) {
  console.log(`\n📦 Root Coverage: ${results.root.total} files`);
  // Check for frontend files in root
  const rootContent = fs.readFileSync(path.join(projectRoot, 'coverage', 'lcov.info'), 'utf8');
  const frontendInRoot = (rootContent.match(/^SF:frontend\/src\//gm) || []).length;
  const backendInRoot = (rootContent.match(/^SF:backend\//gm) || []).length;
  console.log(`   - Frontend files: ${frontendInRoot}`);
  console.log(`   - Backend files: ${backendInRoot}`);
  
  // Check root file for issues
  if (results.root.hasBackslashes) {
    console.log(`   ⚠️  Contains backslashes (should use forward slashes)`);
    hasIssues = true;
  }
}

console.log('\n' + '='.repeat(60));
if (hasIssues) {
  console.log('❌ Issues found in coverage paths!');
  console.log('💡 Next Steps:');
  if (!results.frontend.exists) {
    console.log('   1. Generate frontend coverage: npm run test:coverage:frontend');
  }
  if (results.backend.incorrect > 0 || results.backend.hasBackslashes || 
      (results.frontend.exists && (results.frontend.incorrect > 0 || results.frontend.hasBackslashes))) {
    console.log('   2. Fix paths: npm run fix:lcov-paths');
  }
  console.log('   3. Re-check paths: npm run check:coverage-paths');
  console.log('   4. Run SonarQube scan: npm run sonar:scan');
  process.exit(1);
} else {
  console.log('✅ All coverage paths are correct!');
  console.log('💡 Next Steps:');
  console.log('   Run SonarQube scan: npm run sonar:scan');
  process.exit(0);
}
console.log('='.repeat(60));









