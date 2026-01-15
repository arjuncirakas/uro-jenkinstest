/**
 * Analyze coverage reports and calculate overall coverage
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function parseLcovFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let currentFile = null;
  const files = {};
  let totalLines = 0;
  let coveredLines = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalBranches = 0;
  let coveredBranches = 0;

  for (const line of lines) {
    if (line.startsWith('SF:')) {
      currentFile = line.substring(3);
      if (!files[currentFile]) {
        files[currentFile] = {
          lines: {},
          functions: {},
          branches: {},
          lineCount: 0,
          coveredLineCount: 0,
          functionCount: 0,
          coveredFunctionCount: 0,
          branchCount: 0,
          coveredBranchCount: 0
        };
      }
    } else if (line.startsWith('DA:') && currentFile) {
      const [lineNum, hitCount] = line.substring(3).split(',').map(Number);
      files[currentFile].lines[lineNum] = hitCount;
      files[currentFile].lineCount++;
      totalLines++;
      if (hitCount > 0) {
        files[currentFile].coveredLineCount++;
        coveredLines++;
      }
    } else if (line.startsWith('FNDA:') && currentFile) {
      const parts = line.substring(5).split(',');
      const hitCount = Number(parts[0]);
      const functionName = parts[1];
      files[currentFile].functions[functionName] = hitCount;
      files[currentFile].functionCount++;
      totalFunctions++;
      if (hitCount > 0) {
        files[currentFile].coveredFunctionCount++;
        coveredFunctions++;
      }
    } else if (line.startsWith('BRDA:') && currentFile) {
      const parts = line.substring(5).split(',');
      const branchId = parts[0] + ',' + parts[1] + ',' + parts[2];
      const hitCount = parts[3] === '-' ? 0 : Number(parts[3]);
      files[currentFile].branches[branchId] = hitCount;
      files[currentFile].branchCount++;
      totalBranches++;
      if (hitCount > 0) {
        files[currentFile].coveredBranchCount++;
        coveredBranches++;
      }
    }
  }

  return {
    files,
    totals: {
      lines: { total: totalLines, covered: coveredLines },
      functions: { total: totalFunctions, covered: coveredFunctions },
      branches: { total: totalBranches, covered: coveredBranches }
    }
  };
}

function calculateCoverage(totals) {
  const lineCoverage = totals.lines.total > 0 
    ? (totals.lines.covered / totals.lines.total) * 100 
    : 0;
  const functionCoverage = totals.functions.total > 0 
    ? (totals.functions.covered / totals.functions.total) * 100 
    : 0;
  const branchCoverage = totals.branches.total > 0 
    ? (totals.branches.covered / totals.branches.total) * 100 
    : 0;
  
  const overallCoverage = (lineCoverage + functionCoverage + branchCoverage) / 3;
  
  return {
    lines: lineCoverage,
    functions: functionCoverage,
    branches: branchCoverage,
    overall: overallCoverage
  };
}

// Analyze coverage files
const backendCoverage = parseLcovFile(path.join(projectRoot, 'backend', 'coverage', 'lcov.info'));
const frontendCoverage = parseLcovFile(path.join(projectRoot, 'frontend', 'coverage', 'lcov.info'));
const rootCoverage = parseLcovFile(path.join(projectRoot, 'coverage', 'lcov.info'));

console.log('='.repeat(80));
console.log('COVERAGE ANALYSIS REPORT');
console.log('='.repeat(80));
console.log();

if (backendCoverage) {
  const backendStats = calculateCoverage(backendCoverage.totals);
  console.log('BACKEND COVERAGE:');
  console.log(`  Files: ${Object.keys(backendCoverage.files).length}`);
  console.log(`  Lines: ${backendCoverage.totals.lines.covered}/${backendCoverage.totals.lines.total} (${backendStats.lines.toFixed(2)}%)`);
  console.log(`  Functions: ${backendCoverage.totals.functions.covered}/${backendCoverage.totals.functions.total} (${backendStats.functions.toFixed(2)}%)`);
  console.log(`  Branches: ${backendCoverage.totals.branches.covered}/${backendCoverage.totals.branches.total} (${backendStats.branches.toFixed(2)}%)`);
  console.log(`  Overall: ${backendStats.overall.toFixed(2)}%`);
  console.log();
} else {
  console.log('BACKEND COVERAGE: Not found');
  console.log();
}

if (frontendCoverage) {
  const frontendStats = calculateCoverage(frontendCoverage.totals);
  console.log('FRONTEND COVERAGE:');
  console.log(`  Files: ${Object.keys(frontendCoverage.files).length}`);
  console.log(`  Lines: ${frontendCoverage.totals.lines.covered}/${frontendCoverage.totals.lines.total} (${frontendStats.lines.toFixed(2)}%)`);
  console.log(`  Functions: ${frontendCoverage.totals.functions.covered}/${frontendCoverage.totals.functions.total} (${frontendStats.functions.toFixed(2)}%)`);
  console.log(`  Branches: ${frontendCoverage.totals.branches.covered}/${frontendCoverage.totals.branches.total} (${frontendStats.branches.toFixed(2)}%)`);
  console.log(`  Overall: ${frontendStats.overall.toFixed(2)}%`);
  console.log();
} else {
  console.log('FRONTEND COVERAGE: Not found');
  console.log();
}

// Calculate combined coverage
if (backendCoverage && frontendCoverage) {
  const combinedTotals = {
    lines: {
      total: backendCoverage.totals.lines.total + frontendCoverage.totals.lines.total,
      covered: backendCoverage.totals.lines.covered + frontendCoverage.totals.lines.covered
    },
    functions: {
      total: backendCoverage.totals.functions.total + frontendCoverage.totals.functions.total,
      covered: backendCoverage.totals.functions.covered + frontendCoverage.totals.functions.covered
    },
    branches: {
      total: backendCoverage.totals.branches.total + frontendCoverage.totals.branches.total,
      covered: backendCoverage.totals.branches.covered + frontendCoverage.totals.branches.covered
    }
  };
  
  const combinedStats = calculateCoverage(combinedTotals);
  console.log('COMBINED COVERAGE:');
  console.log(`  Total Files: ${Object.keys(backendCoverage.files).length + Object.keys(frontendCoverage.files).length}`);
  console.log(`  Lines: ${combinedTotals.lines.covered}/${combinedTotals.lines.total} (${combinedStats.lines.toFixed(2)}%)`);
  console.log(`  Functions: ${combinedTotals.functions.covered}/${combinedTotals.functions.total} (${combinedStats.functions.toFixed(2)}%)`);
  console.log(`  Branches: ${combinedTotals.branches.covered}/${combinedTotals.branches.total} (${combinedStats.branches.toFixed(2)}%)`);
  console.log(`  Overall: ${combinedStats.overall.toFixed(2)}%`);
  console.log();
}

// List files with 0% coverage
console.log('='.repeat(80));
console.log('FILES WITH 0% COVERAGE:');
console.log('='.repeat(80));

const allFiles = {};
if (backendCoverage) {
  Object.assign(allFiles, backendCoverage.files);
}
if (frontendCoverage) {
  Object.assign(allFiles, frontendCoverage.files);
}

const zeroCoverageFiles = Object.entries(allFiles)
  .filter(([file, data]) => data.coveredLineCount === 0 && data.lineCount > 0)
  .map(([file]) => file)
  .sort();

if (zeroCoverageFiles.length > 0) {
  console.log(`Found ${zeroCoverageFiles.length} files with 0% coverage:\n`);
  zeroCoverageFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
} else {
  console.log('No files with 0% coverage found.');
}

console.log();
console.log('='.repeat(80));
