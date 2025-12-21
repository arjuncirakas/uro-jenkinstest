import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create SMTP transporter
const createTransporter = () => {
  // Validate required environment variables
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP configuration missing! Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
    throw new Error('SMTP configuration is incomplete. Please check your .env file.');
  }

  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
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
  
  console.log(`📧 Creating SMTP transporter with config: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (secure: ${config.secure})`);
  console.log(`📧 SMTP User: ${process.env.SMTP_USER}`);
  
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
    console.log(`📧 Attempting to send OTP email to ${to} (Type: ${type})`);
    
    // Validate email address
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid email address: ${to}`);
    }
    
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
    
    // Get frontend URL - if multiple URLs are set (comma-separated), use the first one (production)
    const getFrontendUrl = () => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      // If multiple URLs are comma-separated (for CORS), take the first one
      return frontendUrl.split(',')[0].trim();
    };
    
    const frontendUrl = getFrontendUrl();
    
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
              <a href="${frontendUrl}/setup-password?token=${token}" 
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
              ${frontendUrl}/setup-password?token=${token}
            </p>
          </div>
        </div>
      `,
      text: `Welcome to UroPrep, ${firstName}! Your account has been created. Please set up your password by visiting: ${frontendUrl}/setup-password?token=${token}`
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

// Send password email (with auto-generated password)
export const sendPasswordEmail = async (to, firstName, password) => {
  try {
    // Validate inputs
    if (!to || !firstName || !password) {
      throw new Error('Missing required parameters: to, firstName, or password');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email address: ${to}`);
    }

    console.log(`📧 Preparing to send password email to ${to} for ${firstName}`);
    
    const transporter = createTransporter();
    
    // Verify SMTP connection before sending
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }
    
    const mailOptions = {
      from: {
        name: 'Urology Patient Management System',
        address: process.env.SMTP_USER
      },
      to: to,
      subject: 'Your Account Credentials - Urology Patient Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">Welcome to UroPrep, ${firstName}!</h2>
            <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
              Your account has been created successfully. Below are your login credentials:
            </p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #14b8a6;">
              <p style="color: #333; font-size: 14px; margin-bottom: 10px;"><strong>Email:</strong> ${to}</p>
              <p style="color: #333; font-size: 14px; margin-bottom: 15px;"><strong>Temporary Password:</strong></p>
              <div style="background-color: #f0f0f0; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold; color: #14b8a6; letter-spacing: 2px;">
                ${password}
              </div>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              <strong>Important:</strong> Please log in with these credentials and change your password after your first login for security purposes.
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
              If you did not expect this email, please contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
      text: `Welcome to UroPrep, ${firstName}! Your account has been created. Email: ${to}, Temporary Password: ${password}. Please log in and change your password after first login.`
    };

    console.log(`📧 Sending email to ${to}...`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Password email sent successfully to ${to} (Message ID: ${result.messageId})`);
    console.log(`📧 Email response:`, {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response
    });
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Password email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending password email:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      errorResponse: error.response,
      message: 'Failed to send password email'
    };
  }
};

// Send appointment reminder email
export const sendAppointmentReminderEmail = async (reminderData) => {
  try {
    const {
      patientEmail,
      patientName,
      appointmentDate,
      appointmentTime,
      appointmentType,
      additionalMessage = ''
    } = reminderData;

    // Validate required fields
    if (!patientEmail || !patientName || !appointmentDate || !appointmentTime) {
      throw new Error('Missing required fields: patientEmail, patientName, appointmentDate, appointmentTime');
    }

    // Validate email address
    if (!patientEmail.includes('@')) {
      throw new Error(`Invalid email address: ${patientEmail}`);
    }

    const transporter = createTransporter();

    // Format date for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Format time for display (convert 24-hour to 12-hour)
    const formatTime = (time24) => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${period}`;
    };

    const formattedDate = formatDate(appointmentDate);
    const formattedTime = formatTime(appointmentTime);

    // Build email content
    const emailSubject = 'Appointment Reminder - Urology Care';
    
    let emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Appointment Reminder</h2>
          <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
            Dear ${patientName},
          </p>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
              This is a reminder that you missed your appointment scheduled for <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>.
            </p>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
              We would like to reschedule your appointment at your earliest convenience. Please contact us to book a new appointment.
            </p>
            ${appointmentType ? `<p style="color: #666; font-size: 14px; margin-top: 10px;"><strong>Appointment Type:</strong> ${appointmentType}</p>` : ''}
          </div>
    `;

    // Add additional message if provided
    if (additionalMessage && additionalMessage.trim()) {
      emailContent += `
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="color: #333; font-size: 14px; margin: 0;"><strong>Additional Message:</strong></p>
            <p style="color: #333; font-size: 14px; margin-top: 10px; white-space: pre-wrap;">${additionalMessage.replace(/\n/g, '<br>')}</p>
          </div>
      `;
    }

    emailContent += `
          <p style="color: #555; font-size: 16px; margin-top: 20px;">
            Best regards,<br>
            <strong>Urology Care Team</strong>
          </p>
        </div>
        <div style="background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; margin-top: 20px; border-radius: 8px;">
          <p style="margin: 0;">This is an automated reminder from the Urology Patient Management System.</p>
          <p style="margin: 5px 0;">Please contact us if you have any questions or need to reschedule.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: {
        name: 'Urology Patient Management System',
        address: process.env.SMTP_USER
      },
      to: patientEmail,
      subject: emailSubject,
      html: emailContent,
      text: `Dear ${patientName},\n\nThis is a reminder that you missed your appointment scheduled for ${formattedDate} at ${formattedTime}.\n\nWe would like to reschedule your appointment at your earliest convenience. Please contact us to book a new appointment.\n\n${additionalMessage ? `Additional Message: ${additionalMessage}\n\n` : ''}Best regards,\nUrology Care Team`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Appointment reminder email sent successfully to ${patientEmail} (Message ID: ${result.messageId})`);
    
    return {
      success: true,
      messageId: result.messageId,
      message: 'Appointment reminder email sent successfully'
    };

  } catch (error) {
    console.error('❌ Error sending appointment reminder email:', error);
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
      message: 'Failed to send appointment reminder email'
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
