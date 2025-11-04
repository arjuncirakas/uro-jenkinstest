import { testEmailService, verifySMTPConnection } from '../services/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function testEmail() {
  console.log('🧪 Testing Email Service Configuration...\n');
  
  // Check if SMTP configuration is loaded
  console.log('📧 SMTP Configuration:');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`Secure: ${process.env.SMTP_SECURE}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  console.log(`Password: ${process.env.SMTP_PASS ? '***configured***' : 'NOT SET'}\n`);

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP configuration is incomplete. Please check your secure.env file.');
    process.exit(1);
  }

  try {
    // Test SMTP connection
    console.log('1️⃣ Testing SMTP Connection...');
    const connectionTest = await verifySMTPConnection();
    
    if (!connectionTest) {
      console.error('❌ SMTP connection test failed. Please check your credentials and network connection.');
      process.exit(1);
    }

    // Test email sending (use a test email if provided as argument)
    const testEmail = process.argv[2] || 'test@example.com';
    console.log(`\n2️⃣ Testing Email Sending to ${testEmail}...`);
    
    const emailTest = await testEmailService(testEmail);
    
    if (emailTest.success) {
      console.log('✅ Email service test completed successfully!');
      console.log('📧 Check your email inbox for the test OTP email.');
    } else {
      console.error('❌ Email sending test failed:', emailTest.message);
      if (emailTest.error) {
        console.error('Error details:', emailTest.error);
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testEmail().then(() => {
  console.log('\n🎉 Email service test completed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});

