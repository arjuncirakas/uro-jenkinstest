import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Find inconsistencies between coverage files and source files
 */
function findInconsistencies() {
  console.log('🔍 Finding Coverage Inconsistencies...\n');

  // Read all coverage files
  const coverageFiles = [
    path.join(projectRoot, 'frontend', 'coverage', 'lcov.info'),
    path.join(projectRoot, 'backend', 'coverage', 'lcov.info'),
    path.join(projectRoot, 'coverage', 'lcov.info')
  ];

  const coverageFilesSet = new Set();
  const emptyReports = [];

  // Collect all files from coverage reports
  coverageFiles.forEach(coverageFile => {
    if (!fs.existsSync(coverageFile)) {
      console.log(`⚠️  Coverage file not found: ${coverageFile}`);
      return;
    }

    const content = fs.readFileSync(coverageFile, 'utf8');
    const lines = content.split('\n');
    
    let currentFile = null;
    let isEmptyReport = false;

    lines.forEach((line, index) => {
      if (line.startsWith('SF:')) {
        // Save previous file if it was empty
        if (currentFile && isEmptyReport) {
          emptyReports.push({
            file: currentFile,
            coverageFile: path.basename(coverageFile)
          });
        }

        currentFile = line.substring(3).replace(/\\/g, '/');
        coverageFilesSet.add(currentFile);
        isEmptyReport = false;
      } else if (line.includes('(empty-report)')) {
        isEmptyReport = true;
      }
    });

    // Check last file
    if (currentFile && isEmptyReport) {
      emptyReports.push({
        file: currentFile,
        coverageFile: path.basename(coverageFile)
      });
    }
  });

  console.log(`📊 Found ${coverageFilesSet.size} files in coverage reports`);
  console.log(`⚠️  Found ${emptyReports.length} files with (empty-report)\n`);

  // Check which files exist in source
  const sourceDirs = [
    path.join(projectRoot, 'frontend', 'src'),
    path.join(projectRoot, 'backend')
  ];

  const sourceFilesSet = new Set();
  const missingInSource = [];
  const missingInCoverage = [];

  // Collect all source files
  function collectSourceFiles(dir, baseDir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        // Skip node_modules, coverage, etc.
        if (!['node_modules', 'coverage', '__tests__', 'test', '.git'].includes(entry.name)) {
          collectSourceFiles(fullPath, baseDir);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
        // Skip test files
        if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          sourceFilesSet.add(relativePath);
        }
      }
    }
  }

  sourceDirs.forEach(sourceDir => {
    if (fs.existsSync(sourceDir)) {
      collectSourceFiles(sourceDir, sourceDir);
    }
  });

  console.log(`📊 Found ${sourceFilesSet.size} source files\n`);

  // Find files in coverage but not in source (with correct path prefix)
  coverageFilesSet.forEach(coverageFile => {
    // Normalize path - remove frontend/src or backend prefix for comparison
    let normalizedPath = coverageFile;
    
    if (coverageFile.startsWith('frontend/src/')) {
      normalizedPath = coverageFile.substring('frontend/src/'.length);
    } else if (coverageFile.startsWith('backend/')) {
      normalizedPath = coverageFile.substring('backend/'.length);
    }

    // Check if file exists
    let exists = false;
    if (coverageFile.startsWith('frontend/src/')) {
      const sourcePath = path.join(projectRoot, 'frontend', 'src', normalizedPath);
      exists = fs.existsSync(sourcePath);
    } else if (coverageFile.startsWith('backend/')) {
      const sourcePath = path.join(projectRoot, 'backend', normalizedPath);
      exists = fs.existsSync(sourcePath);
    }

    if (!exists) {
      missingInSource.push(coverageFile);
    }
  });

  // Find files in source but not in coverage
  sourceFilesSet.forEach(sourceFile => {
    // Check in frontend coverage
    const frontendPath = `frontend/src/${sourceFile}`;
    const backendPath = `backend/${sourceFile}`;
    
    if (!coverageFilesSet.has(frontendPath) && !coverageFilesSet.has(backendPath)) {
      // Determine which directory it belongs to
      const frontendSourcePath = path.join(projectRoot, 'frontend', 'src', sourceFile);
      const backendSourcePath = path.join(projectRoot, 'backend', sourceFile);
      
      if (fs.existsSync(frontendSourcePath)) {
        missingInCoverage.push(`frontend/src/${sourceFile}`);
      } else if (fs.existsSync(backendSourcePath)) {
        missingInCoverage.push(`backend/${sourceFile}`);
      }
    }
  });

  // Report results
  console.log('='.repeat(80));
  console.log('📋 INCONSISTENCY REPORT');
  console.log('='.repeat(80));

  if (emptyReports.length > 0) {
    console.log(`\n⚠️  Files with (empty-report) - ${emptyReports.length} files:`);
    emptyReports.slice(0, 20).forEach(({ file, coverageFile }) => {
      console.log(`   - ${file} (in ${coverageFile})`);
    });
    if (emptyReports.length > 20) {
      console.log(`   ... and ${emptyReports.length - 20} more`);
    }
  }

  if (missingInSource.length > 0) {
    console.log(`\n❌ Files in coverage but NOT in source - ${missingInSource.length} files:`);
    missingInSource.slice(0, 20).forEach(file => {
      console.log(`   - ${file}`);
    });
    if (missingInSource.length > 20) {
      console.log(`   ... and ${missingInSource.length - 20} more`);
    }
  }

  if (missingInCoverage.length > 0) {
    console.log(`\n❌ Files in source but NOT in coverage - ${missingInCoverage.length} files:`);
    missingInCoverage.slice(0, 20).forEach(file => {
      console.log(`   - ${file}`);
    });
    if (missingInCoverage.length > 20) {
      console.log(`   ... and ${missingInCoverage.length - 20} more`);
    }
  }

  const totalInconsistencies = emptyReports.length + missingInSource.length + missingInCoverage.length;
  
  // Check for potential path mismatches that could cause SonarQube inconsistencies
  const pathMismatches = [];
  coverageFilesSet.forEach(coverageFile => {
    // Check if path format matches what SonarQube expects
    if (coverageFile.includes('\\')) {
      pathMismatches.push(coverageFile);
    }
  });

  // Count total lines in empty-report files (SonarQube might count each line)
  let totalEmptyReportLines = 0;
  emptyReports.forEach(({ file }) => {
    const fullPath = file.startsWith('frontend/src/') 
      ? path.join(projectRoot, 'frontend', 'src', file.substring('frontend/src/'.length))
      : file.startsWith('backend/')
      ? path.join(projectRoot, 'backend', file.substring('backend/'.length))
      : null;
    
    if (fullPath && fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      totalEmptyReportLines += content.split('\n').length;
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`📊 SUMMARY: ${totalInconsistencies} total inconsistencies found`);
  console.log(`   - Empty reports: ${emptyReports.length} files (${totalEmptyReportLines} total lines)`);
  console.log(`   - Missing in source: ${missingInSource.length}`);
  console.log(`   - Missing in coverage: ${missingInCoverage.length}`);
  if (pathMismatches.length > 0) {
    console.log(`   - Path format issues (backslashes): ${pathMismatches.length}`);
  }
  console.log(`\n💡 Note: SonarQube's 462 inconsistencies may include:`);
  console.log(`   - Each line in empty-report files (${totalEmptyReportLines} lines)`);
  console.log(`   - Path mismatches at line level`);
  console.log(`   - Files SonarQube expects but can't match`);
  console.log('='.repeat(80));

  // Save detailed report to file
  const reportPath = path.join(projectRoot, 'coverage-inconsistencies-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    emptyReports: emptyReports.map(r => r.file),
    missingInSource,
    missingInCoverage,
    pathMismatches,
    totalEmptyReportLines,
    summary: {
      totalInconsistencies,
      emptyReportsCount: emptyReports.length,
      missingInSourceCount: missingInSource.length,
      missingInCoverageCount: missingInCoverage.length,
      pathMismatchesCount: pathMismatches.length,
      estimatedSonarQubeInconsistencies: totalEmptyReportLines + missingInSource.length + missingInCoverage.length
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return report;
}

// Run the analysis
findInconsistencies();

