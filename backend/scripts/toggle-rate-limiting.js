import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the .env file
const envPath = path.join(__dirname, '..', 'secure.env');

// Function to toggle rate limiting
const toggleRateLimiting = (enable) => {
  try {
    // Read the current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update the ENABLE_RATE_LIMITING value
    const newValue = enable ? 'true' : 'false';
    const status = enable ? 'ENABLED' : 'DISABLED';
    
    envContent = envContent.replace(
      /ENABLE_RATE_LIMITING=.*/,
      `ENABLE_RATE_LIMITING=${newValue}`
    );
    
    // Write back to the file
    fs.writeFileSync(envPath, envContent);
    
    console.log(`✅ Rate limiting has been ${status}`);
    console.log(`📝 Updated secure.env: ENABLE_RATE_LIMITING=${newValue}`);
    
    if (enable) {
      console.log('\n📋 Rate Limiting Settings:');
      console.log(`   General: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${(process.env.RATE_LIMIT_WINDOW_MS || 900000) / 60000} minutes`);
      console.log(`   Auth: ${process.env.AUTH_RATE_LIMIT_MAX || 5} attempts per 15 minutes`);
      console.log(`   OTP: ${process.env.OTP_RATE_LIMIT_MAX || 3} requests per 5 minutes`);
      console.log(`   Registration: ${process.env.REGISTRATION_RATE_LIMIT_MAX || 3} attempts per hour`);
    }
    
    console.log('\n🔄 Please restart the server for changes to take effect.');
    
  } catch (error) {
    console.error('❌ Error toggling rate limiting:', error.message);
    process.exit(1);
  }
};

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'enable') {
  toggleRateLimiting(true);
} else if (command === 'disable') {
  toggleRateLimiting(false);
} else if (command === 'status') {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/ENABLE_RATE_LIMITING=(.*)/);
    const isEnabled = match ? match[1] === 'true' : false;
    console.log(`🛡️  Rate Limiting Status: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    console.error('❌ Error reading rate limiting status:', error.message);
  }
} else {
  console.log('🔧 Rate Limiting Toggle Script');
  console.log('\nUsage:');
  console.log('  node scripts/toggle-rate-limiting.js enable   - Enable rate limiting');
  console.log('  node scripts/toggle-rate-limiting.js disable  - Disable rate limiting');
  console.log('  node scripts/toggle-rate-limiting.js status   - Check current status');
  console.log('\nOr manually edit secure.env:');
  console.log('  ENABLE_RATE_LIMITING=true   - Enable');
  console.log('  ENABLE_RATE_LIMITING=false  - Disable');
}

