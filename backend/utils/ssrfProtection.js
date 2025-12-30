/**
 * SSRF (Server-Side Request Forgery) Protection Utilities
 * 
 * This module provides utilities to prevent SSRF attacks by:
 * 1. Validating and sanitizing file paths
 * 2. Preventing path traversal attacks
 * 3. Blocking access to private/internal IP addresses
 * 4. Validating URLs before making external requests
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Private IP address ranges (RFC 1918, RFC 4193, etc.)
 * These should never be accessible from external requests
 */
const PRIVATE_IP_RANGES = [
  // IPv4 Private ranges
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./, // Link-local
  /^0\.0\.0\.0$/,
  // IPv6 Private ranges
  /^::1$/,
  /^fe80:/,
  /^fc00:/,
  /^fd00:/,
];

/**
 * Blocked hostnames that should never be accessed
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
];

/**
 * Validate and normalize a file path to prevent path traversal attacks
 * @param {string} filePath - The file path to validate
 * @param {string} baseDirectory - The base directory that files must be within
 * @returns {Object} - { valid: boolean, normalizedPath: string, error: string }
 */
export const validateFilePath = (filePath, baseDirectory) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      return {
        valid: false,
        normalizedPath: null,
        error: 'File path must be a non-empty string'
      };
    }

    // Decode URL encoding if present
    let decodedPath = filePath;
    try {
      decodedPath = decodeURIComponent(filePath);
    } catch (e) {
      // If decoding fails, use original path
      decodedPath = filePath;
    }

    // Remove any null bytes (path traversal attempt)
    if (decodedPath.includes('\0')) {
      return {
        valid: false,
        normalizedPath: null,
        error: 'Invalid file path: null bytes detected'
      };
    }

    // Normalize the path (resolves .. and . segments)
    // Use path.normalize which handles platform-specific separators correctly
    const normalizedPath = path.normalize(decodedPath);

    // Resolve to absolute path
    const baseDir = path.resolve(baseDirectory);
    const fullPath = path.resolve(baseDir, normalizedPath);

    // Security check: ensure the resolved path is within the base directory
    // Use path.relative to check if the path is within baseDir
    const relativePath = path.relative(baseDir, fullPath);
    
    // If relative path starts with .. or is absolute, it's outside the base directory
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return {
        valid: false,
        normalizedPath: null,
        error: 'Path traversal detected: file path outside allowed directory'
      };
    }

    // Additional check: ensure the full path starts with base directory
    // This handles edge cases with different path separators
    if (!fullPath.startsWith(baseDir + path.sep) && fullPath !== baseDir) {
      return {
        valid: false,
        normalizedPath: null,
        error: 'Path traversal detected: file path outside allowed directory'
      };
    }

    return {
      valid: true,
      normalizedPath: fullPath,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      normalizedPath: null,
      error: `Path validation error: ${error.message}`
    };
  }
};

/**
 * Validate a URL to prevent SSRF attacks
 * @param {string} urlString - The URL to validate
 * @param {Array<string>} allowedHosts - Optional list of allowed hostnames
 * @returns {Object} - { valid: boolean, parsedUrl: URL|null, error: string }
 */
export const validateUrl = (urlString, allowedHosts = []) => {
  try {
    if (!urlString || typeof urlString !== 'string') {
      return {
        valid: false,
        parsedUrl: null,
        error: 'URL must be a non-empty string'
      };
    }

    // Parse the URL
    let parsedUrl;
    try {
      parsedUrl = new URL(urlString);
    } catch (e) {
      return {
        valid: false,
        parsedUrl: null,
        error: `Invalid URL format: ${e.message}`
      };
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        valid: false,
        parsedUrl: null,
        error: `Protocol not allowed: ${parsedUrl.protocol}. Only http and https are allowed.`
      };
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Check against blocked hostnames
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return {
        valid: false,
        parsedUrl: null,
        error: `Blocked hostname: ${hostname}`
      };
    }

    // Check if hostname is a private IP address
    // First, try to resolve hostname to IP (for IPv4)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      // It's an IP address, check if it's private
      for (const range of PRIVATE_IP_RANGES) {
        if (range.test(hostname)) {
          return {
            valid: false,
            parsedUrl: null,
            error: `Private IP address not allowed: ${hostname}`
          };
        }
      }
    }

    // If allowed hosts list is provided, check against it
    if (allowedHosts.length > 0) {
      const isAllowed = allowedHosts.some(allowed => {
        const allowedLower = allowed.toLowerCase();
        return hostname === allowedLower || hostname.endsWith('.' + allowedLower);
      });

      if (!isAllowed) {
        return {
          valid: false,
          parsedUrl: null,
          error: `Hostname not in allowed list: ${hostname}`
        };
      }
    }

    return {
      valid: true,
      parsedUrl: parsedUrl,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      parsedUrl: null,
      error: `URL validation error: ${error.message}`
    };
  }
};

/**
 * Check if an IP address is private/internal
 * @param {string} ipAddress - The IP address to check
 * @returns {boolean} - True if the IP is private/internal
 */
export const isPrivateIP = (ipAddress) => {
  if (!ipAddress || typeof ipAddress !== 'string') {
    return false;
  }

  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(ipAddress)) {
      return true;
    }
  }

  return false;
};

/**
 * Sanitize a file path by removing dangerous characters and patterns
 * @param {string} filePath - The file path to sanitize
 * @returns {string} - The sanitized file path
 */
export const sanitizeFilePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = filePath.replace(/\0/g, '');

  // Remove control characters
  sanitized = sanitized.replace(/[\x01-\x1F\x7F]/g, '');

  // Normalize path separators
  sanitized = path.normalize(sanitized);

  return sanitized;
};

/**
 * Middleware to validate file paths in requests
 * @param {string} paramName - The name of the parameter containing the file path
 * @param {string} baseDirectory - The base directory that files must be within
 * @returns {Function} - Express middleware function
 */
export const validateFilePathMiddleware = (paramName = 'filePath', baseDirectory = null) => {
  return (req, res, next) => {
    console.log('🔒 [validateFilePathMiddleware] ==========================================');
    console.log('🔒 [validateFilePathMiddleware] Middleware called');
    console.log('🔒 [validateFilePathMiddleware] Method:', req.method);
    console.log('🔒 [validateFilePathMiddleware] Original URL:', req.originalUrl);
    console.log('🔒 [validateFilePathMiddleware] Path:', req.path);
    console.log('🔒 [validateFilePathMiddleware] Base URL:', req.baseUrl);
    console.log('🔒 [validateFilePathMiddleware] URL:', req.url);
    console.log('🔒 [validateFilePathMiddleware] Params:', req.params);
    console.log('🔒 [validateFilePathMiddleware] Param name:', paramName);
    console.log('🔒 [validateFilePathMiddleware] Looking for param:', paramName);
    
    let filePath = req.params[paramName] || req.body[paramName] || req.query[paramName];
    console.log('🔒 [validateFilePathMiddleware] Extracted filePath:', filePath);
    console.log('🔒 [validateFilePathMiddleware] filePath from params:', req.params[paramName]);
    console.log('🔒 [validateFilePathMiddleware] filePath from body:', req.body[paramName]);
    console.log('🔒 [validateFilePathMiddleware] filePath from query:', req.query[paramName]);

    if (!filePath) {
      console.log('🔒 [validateFilePathMiddleware] ERROR - No file path found');
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    // Decode URL encoding if present (Express should do this, but be safe)
    try {
      filePath = decodeURIComponent(filePath);
      console.log('🔒 [validateFilePathMiddleware] Decoded filePath:', filePath);
    } catch (e) {
      // If decoding fails, use original path
      console.warn('🔒 [validateFilePathMiddleware] Failed to decode file path:', filePath, e);
    }

    // Normalize the file path - remove 'uploads/' prefix if present
    // File paths stored in DB might be 'uploads/investigations/file.pdf' or 'investigations/file.pdf'
    // We need to handle both formats
    const originalFilePath = filePath;
    if (filePath.startsWith('uploads/') || filePath.startsWith('uploads\\')) {
      // Remove 'uploads/' prefix
      filePath = filePath.replace(/^uploads[/\\]/, '');
      console.log('🔒 [validateFilePathMiddleware] Removed uploads/ prefix');
      console.log('🔒 [validateFilePathMiddleware] Original:', originalFilePath);
      console.log('🔒 [validateFilePathMiddleware] After removal:', filePath);
      // Update the param so serveFile can use it
      if (req.params[paramName]) {
        req.params[paramName] = filePath;
      }
    }

    // Use provided base directory or default to uploads directory
    const baseDir = baseDirectory || path.join(process.cwd(), 'uploads');
    console.log('🔒 [validateFilePathMiddleware] Base directory:', baseDir);
    console.log('🔒 [validateFilePathMiddleware] Current working directory:', process.cwd());

    console.log('🔒 [validateFilePathMiddleware] Validating file path:', {
      original: req.params[paramName],
      decoded: filePath,
      baseDir: baseDir
    });

    const validation = validateFilePath(filePath, baseDir);
    console.log('🔒 [validateFilePathMiddleware] Validation result:', validation);

    if (!validation.valid) {
      console.warn('🔒 [validateFilePathMiddleware] ERROR - Invalid file path:', filePath, '-', validation.error);
      return res.status(403).json({
        success: false,
        message: 'Invalid file path',
        error: validation.error
      });
    }

    // Attach validated path to request object
    req.validatedFilePath = validation.normalizedPath;
    console.log('🔒 [validateFilePathMiddleware] Validated file path:', {
      normalized: validation.normalizedPath,
      exists: fs.existsSync(validation.normalizedPath)
    });
    console.log('🔒 [validateFilePathMiddleware] Calling next()');
    next();
  };
};

export default {
  validateFilePath,
  validateUrl,
  isPrivateIP,
  sanitizeFilePath,
  validateFilePathMiddleware
};




