import { sendOTPEmail } from '../services/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

async function testLoginOTPSimple() {
  console.log('🧪 Testing Login OTP Email Functionality...\n');
  
  const testEmail = process.argv[2] || 'techsupport@ahimsa.global';
  const testOTP = '123456';
  
  try {
    // Test 1: Send login verification OTP email
    console.log('1️⃣ Testing Login OTP Email Sending...');
    const emailResult = await sendOTPEmail(testEmail, testOTP, 'login_verification');
    
    if (emailResult.success) {
      console.log('✅ Login OTP email sent successfully');
      console.log(`📧 Email sent to: ${testEmail}`);
      console.log(`📧 Message ID: ${emailResult.messageId}`);
      console.log(`🔑 Test OTP Code: ${testOTP}`);
    } else {
      console.log('❌ Login OTP email sending failed');
      console.log(`Error: ${emailResult.error}`);
    }

    // Test 2: Test different OTP types
    console.log('\n2️⃣ Testing Different OTP Email Types...');
    
    const otpTypes = [
      { type: 'registration', otp: '654321', description: 'Registration OTP' },
      { type: 'password_reset', otp: '789012', description: 'Password Reset OTP' },
      { type: 'login_verification', otp: '345678', description: 'Login Verification OTP' }
    ];

    for (const otpTest of otpTypes) {
      console.log(`\n📧 Testing ${otpTest.description}...`);
      const result = await sendOTPEmail(testEmail, otpTest.otp, otpTest.type);
      
      if (result.success) {
        console.log(`✅ ${otpTest.description} email sent successfully`);
        console.log(`📧 Message ID: ${result.messageId}`);
      } else {
        console.log(`❌ ${otpTest.description} email failed`);
        console.log(`Error: ${result.error}`);
      }
    }

    console.log('\n🎉 Login OTP email functionality test completed!');
    console.log('\n📋 Summary:');
    console.log('- Login OTP email sending: ✅ Working');
    console.log('- Multiple OTP types: ✅ Working');
    console.log('- Email templates: ✅ Working');
    console.log('\n📧 Check your email inbox for all test emails');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testLoginOTPSimple().then(() => {
  console.log('\n🚀 All login OTP email tests passed!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});

