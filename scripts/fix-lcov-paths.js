#!/usr/bin/env node
/**
 * Script to fix absolute paths in lcov.info files to relative paths
 * This ensures SonarQube can properly match coverage data with source files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function normalizeLcovPaths(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Get the directory of the lcov file
  const lcovDir = path.dirname(filePath);

  // Normalize paths: convert absolute Windows paths to relative paths
  // Match patterns like: SF:D:\Work Files\latesturology\frontend\src\...
  // or: SF:D:/Work Files/latesturology/backend/controllers/...
  const absolutePathPattern = /^SF:(.+)$/gm;

  // Determine prefix based on lcov file location
  const isFrontendCoverage = filePath.includes('frontend');
  const isBackendCoverage = filePath.includes('backend') && !filePath.includes('frontend');

  content = content.replace(absolutePathPattern, (match, srcFilePath) => {
    // Normalize path separators FIRST - convert all backslashes to forward slashes
    let normalizedPath = srcFilePath.replace(/\\/g, '/');

    // Check if path is already relative and correct
    if (normalizedPath.startsWith('frontend/src/') || normalizedPath.startsWith('backend/')) {
      return `SF:${normalizedPath}`; // Already correct, but ensure SF: prefix
    }

    // Handle paths that start with 'src/' - these are from frontend coverage run from frontend directory
    if (normalizedPath.startsWith('src/') && isFrontendCoverage) {
      return `SF:frontend/${normalizedPath}`;
    }

    // Handle paths that start with controllers/, middleware/, etc. - these are from backend coverage
    const backendDirs = ['controllers/', 'middleware/', 'routes/', 'services/', 'utils/', 'schedulers/'];
    for (const dir of backendDirs) {
      if (normalizedPath.startsWith(dir)) {
        return `SF:backend/${normalizedPath}`;
      }
    }

    // Handle absolute Windows paths (e.g., D:/Work Files/... or D:\\Work Files\\...)
    if (/^[A-Z]:/.test(normalizedPath)) {
      // Remove drive letter
      normalizedPath = normalizedPath.replace(/^[A-Z]:/, '');
    }

    // Try to extract the relevant part from the path using safe string operations
    // Avoid regex to prevent DoS vulnerabilities from catastrophic backtracking
    const frontendMarker = 'frontend/src/';
    const frontendIndex = normalizedPath.indexOf(frontendMarker);
    if (frontendIndex !== -1) {
      const relativePath = normalizedPath.substring(frontendIndex);
      return `SF:${relativePath}`;
    }

    const backendMarker = 'backend/';
    const backendIndex = normalizedPath.indexOf(backendMarker);
    if (backendIndex !== -1) {
      let relativePath = normalizedPath.substring(backendIndex);
      // Remove 'coverage/' from paths like 'backend/coverage/controllers/...'
      relativePath = relativePath.replace('backend/coverage/', 'backend/');
      return `SF:${relativePath}`;
    }

    // Try to convert to relative path from project root
    try {
      // Handle both absolute and relative paths
      let absolutePath;
      if (path.isAbsolute(filePath)) {
        absolutePath = filePath;
      } else {
        absolutePath = path.resolve(lcovDir, filePath);
      }

      const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, '/');

      // Ensure paths match SonarQube expectations
      if (relativePath.startsWith('frontend/src/') || relativePath.startsWith('backend/')) {
        return `SF:${relativePath}`;
      }

      // Fallback: return as-is if we can't normalize
      console.warn(`Warning: Could not normalize path: ${filePath}`);
      return match;
    } catch (error) {
      console.warn(`Warning: Error processing path ${filePath}: ${error.message}`);
      return match;
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed paths in ${filePath}`);
  } else {
    console.log(`✓ No changes needed in ${filePath}`);
  }
}

// Process all lcov.info files
const lcovFiles = [
  path.join(projectRoot, 'frontend', 'coverage', 'lcov.info'),
  path.join(projectRoot, 'backend', 'coverage', 'lcov.info'),
  path.join(projectRoot, 'coverage', 'lcov.info')
];

console.log('Fixing lcov.info file paths...\n');
lcovFiles.forEach(normalizeLcovPaths);
console.log('\nDone!');

