/**
 * Fix lcov.info file paths for SonarQube
 * Normalizes paths to use forward slashes and be relative to project root
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Coverage files to process
const coverageFiles = [
  path.join(projectRoot, 'backend', 'coverage', 'lcov.info'),
  path.join(projectRoot, 'frontend', 'coverage', 'lcov.info'),
  path.join(projectRoot, 'coverage', 'lcov.info')
];

function normalizeCoverageFile(filePath, prefix) {
  if (!fs.existsSync(filePath)) {
    console.log(`Coverage file not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;

  const normalizedLines = lines.map(line => {
    if (line.startsWith('SF:')) {
      let filePath = line.substring(3);
      const originalPath = filePath;
      
      // Convert Windows backslashes to forward slashes
      filePath = filePath.replace(/\\/g, '/');
      
      // Normalize path based on prefix
      if (prefix === 'backend') {
        // Backend paths should be: backend/services/alertService.js
        if (!filePath.startsWith('backend/')) {
          // If it's a relative path like 'services/alertService.js', add 'backend/'
          if (!filePath.startsWith('/') && !filePath.includes(':')) {
            filePath = `backend/${filePath}`;
          } else {
            // If it's an absolute path, extract relative part
            const backendIndex = filePath.indexOf('backend/');
            if (backendIndex !== -1) {
              filePath = filePath.substring(backendIndex);
            } else {
              // Try to extract from common patterns
              const match = filePath.match(/(?:backend[/\\])(.+)$/i);
              if (match) {
                filePath = `backend/${match[1]}`;
              }
            }
          }
        }
      } else if (prefix === 'frontend') {
        // Frontend paths should be: frontend/src/App.jsx
        if (!filePath.startsWith('frontend/src/')) {
          if (filePath.startsWith('src/')) {
            filePath = `frontend/${filePath}`;
          } else if (!filePath.startsWith('frontend/')) {
            // Try to extract from common patterns
            const match = filePath.match(/(?:frontend[/\\]src[/\\]|src[/\\])(.+)$/i);
            if (match) {
              filePath = `frontend/src/${match[1]}`;
            } else if (!filePath.includes(':')) {
              filePath = `frontend/src/${filePath}`;
            }
          }
        }
      }
      
      // Remove leading slash if present
      filePath = filePath.replace(/^\/+/, '');
      
      // Ensure forward slashes
      filePath = filePath.replace(/\\/g, '/');
      
      if (filePath !== originalPath) {
        modified = true;
      }
      
      return `SF:${filePath}`;
    }
    return line;
  });

  if (modified) {
    const normalizedContent = normalizedLines.join('\n');
    fs.writeFileSync(filePath, normalizedContent, 'utf8');
    console.log(`✓ Normalized paths in: ${path.relative(projectRoot, filePath)}`);
    return true;
  }
  
  return false;
}

// Process each coverage file
let processed = 0;
for (const filePath of coverageFiles) {
  const relativePath = path.relative(projectRoot, filePath);
  
  if (relativePath.includes('backend')) {
    if (normalizeCoverageFile(filePath, 'backend')) {
      processed++;
    }
  } else if (relativePath.includes('frontend')) {
    if (normalizeCoverageFile(filePath, 'frontend')) {
      processed++;
    }
  } else {
    // Root coverage file - try to detect and normalize both
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('SF:backend/') || content.includes('SF:services\\')) {
        normalizeCoverageFile(filePath, 'backend');
        processed++;
      }
      if (content.includes('SF:frontend/src/') || content.includes('SF:src/')) {
        normalizeCoverageFile(filePath, 'frontend');
        processed++;
      }
    }
  }
}

if (processed > 0) {
  console.log(`\n✓ Normalized ${processed} coverage file(s)`);
} else {
  console.log('\n✓ All coverage files already normalized');
}
