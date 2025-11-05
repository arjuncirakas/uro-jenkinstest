import dotenv from 'dotenv';
import { sendPasswordSetupEmail, verifySMTPConnection, testEmailService } from '../services/emailService.js';

// Load environment variables
dotenv.config();

const testEmail = async () => {
  try {
    console.log('🧪 Testing Email Service Configuration\n');
    console.log('📋 Current Configuration:');
    console.log(`   SMTP Host: ${process.env.SMTP_HOST}`);
    console.log(`   SMTP Port: ${process.env.SMTP_PORT}`);
    console.log(`   SMTP Secure: ${process.env.SMTP_SECURE}`);
    console.log(`   SMTP User: ${process.env.SMTP_USER}`);
    console.log(`   SMTP Pass: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET'}`);
    console.log('');

    // Test 1: Verify SMTP Connection
    console.log('📡 Test 1: Verifying SMTP Connection...');
    const connectionResult = await verifySMTPConnection();
    
    if (!connectionResult) {
      console.error('❌ SMTP connection failed!');
      console.error('   Please check your SMTP credentials and try again.');
      console.error('   Common issues:');
      console.error('   1. SMTP_PASS should NOT have spaces (remove spaces from App Password)');
      console.error('   2. Make sure "Less secure app access" or "App Passwords" is enabled');
      console.error('   3. Check if your firewall/network allows SMTP connections');
      process.exit(1);
    }

    console.log('✅ SMTP connection successful!\n');

    // Test 2: Send a test password setup email
    const testEmailAddress = process.env.TEST_EMAIL || process.env.SMTP_USER;
    console.log(`📧 Test 2: Sending test password setup email to ${testEmailAddress}...`);
    
    const emailResult = await sendPasswordSetupEmail(
      testEmailAddress,
      'Test User',
      'test-token-123456'
    );

    if (!emailResult.success) {
      console.error('❌ Failed to send test email!');
      console.error('   Error:', emailResult.error);
      console.error('   Error Code:', emailResult.errorCode);
      console.error('   Error Response:', emailResult.errorResponse);
      process.exit(1);
    }

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${emailResult.messageId}`);
    console.log(`   Check your inbox at ${testEmailAddress}\n`);

    console.log('🎉 All tests passed! Email service is working correctly.');

  } catch (error) {
    console.error('❌ Email service test failed:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      response: error.response
    });
    process.exit(1);
  }
};

// Run the test
testEmail();
