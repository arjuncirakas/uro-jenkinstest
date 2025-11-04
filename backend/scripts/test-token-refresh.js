import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../secure.env') });

/**
 * Token Refresh Diagnostic Tool
 * Tests CORS and token refresh configuration
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}=== ${msg} ===${colors.reset}\n`)
};

async function runDiagnostics() {
  log.section('Token Refresh & CORS Diagnostic Tool');
  
  let hasErrors = false;
  
  // Step 1: Check Environment Variables
  log.section('Step 1: Environment Variables Check');
  
  const requiredVars = {
    'NODE_ENV': process.env.NODE_ENV,
    'FRONTEND_URL': process.env.FRONTEND_URL,
    'JWT_SECRET': process.env.JWT_SECRET ? '✓ Set' : undefined,
    'JWT_REFRESH_SECRET': process.env.JWT_REFRESH_SECRET ? '✓ Set' : undefined,
    'JWT_EXPIRES_IN': process.env.JWT_EXPIRES_IN,
    'JWT_REFRESH_EXPIRES_IN': process.env.JWT_REFRESH_EXPIRES_IN,
  };
  
  for (const [key, value] of Object.entries(requiredVars)) {
    if (value) {
      log.success(`${key} = ${value}`);
    } else {
      log.error(`${key} is NOT SET`);
      hasErrors = true;
    }
  }
  
  // Step 2: Validate Configuration
  log.section('Step 2: Configuration Validation');
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  const frontendUrl = process.env.FRONTEND_URL;
  
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Frontend URL: ${frontendUrl || 'NOT SET'}\n`);
  
  // Check NODE_ENV
  if (!nodeEnv) {
    log.warning('NODE_ENV is not set, defaulting to "development"');
  } else if (nodeEnv === 'production') {
    log.success('Running in PRODUCTION mode');
  } else {
    log.info(`Running in ${nodeEnv.toUpperCase()} mode`);
  }
  
  // Check FRONTEND_URL
  if (!frontendUrl) {
    log.error('FRONTEND_URL is not set!');
    log.info('Token refresh will fail in production without FRONTEND_URL');
    hasErrors = true;
  } else {
    log.success('FRONTEND_URL is configured');
    
    // Check for common mistakes
    if (frontendUrl.endsWith('/')) {
      log.warning('FRONTEND_URL ends with "/" - should not have trailing slash');
      log.info(`Current: ${frontendUrl}`);
      log.info(`Should be: ${frontendUrl.slice(0, -1)}`);
    }
    
    if (nodeEnv === 'production' && frontendUrl.startsWith('http://')) {
      log.warning('Using HTTP in production - should use HTTPS');
      log.info(`Current: ${frontendUrl}`);
      log.info(`Should be: ${frontendUrl.replace('http://', 'https://')}`);
    }
    
    if (nodeEnv === 'production' && (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1'))) {
      log.error('FRONTEND_URL is set to localhost in PRODUCTION!');
      log.error('This will cause CORS errors and token refresh will fail');
      log.info('Set FRONTEND_URL to your actual production URL');
      hasErrors = true;
    }
  }
  
  // Step 3: Check JWT Configuration
  log.section('Step 3: JWT Token Configuration');
  
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  
  log.info(`Access Token Expiry: ${jwtExpiresIn}`);
  log.info(`Refresh Token Expiry: ${jwtRefreshExpiresIn}`);
  
  // Parse expiry times
  const parseTime = (timeStr) => {
    const match = timeStr.match(/^(\d+)([mhd])$/);
    if (!match) return null;
    
    const [, amount, unit] = match;
    const multipliers = { m: 60, h: 3600, d: 86400 };
    return parseInt(amount) * (multipliers[unit] || 0);
  };
  
  const accessExpiry = parseTime(jwtExpiresIn);
  const refreshExpiry = parseTime(jwtRefreshExpiresIn);
  
  if (accessExpiry && refreshExpiry) {
    if (accessExpiry >= refreshExpiry) {
      log.warning('Access token expiry >= Refresh token expiry!');
      log.info('Refresh token should last longer than access token');
      log.info(`Access: ${jwtExpiresIn}, Refresh: ${jwtRefreshExpiresIn}`);
    } else {
      log.success('Token expiry times are configured correctly');
    }
  }
  
  // Check JWT secrets
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (jwtSecret && jwtSecret.length < 32) {
    log.warning('JWT_SECRET is shorter than 32 characters - consider using a longer secret');
  }
  
  if (jwtRefreshSecret && jwtRefreshSecret.length < 32) {
    log.warning('JWT_REFRESH_SECRET is shorter than 32 characters - consider using a longer secret');
  }
  
  if (jwtSecret === jwtRefreshSecret) {
    log.warning('JWT_SECRET and JWT_REFRESH_SECRET are the same!');
    log.info('For better security, use different secrets for access and refresh tokens');
  }
  
  // Step 4: Test Server Connection
  log.section('Step 4: Server Connection Test');
  
  const backendPort = process.env.PORT || 5000;
  const backendUrl = `http://localhost:${backendPort}`;
  
  log.info(`Testing connection to: ${backendUrl}/health`);
  
  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      log.success(`Server is running (Status: ${response.status})`);
      log.info(`Environment: ${data.environment || 'unknown'}`);
      log.info(`Timestamp: ${data.timestamp || 'unknown'}`);
    } else {
      log.error(`Server responded with status ${response.status}`);
      hasErrors = true;
    }
  } catch (error) {
    log.error('Cannot connect to backend server');
    log.info(`Error: ${error.message}`);
    log.info('Make sure the backend server is running');
    log.info(`Start with: npm run dev or npm start`);
    hasErrors = true;
  }
  
  // Step 5: Test CORS Preflight
  log.section('Step 5: CORS Preflight Test');
  
  if (frontendUrl && !hasErrors) {
    log.info(`Testing CORS from origin: ${frontendUrl}`);
    
    try {
      const response = await fetch(`${backendUrl}/api/auth/refresh-token`, {
        method: 'OPTIONS',
        headers: {
          'Origin': frontendUrl,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization'
        }
      });
      
      const allowOrigin = response.headers.get('access-control-allow-origin');
      const allowCredentials = response.headers.get('access-control-allow-credentials');
      const allowMethods = response.headers.get('access-control-allow-methods');
      
      console.log('\nCORS Headers:');
      console.log(`  Access-Control-Allow-Origin: ${allowOrigin || 'NOT SET'}`);
      console.log(`  Access-Control-Allow-Credentials: ${allowCredentials || 'NOT SET'}`);
      console.log(`  Access-Control-Allow-Methods: ${allowMethods || 'NOT SET'}`);
      
      if (allowOrigin === frontendUrl) {
        log.success('CORS is configured correctly!');
      } else if (allowOrigin === '*') {
        log.warning('CORS allows all origins (*)');
        log.info('This works but is less secure than specifying exact origin');
      } else {
        log.error(`CORS origin mismatch!`);
        log.info(`Expected: ${frontendUrl}`);
        log.info(`Got: ${allowOrigin || 'NOT SET'}`);
        log.info('Token refresh will fail due to CORS blocking');
        hasErrors = true;
      }
      
      if (allowCredentials === 'true') {
        log.success('CORS credentials enabled');
      } else {
        log.error('CORS credentials NOT enabled');
        log.info('Token refresh requires credentials to be enabled');
        hasErrors = true;
      }
      
      if (allowMethods && allowMethods.includes('POST')) {
        log.success('POST method allowed');
      } else {
        log.error('POST method not allowed in CORS');
        hasErrors = true;
      }
      
    } catch (error) {
      log.error('CORS preflight test failed');
      log.info(`Error: ${error.message}`);
      hasErrors = true;
    }
  } else {
    log.warning('Skipping CORS test - server not reachable or FRONTEND_URL not set');
  }
  
  // Step 6: Recommendations
  log.section('Recommendations');
  
  if (hasErrors) {
    console.log(`${colors.red}${colors.bright}⚠️  Issues Found!${colors.reset}\n`);
    
    console.log('To fix token refresh issues in production:\n');
    
    if (!frontendUrl || (nodeEnv === 'production' && frontendUrl.includes('localhost'))) {
      console.log('1. Update FRONTEND_URL in your production .env file:');
      console.log('   FRONTEND_URL=https://uroprep.ahimsa.global\n');
    }
    
    if (nodeEnv !== 'production') {
      console.log('2. Set NODE_ENV=production in your production environment\n');
    }
    
    console.log('3. Restart your backend server:');
    console.log('   pm2 restart all');
    console.log('   # or');
    console.log('   npm run start\n');
    
    console.log('4. Test token refresh from your frontend:');
    console.log('   - Log in');
    console.log('   - Refresh the page');
    console.log('   - Check browser console for CORS errors\n');
    
    console.log('5. For detailed guide, see:');
    console.log('   backend/TOKEN_REFRESH_PRODUCTION_FIX.md\n');
    
  } else {
    console.log(`${colors.green}${colors.bright}✅ All checks passed!${colors.reset}\n`);
    console.log('Your token refresh configuration looks good.\n');
    
    console.log('Next steps:');
    console.log('1. Test login and page refresh in production');
    console.log('2. Monitor browser console for any CORS errors');
    console.log('3. Check backend logs for token refresh attempts');
    console.log('4. Verify users stay logged in after page refresh\n');
  }
  
  // Summary
  log.section('Summary');
  
  console.log('Configuration Status:');
  console.log(`  Environment: ${nodeEnv}`);
  console.log(`  Frontend URL: ${frontendUrl || 'NOT SET'}`);
  console.log(`  Access Token Expiry: ${jwtExpiresIn}`);
  console.log(`  Refresh Token Expiry: ${jwtRefreshExpiresIn}`);
  console.log(`  Server Running: ${hasErrors ? 'Check required' : 'Yes'}`);
  console.log(`  CORS Configured: ${hasErrors ? 'Issues found' : 'Yes'}`);
  
  if (hasErrors) {
    console.log(`\n${colors.red}Status: ❌ Configuration issues detected${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}Status: ✅ Ready for production${colors.reset}`);
  }
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('Diagnostic tool error:', error);
  process.exit(1);
});

