import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../secure.env') });

/**
 * Diagnostic Email Testing Script
 * This script helps diagnose email configuration issues
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

// Get test email from command line argument
const testEmail = process.argv[2];

if (!testEmail) {
  log.error('Please provide a test email address');
  console.log(`\nUsage: node scripts/test-email.js your-email@example.com\n`);
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  log.error('Invalid email address format');
  process.exit(1);
}

async function testEmailConfiguration() {
  try {
    log.section('Email Configuration Diagnostic Tool');
    
    // Step 1: Check Environment Variables
    log.section('Step 1: Checking Environment Variables');
    
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    let allVarsPresent = true;
    
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        log.success(`${varName} is set`);
      } else {
        log.error(`${varName} is missing`);
        allVarsPresent = false;
      }
    }
    
    if (!allVarsPresent) {
      log.error('Some required environment variables are missing. Please check your .env file.');
      process.exit(1);
    }
    
    // Display configuration (hide password)
    console.log('\nCurrent Configuration:');
    console.log(`  SMTP_HOST: ${process.env.SMTP_HOST}`);
    console.log(`  SMTP_PORT: ${process.env.SMTP_PORT}`);
    console.log(`  SMTP_SECURE: ${process.env.SMTP_SECURE}`);
    console.log(`  SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`  SMTP_PASS: ${'*'.repeat(process.env.SMTP_PASS?.length || 0)} (hidden)`);
    
    // Step 2: Create Transporter
    log.section('Step 2: Creating SMTP Transporter');
    
    const transporterConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      debug: true, // Enable debug output
      logger: true // Enable logger
    };
    
    log.info('Creating transporter with debug mode enabled...');
    const transporter = nodemailer.createTransporter(transporterConfig);
    log.success('Transporter created successfully');
    
    // Step 3: Verify SMTP Connection
    log.section('Step 3: Verifying SMTP Connection');
    log.info('Attempting to connect to SMTP server...');
    
    try {
      await transporter.verify();
      log.success('SMTP connection verified successfully!');
      log.info('Your SMTP server is reachable and authentication works');
    } catch (error) {
      log.error('SMTP connection verification failed');
      console.error('\nError Details:');
      console.error(`  Message: ${error.message}`);
      console.error(`  Code: ${error.code || 'N/A'}`);
      console.error(`  Command: ${error.command || 'N/A'}`);
      console.error(`  Response: ${error.response || 'N/A'}`);
      console.error(`  Response Code: ${error.responseCode || 'N/A'}`);
      
      // Provide helpful suggestions
      console.log('\n' + colors.yellow + 'Troubleshooting Suggestions:' + colors.reset);
      
      if (error.code === 'ECONNREFUSED') {
        log.warning('Port is blocked or SMTP service is not accessible');
        log.info('Try: Check firewall settings, try a different port (465 or 587)');
      } else if (error.code === 'ETIMEDOUT') {
        log.warning('Connection timed out');
        log.info('Try: Check network settings, firewall rules, or try a different SMTP provider');
      } else if (error.code === 'EAUTH' || error.responseCode === 535) {
        log.warning('Authentication failed');
        log.info('Try: Verify credentials, regenerate SMTP password, check if 2FA/App Password is required');
      } else if (error.responseCode === 550) {
        log.warning('Email rejected by server');
        log.info('Try: Check sender reputation, verify domain, check if using development sandbox');
      }
      
      log.section('Recommended Actions');
      log.info('1. Switch to a production-ready email service (Brevo, SendGrid, AWS SES)');
      log.info('2. Check EMAIL_TROUBLESHOOTING.md for detailed solutions');
      log.info('3. Verify your production server can reach the SMTP host:');
      log.info(`   telnet ${process.env.SMTP_HOST} ${process.env.SMTP_PORT}`);
      
      process.exit(1);
    }
    
    // Step 4: Send Test Email
    log.section('Step 4: Sending Test Email');
    log.info(`Sending test email to: ${testEmail}`);
    
    const mailOptions = {
      from: {
        name: 'Urology System - Email Test',
        address: process.env.SMTP_USER
      },
      to: testEmail,
      subject: '✅ Email Configuration Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f0f9ff; padding: 30px; border-radius: 10px; border-left: 4px solid #14b8a6;">
            <h2 style="color: #0f766e; margin-top: 0;">🎉 Email Test Successful!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your email configuration is working correctly. This test email was sent from your 
              Urology Patient Management System to verify SMTP settings.
            </p>
            
            <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #0f766e; margin-top: 0;">Configuration Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>SMTP Host:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${process.env.SMTP_HOST}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>SMTP Port:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${process.env.SMTP_PORT}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>Secure:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${process.env.SMTP_SECURE === 'true' ? 'Yes (SSL)' : 'No (STARTTLS)'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>From Address:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${process.env.SMTP_USER}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;"><strong>Test Date:</strong></td>
                  <td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>✅ Next Steps:</strong><br>
                Your email service is ready for production use. User registration, password resets, 
                and notification emails will now work correctly.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This is an automated test email from the Urology Patient Management System.<br>
              If you received this email unexpectedly, please contact your system administrator.
            </p>
          </div>
        </div>
      `,
      text: `
Email Configuration Test - Success!

Your email configuration is working correctly. This test email was sent from your 
Urology Patient Management System to verify SMTP settings.

Configuration Details:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- Secure: ${process.env.SMTP_SECURE === 'true' ? 'Yes (SSL)' : 'No (STARTTLS)'}
- From Address: ${process.env.SMTP_USER}
- Test Date: ${new Date().toLocaleString()}

Your email service is ready for production use.
      `
    };
    
    try {
      const result = await transporter.sendMail(mailOptions);
      log.success('Test email sent successfully!');
      console.log(`\n  Message ID: ${result.messageId}`);
      console.log(`  Recipient: ${testEmail}`);
      log.info('Please check your inbox (and spam folder) for the test email');
      
      // Final success message
      log.section('✨ All Tests Passed!');
      log.success('Your email configuration is working correctly');
      log.success('User registration and password reset emails will now work in production');
      
      console.log('\n' + colors.green + 'Recommended: Monitor your email service dashboard for delivery rates' + colors.reset);
      
    } catch (error) {
      log.error('Failed to send test email');
      console.error('\nError Details:');
      console.error(`  Message: ${error.message}`);
      console.error(`  Code: ${error.code || 'N/A'}`);
      console.error(`  Response: ${error.response || 'N/A'}`);
      
      log.section('Troubleshooting');
      log.info('Connection works but email sending failed. This could mean:');
      log.warning('1. Email address is blocked or invalid');
      log.warning('2. Daily sending limit reached');
      log.warning('3. Sender email needs to be verified');
      log.warning('4. Domain authentication (SPF/DKIM) not configured');
      
      process.exit(1);
    }
    
  } catch (error) {
    log.error('Unexpected error occurred');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration();

