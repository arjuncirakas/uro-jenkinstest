import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Verify coverage files and paths for SonarQube
 */
function verifyCoverage() {
  console.log('🔍 Verifying Coverage Files for SonarQube...\n');

  const results = {
    backend: verifyCoverageFile(
      path.join(projectRoot, 'backend', 'coverage', 'lcov.info'),
      'backend'
    ),
    frontend: verifyCoverageFile(
      path.join(projectRoot, 'frontend', 'coverage', 'lcov.info'),
      'frontend/src'
    ),
    root: verifyCoverageFile(
      path.join(projectRoot, 'coverage', 'lcov.info'),
      null
    )
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  let allGood = true;
  for (const [name, result] of Object.entries(results)) {
    if (result.exists) {
      console.log(`✅ ${name.toUpperCase()}: Coverage file exists (${result.size} bytes)`);
      if (result.pathsChecked > 0) {
        console.log(`   - ${result.pathsChecked} paths checked`);
        console.log(`   - ${result.pathsCorrect} paths correct`);
        if (result.pathsIncorrect > 0) {
          console.log(`   - ⚠️  ${result.pathsIncorrect} paths need fixing`);
          allGood = false;
        }
      }
    } else {
      console.log(`❌ ${name.toUpperCase()}: Coverage file NOT FOUND`);
      allGood = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allGood) {
    console.log('✅ All coverage files are ready for SonarQube!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run sonar:scan');
    console.log('2. Check SonarQube dashboard for coverage results');
  } else {
    console.log('⚠️  Some issues found. Please fix them before running SonarQube scan.');
    console.log('\nTo fix paths, run:');
    console.log('  node scripts/fix-lcov-paths.js');
  }
  console.log('='.repeat(60));
}

function verifyCoverageFile(lcovPath, expectedPrefix) {
  const result = {
    exists: false,
    size: 0,
    pathsChecked: 0,
    pathsCorrect: 0,
    pathsIncorrect: 0,
    incorrectPaths: []
  };

  if (!fs.existsSync(lcovPath)) {
    return result;
  }

  result.exists = true;
  result.size = fs.statSync(lcovPath).size;

  const content = fs.readFileSync(lcovPath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      result.pathsChecked++;
      const filePath = line.substring(3);

      if (expectedPrefix) {
        if (filePath.startsWith(expectedPrefix + '/') || filePath.startsWith(expectedPrefix + '\\')) {
          result.pathsCorrect++;
        } else {
          result.pathsIncorrect++;
          if (result.incorrectPaths.length < 5) {
            result.incorrectPaths.push(filePath);
          }
        }
      } else {
        // Root coverage - just check it exists
        result.pathsCorrect++;
      }
    }
  }

  if (result.pathsIncorrect > 0 && result.incorrectPaths.length > 0) {
    console.log(`\n⚠️  Found ${result.pathsIncorrect} paths with incorrect prefix in ${path.basename(lcovPath)}`);
    console.log('   First few incorrect paths:');
    result.incorrectPaths.forEach(p => console.log(`     - ${p}`));
  }

  return result;
}

// Run verification
verifyCoverage();
















