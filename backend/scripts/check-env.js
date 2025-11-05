import dotenv from 'dotenv';

// Try loading both env files
console.log('🔍 Checking Environment Variables...\n');

// Load .env (used by server.js)
dotenv.config();
console.log('📄 From .env (or system environment):');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('   SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
console.log('   SMTP_PASS Length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
console.log('   SMTP_PASS Has Spaces:', process.env.SMTP_PASS ? process.env.SMTP_PASS.includes(' ') : false);
console.log('');

console.log('\n📄 Reloading from .env to verify consistency:');
dotenv.config();
console.log('   (All sources now use .env)');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
console.log('   SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
console.log('   SMTP_PASS Length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
console.log('   SMTP_PASS Has Spaces:', process.env.SMTP_PASS ? process.env.SMTP_PASS.includes(' ') : '❌ TRUE - THIS IS THE PROBLEM!');

if (process.env.SMTP_PASS && process.env.SMTP_PASS.includes(' ')) {
  console.log('\n⚠️  WARNING: SMTP_PASS contains spaces!');
  console.log('   This will cause email authentication to fail.');
  console.log('   Remove all spaces from the Gmail App Password.');
}

