import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Execute a command and return a promise
 */
function execCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶️  Running: ${command} ${args.join(' ')}`);
    const process = spawn(command, args, {
      ...options,
      stdio: 'inherit',
      shell: true,
      cwd: options.cwd || projectRoot
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Check if a file exists and is not empty
 */
function fileExistsAndNotEmpty(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const stats = fs.statSync(filePath);
  return stats.size > 0;
}

/**
 * Check if coverage file is recent (less than 1 hour old)
 */
function isCoverageRecent(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const stats = fs.statSync(filePath);
  const ageMs = Date.now() - stats.mtimeMs;
  const ageHours = ageMs / (1000 * 60 * 60);
  return ageHours < 1;
}

/**
 * Run fix-lcov-paths script
 */
async function fixLcovPaths() {
  console.log('\n🔧 Fixing LCOV file paths...');
  try {
    await execCommand('node', ['scripts/fix-lcov-paths.js']);
    return true;
  } catch (error) {
    console.error('❌ Failed to run fix-lcov-paths.js:', error.message);
    return false;
  }
}

/**
 * Main preparation function
 */
async function prepareSonarScan() {
  console.log('='.repeat(60));
  console.log('🚀 Preparing SonarQube Scan');
  console.log('='.repeat(60));

  const backendLcov = path.join(projectRoot, 'backend', 'coverage', 'lcov.info');
  const frontendLcov = path.join(projectRoot, 'frontend', 'coverage', 'lcov.info');

  let needsBackendCoverage = !fileExistsAndNotEmpty(backendLcov);
  let needsFrontendCoverage = !fileExistsAndNotEmpty(frontendLcov);

  // Check if existing coverage is recent
  if (!needsBackendCoverage && isCoverageRecent(backendLcov)) {
    console.log('✅ Backend coverage file exists and is recent, skipping generation');
    needsBackendCoverage = false;
  }

  if (!needsFrontendCoverage && isCoverageRecent(frontendLcov)) {
    console.log('✅ Frontend coverage file exists and is recent, skipping generation');
    needsFrontendCoverage = false;
  }

  // Generate backend coverage if needed
  if (needsBackendCoverage) {
    console.log('\n📊 Generating backend coverage...');
    try {
      await execCommand('npm', ['run', 'test:coverage:backend']);
      console.log('✅ Backend coverage generated');
    } catch (error) {
      console.error('❌ Failed to generate backend coverage:', error.message);
      console.error('   Please run: npm run test:coverage:backend');
      process.exit(1);
    }
  }

  // Generate frontend coverage if needed
  if (needsFrontendCoverage) {
    console.log('\n📊 Generating frontend coverage...');
    try {
      await execCommand('npm', ['run', 'test:coverage:frontend']);
      console.log('✅ Frontend coverage generated');
    } catch (error) {
      console.error('❌ Failed to generate frontend coverage:', error.message);
      console.error('   Please run: npm run test:coverage:frontend');
      process.exit(1);
    }
  }

  // Verify coverage files exist
  console.log('\n🔍 Verifying coverage files...');
  if (!fileExistsAndNotEmpty(backendLcov)) {
    console.error(`❌ Backend coverage file not found: ${backendLcov}`);
    console.error('   Run: npm run test:coverage:backend');
    process.exit(1);
  }

  if (!fileExistsAndNotEmpty(frontendLcov)) {
    console.error(`❌ Frontend coverage file not found: ${frontendLcov}`);
    console.error('   Run: npm run test:coverage:frontend');
    process.exit(1);
  }

  console.log('✅ Both coverage files exist');

  // Fix LCOV paths
  const pathsFixed = await fixLcovPaths();
  if (!pathsFixed) {
    console.error('❌ Failed to fix LCOV paths');
    process.exit(1);
  }

  // Validate coverage files
  console.log('\n🔍 Validating coverage file paths...');
  const backendValid = validateCoverageFile(backendLcov, 'backend');
  const frontendValid = validateCoverageFile(frontendLcov, 'frontend/src');

  if (!backendValid) {
    console.warn('⚠️  Backend coverage paths may need fixing');
    console.warn('   Run: npm run fix:lcov-paths');
  }

  if (!frontendValid) {
    console.warn('⚠️  Frontend coverage paths may need fixing');
    console.warn('   Run: npm run fix:lcov-paths');
  }

  if (backendValid && frontendValid) {
    console.log('✅ Coverage file paths are valid');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Preparation Complete!');
  console.log('='.repeat(60));
  console.log('\nCoverage files ready:');
  console.log(`  - Backend: ${backendLcov}`);
  console.log(`  - Frontend: ${frontendLcov}`);
  console.log('\nNext step: Run SonarQube scan');
  console.log('  npm run sonar:scan');
  console.log('  or');
  console.log('  generate-coverage-and-scan.bat');
  console.log('='.repeat(60));
}

/**
 * Simple validation of coverage file paths
 */
function validateCoverageFile(lcovPath, expectedPrefix) {
  if (!fs.existsSync(lcovPath)) {
    return false;
  }

  const content = fs.readFileSync(lcovPath, 'utf8');
  const lines = content.split('\n');
  let totalPaths = 0;
  let correctPaths = 0;

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      totalPaths++;
      const filePath = line.substring(3);
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      if (normalizedPath.startsWith(expectedPrefix + '/')) {
        correctPaths++;
      }
    }
  }

  // Consider valid if at least 80% of paths are correct
  const percentage = totalPaths > 0 ? (correctPaths / totalPaths) * 100 : 0;
  return percentage >= 80;
}

// Run preparation
prepareSonarScan().catch((error) => {
  console.error('\n❌ Preparation failed:', error.message);
  process.exit(1);
});

