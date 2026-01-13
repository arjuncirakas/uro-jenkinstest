import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Analyze coverage files and show which files need more coverage
 */
function analyzeCoverage() {
  console.log('📊 Analyzing Coverage Files...\n');

  const filesToCheck = [
    'backend/server.js',
    'backend/routes/patients.js',
    'backend/routes/investigations.js',
    'backend/controllers/nursesController.js',
    'backend/controllers/consentFormController.js',
    'backend/config/database.js',
    'backend/utils/dbHelper.js',
    'backend/controllers/investigationController.js',
    'backend/middleware/patientValidation.js',
    'backend/controllers/userControllerHelper.js'
  ];

  const backendLcov = path.join(projectRoot, 'backend', 'coverage', 'lcov.info');
  
  if (!fs.existsSync(backendLcov)) {
    console.log('❌ Backend coverage file not found!');
    return;
  }

  const content = fs.readFileSync(backendLcov, 'utf8');
  const lines = content.split('\n');

  console.log('Files with Low/Zero Coverage:\n');
  console.log('='.repeat(60));

  let currentFile = null;
  let lineCount = 0;
  let coveredLines = 0;

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      // Save previous file stats
      if (currentFile && filesToCheck.some(f => currentFile.includes(f))) {
        const coverage = lineCount > 0 ? ((coveredLines / lineCount) * 100).toFixed(1) : '0.0';
        if (parseFloat(coverage) < 80) {
          console.log(`${currentFile}`);
          console.log(`  Coverage: ${coverage}% (${coveredLines}/${lineCount} lines)`);
          console.log('');
        }
      }
      
      currentFile = line.substring(3);
      lineCount = 0;
      coveredLines = 0;
    } else if (line.startsWith('DA:') && currentFile) {
      lineCount++;
      const match = line.match(/DA:(\d+),(\d+)/);
      if (match) {
        const hits = parseInt(match[2]);
        if (hits > 0) {
          coveredLines++;
        }
      }
    } else if (line.startsWith('end_of_record')) {
      // Process last file
      if (currentFile && filesToCheck.some(f => currentFile.includes(f))) {
        const coverage = lineCount > 0 ? ((coveredLines / lineCount) * 100).toFixed(1) : '0.0';
        if (parseFloat(coverage) < 80) {
          console.log(`${currentFile}`);
          console.log(`  Coverage: ${coverage}% (${coveredLines}/${lineCount} lines)`);
          console.log('');
        }
      }
      currentFile = null;
      lineCount = 0;
      coveredLines = 0;
    }
  }

  console.log('='.repeat(60));
  console.log('\n💡 To improve coverage:');
  console.log('1. Create tests that actually execute the code paths');
  console.log('2. Use integration tests with supertest for routes');
  console.log('3. Test all branches and edge cases');
  console.log('4. Run: npm run test:coverage:backend');
}

analyzeCoverage();
















