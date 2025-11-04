import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './secure.env' });

// Create SMTP transporter
const createTransporter = () => {
  const config = {
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
    // Add connection pooling and timeout settings
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 30000, // 30 seconds
    // Enable debug logging in development
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  };
  
  console.log(`📧 Creating SMTP transporter with config: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (secure: ${process.env.SMTP_SECURE})`);
  
  return nodemailer.createTransport(config);
};

// Verify SMTP connection
export const verifySMTPConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
};

// Send OTP email
export const sendOTPEmail = async (to, otpCode, type = 'registration') => {
  try {
    const transporter = createTransporter();
    
    // Email templates based on type
    const emailTemplates = {
      registration: {
        subject: 'Verify Your Email - Urology Patient Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Email Verification</h2>
              <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
                Thank you for registering with the Urology Patient Management System.
              </p>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-size: 14px; margin-bottom: 10px;">Your verification code is:</p>
                <h1 style="color: #e74c3c; font-size: 32px; letter-spacing: 5px; margin: 0; font-weight: bold;">${otpCode}</h1>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                This code will expire in 10 minutes. Please do not share this code with anyone.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                If you did not request this verification, please ignore this email.
              </p>
            </div>
          </div>
        `
      },
      password_reset: {
        subject: 'Password Reset - Urology Patient Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Password Reset</h2>
              <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
                You have requested to reset your password for the Urology Patient Management System.
              </p>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-size: 14px; margin-bottom: 10px;">Your reset code is:</p>
                <h1 style="color: #e74c3c; font-size: 32px; letter-spacing: 5px; margin: 0; font-weight: bold;">${otpCode}</h1>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                This code will expire in 10 minutes. Please do not share this code with anyone.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                If you did not request this password reset, please ignore this email.
              </p>
            </div>
          </div>
        `
      },
      login_verification: {
        subject: 'Login Verification - Urology Patient Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Login Verification</h2>
              <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
                A login attempt was made to your Urology Patient Management System account.
              </p>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-size: 14px; margin-bottom: 10px;">Your verification code is:</p>
                <h1 style="color: #e74c3c; font-size: 32px; letter-spacing: 5px; margin: 0; font-weight: bold;">${otpCode}</h1>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                This code will expire in 10 minutes. Please do not share this code with anyone.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                If you did not attempt to login, please contact support immediately.
              </p>
            </div>
          </div>
        `
      },
      password_setup: {
        subject: 'Set Up Your Password - Urology Patient Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
              <h2 style="color: #2c3e50; margin-bottom: 20px;">Welcome to UroPrep!</h2>
              <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
                Your account has been created by the administrator. Please set up your password to complete the registration process.
              </p>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #333; font-size: 14px; margin-bottom: 15px;">Click the button below to set up your password:</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/setup-password?token=${otpCode}" 
                   style="display: inline-block; background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Set Up Password
                </a>
              </div>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                This link will expire in 24 hours. If you did not expect this email, please contact support.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                ${process.env.FRONTEND_URL || 'http://localhost:5173'}/setup-password?token=${otpCode}
              </p>
            </div>
          </div>
        `
      }
    };

    const template = emailTemplates[type] || emailTemplates.registration;

    const mailOptions = {
      from: {
        name: 'Urology Patient Management System',
        address: process.env.SMTP_USER
      },
      to: to,
      subject: template.subject,
      html: template.html,
      text: `Your verification code is: ${otpCode}. This code will expire in 10 minutes.`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent successfully to ${to} (Message ID: ${result.messageId})`);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'OTP email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      errorResponse: error.response,
      message: 'Failed to send OTP email'
    };
  }
};

// Send general notification email
export const sendNotificationEmail = async (to, subject, message, isHtml = false) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Urology Patient Management System',
        address: process.env.SMTP_USER
      },
      to: to,
      subject: subject,
      [isHtml ? 'html' : 'text']: message
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Notification email sent successfully to ${to} (Message ID: ${result.messageId})`);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Notification email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending notification email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      errorResponse: error.response,
      message: 'Failed to send notification email'
    };
  }
};

// Send password setup email
export const sendPasswordSetupEmail = async (to, firstName, token) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: 'Urology Patient Management System',
        address: process.env.SMTP_USER
      },
      to: to,
      subject: 'Set Up Your Password - Urology Patient Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Welcome to UroPrep, ${firstName}!</h2>
            <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
              Your account has been created by the administrator. Please set up your password to complete the registration process.
            </p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #333; font-size: 14px; margin-bottom: 15px;">Click the button below to set up your password:</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/setup-password?token=${token}" 
                 style="display: inline-block; background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Set Up Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This link will expire in 24 hours. If you did not expect this email, please contact support.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              ${process.env.FRONTEND_URL || 'http://localhost:5173'}/setup-password?token=${token}
            </p>
          </div>
        </div>
      `,
      text: `Welcome to UroPrep, ${firstName}! Your account has been created. Please set up your password by visiting: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/setup-password?token=${token}`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Password setup email sent successfully to ${to} (Message ID: ${result.messageId})`);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Password setup email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending password setup email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      errorResponse: error.response,
      message: 'Failed to send password setup email'
    };
  }
};

// Test email functionality
export const testEmailService = async (testEmail) => {
  try {
    console.log('🧪 Testing email service...');
    
    // Test SMTP connection
    const connectionTest = await verifySMTPConnection();
    if (!connectionTest) {
      return {
        success: false,
        message: 'SMTP connection test failed'
      };
    }

    // Test sending OTP email
    const otpTest = await sendOTPEmail(testEmail, '123456', 'registration');
    if (!otpTest.success) {
      return {
        success: false,
        message: 'OTP email test failed',
        error: otpTest.error
      };
    }

    return {
      success: true,
      message: 'Email service test completed successfully'
    };

  } catch (error) {
    console.error('❌ Email service test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Email service test failed'
    };
  }
};
