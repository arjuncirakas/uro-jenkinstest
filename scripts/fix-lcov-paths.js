import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Fix paths in LCOV file to be relative to project root
 * @param {string} lcovPath - Path to the LCOV file
 * @param {string} prefix - Prefix to add to paths (e.g., 'backend' or 'frontend/src')
 * @param {string} baseDir - Base directory for resolving relative paths (e.g., 'backend' or 'frontend')
 */
function fixLcovPaths(lcovPath, prefix, baseDir = null) {
  if (!fs.existsSync(lcovPath)) {
    console.log(`⚠️  Coverage file not found: ${lcovPath}`);
    return false;
  }

  console.log(`📝 Fixing paths in: ${lcovPath}`);
  console.log(`   Adding prefix: ${prefix}`);

  let content = fs.readFileSync(lcovPath, 'utf8');
  let modified = false;
  let lineCount = 0;

  // Get the directory containing the lcov file for resolving relative paths
  const lcovDir = path.dirname(lcovPath);
  const baseDirPath = baseDir ? path.join(projectRoot, baseDir) : lcovDir;

  // Split into lines and process each line
  const lines = content.split('\n');
  const fixedLines = lines.map((line) => {
    // Match SF: (source file) lines
    if (line.startsWith('SF:')) {
      const filePath = line.substring(3); // Remove 'SF:' prefix
      
      // Normalize backslashes to forward slashes FIRST
      let normalizedPath = filePath.replace(/\\/g, '/');
      
      // Skip if already has the correct prefix (after normalization)
      if (normalizedPath.startsWith(prefix + '/')) {
        return line;
      }
      
      // Handle absolute paths - convert to relative
      if (path.isAbsolute(filePath)) {
        // Try to make it relative to project root
        try {
          normalizedPath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
        } catch (e) {
          // If that fails, try relative to baseDir
          if (baseDir) {
            try {
              normalizedPath = path.relative(baseDirPath, filePath).replace(/\\/g, '/');
            } catch (e2) {
              console.warn(`⚠️  Could not normalize absolute path: ${filePath}`);
            }
          }
        }
      }
      
      // Remove leading ./ or .\ if present
      normalizedPath = normalizedPath.replace(/^\.\//, '').replace(/^\.\\/, '');
      
      // For backend: detect all backend files comprehensively
      if (prefix === 'backend') {
        // Check if it's a backend file (server.js or files in backend directories)
        const isBackendFile = normalizedPath === 'server.js' || 
          normalizedPath.match(/^(config|controllers|middleware|services|schedulers|utils|routes)\//);
        
        if (isBackendFile && !normalizedPath.startsWith('backend/')) {
          normalizedPath = `backend/${normalizedPath}`;
          modified = true;
          lineCount++;
        }
      }
      // For frontend: handle frontend paths
      else if (prefix === 'frontend/src') {
        // Handle paths like 'src/components/...' -> 'frontend/src/components/...'
        if (normalizedPath.startsWith('src/') && !normalizedPath.startsWith('frontend/')) {
          normalizedPath = `frontend/${normalizedPath}`;
          modified = true;
          lineCount++;
        }
        // Handle absolute paths that might include 'frontend/src' already
        else if (normalizedPath.includes('frontend/src/')) {
          // Extract the part after 'frontend/src/'
          const match = normalizedPath.match(/frontend\/src\/(.+)$/);
          if (match) {
            normalizedPath = `frontend/src/${match[1]}`;
            modified = true;
            lineCount++;
          }
        }
        // Handle paths that are already relative to frontend directory but missing prefix
        else if (!normalizedPath.startsWith('frontend/') && !normalizedPath.startsWith('src/')) {
          normalizedPath = `${prefix}/${normalizedPath}`;
          modified = true;
          lineCount++;
        }
      }
      
      // Ensure we use forward slashes (redundant but safe)
      normalizedPath = normalizedPath.replace(/\\/g, '/');

      return `SF:${normalizedPath}`;
    }

    return line;
  });

  if (modified) {
    fs.writeFileSync(lcovPath, fixedLines.join('\n'), 'utf8');
    console.log(`✅ Fixed ${lineCount} paths in ${lcovPath}`);
    return true;
  } else {
    console.log(`ℹ️  No changes needed in ${lcovPath}`);
    return false;
  }
}

// Main execution
console.log('🔧 Fixing LCOV file paths for SonarQube...\n');

let anyFixed = false;

// Fix backend coverage
const backendLcov = path.join(projectRoot, 'backend', 'coverage', 'lcov.info');
if (fixLcovPaths(backendLcov, 'backend', 'backend')) {
  anyFixed = true;
}

// Fix frontend coverage
const frontendLcov = path.join(projectRoot, 'frontend', 'coverage', 'lcov.info');
if (fixLcovPaths(frontendLcov, 'frontend/src', 'frontend')) {
  anyFixed = true;
}

// Fix root coverage (if it exists, ensure paths are correct)
// Root coverage might have mixed backend and frontend files
const rootLcov = path.join(projectRoot, 'coverage', 'lcov.info');
if (fs.existsSync(rootLcov)) {
  console.log(`\n📝 Checking root coverage file: ${rootLcov}`);
  let content = fs.readFileSync(rootLcov, 'utf8');
  const lines = content.split('\n');
  let needsFix = false;
  let fixedContent = [];
  let lineCount = 0;
  
  lines.forEach((line) => {
    if (line.startsWith('SF:')) {
      const filePath = line.substring(3);
      // Normalize backslashes to forward slashes FIRST
      let normalizedPath = filePath.replace(/\\/g, '/');
      const originalNormalized = normalizedPath;
      
      // Handle absolute paths - convert to relative
      if (path.isAbsolute(filePath)) {
        try {
          normalizedPath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
        } catch (e) {
          // Keep original if can't resolve
        }
      }
      
      // Remove leading ./ or .\ if present
      normalizedPath = normalizedPath.replace(/^\.\//, '').replace(/^\.\\/, '');
      
      // Check if it's a backend file (server.js or files in backend directories)
      const isBackendFile = normalizedPath === 'server.js' || 
        normalizedPath.match(/^(config|controllers|middleware|services|schedulers|utils|routes)\//);
      
      // Check if it's a frontend file
      const isFrontendFile = normalizedPath.startsWith('src/') || 
        normalizedPath.startsWith('frontend/src/');
      
      // Fix backend files
      if (isBackendFile && !normalizedPath.startsWith('backend/')) {
        normalizedPath = `backend/${normalizedPath}`;
        needsFix = true;
        lineCount++;
      }
      // Fix frontend files
      else if (isFrontendFile && !normalizedPath.startsWith('frontend/')) {
        if (normalizedPath.startsWith('src/')) {
          normalizedPath = `frontend/${normalizedPath}`;
        } else if (normalizedPath.startsWith('frontend/src/')) {
          // Already correct, but ensure format is consistent
          normalizedPath = normalizedPath;
        }
        needsFix = true;
        lineCount++;
      }
      
      // Ensure we use forward slashes
      normalizedPath = normalizedPath.replace(/\\/g, '/');
      
      if (normalizedPath !== originalNormalized) {
        fixedContent.push(`SF:${normalizedPath}`);
      } else {
        fixedContent.push(line);
      }
    } else {
      fixedContent.push(line);
    }
  });
  
  if (needsFix) {
    fs.writeFileSync(rootLcov, fixedContent.join('\n'), 'utf8');
    console.log(`✅ Fixed ${lineCount} paths in root coverage file`);
    anyFixed = true;
  } else {
    console.log(`ℹ️  Root coverage file paths are already correct`);
  }
}

if (anyFixed) {
  console.log('\n✅ LCOV path fixing completed!');
} else {
  console.log('\nℹ️  All LCOV files already have correct paths.');
}
