import crypto from 'crypto';
import pool from '../config/database.js';
import { sendOTPEmail } from './emailService.js';

// Generate a secure 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP in database and send email
export const storeOTP = async (userId, email, type = 'registration') => {
  const client = await pool.connect();
  
  try {
    console.log(`📧 Storing OTP for user ${userId}, email: ${email}, type: ${type}`);
    
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Clean up any existing OTPs for this user and type
    await client.query(
      'DELETE FROM otp_verifications WHERE user_id = $1 AND type = $2',
      [userId, type]
    );
    
    // Insert new OTP
    await client.query(
      'INSERT INTO otp_verifications (user_id, email, otp_code, type, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [userId, email, otpCode, type, expiresAt]
    );
    
    console.log(`✅ OTP stored in database for ${email}: ${otpCode}`);
    
    // Send OTP email - don't fail if email sending fails
    let emailResult = { success: false, error: 'Email sending not attempted' };
    try {
      emailResult = await sendOTPEmail(email, otpCode, type);
      if (emailResult.success) {
        console.log(`✅ OTP email sent successfully to ${email}`);
      } else {
        console.warn(`⚠️ OTP stored but email sending failed: ${emailResult.error}`);
        // Don't throw error here as OTP is still stored and can be retrieved manually
      }
    } catch (emailError) {
      console.error(`❌ Error sending OTP email: ${emailError.message}`);
      emailResult = {
        success: false,
        error: emailError.message
      };
      // Don't throw - OTP is stored, just email failed
    }
    
    return {
      otpCode,
      emailSent: emailResult.success,
      emailError: emailResult.error
    };
  } catch (error) {
    console.error('❌ Error storing OTP:', error);
    console.error('❌ Error stack:', error.stack);
    throw error;
  } finally {
    client.release();
  }
};

// Verify OTP
export const verifyOTP = async (email, otpCode, type = 'registration') => {
  const client = await pool.connect();
  
  try {
    // Find valid OTP
    const result = await client.query(
      `SELECT ov.*, u.id as user_id, u.first_name, u.last_name, u.role, u.is_active
       FROM otp_verifications ov
       LEFT JOIN users u ON ov.user_id = u.id
       WHERE ov.email = $1 AND ov.otp_code = $2 AND ov.type = $3 
       AND ov.expires_at > NOW() AND ov.is_used = false`,
      [email, otpCode, type]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }
    
    const otpData = result.rows[0];
    
    // Check attempt limit (max 3 attempts)
    if (otpData.attempts >= 3) {
      return {
        success: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP.'
      };
    }
    
    // Mark OTP as used
    await client.query(
      'UPDATE otp_verifications SET is_used = true WHERE id = $1',
      [otpData.id]
    );
    
    return {
      success: true,
      data: {
        userId: otpData.user_id,
        email: otpData.email,
        user: otpData.user_id ? {
          id: otpData.user_id,
          first_name: otpData.first_name,
          last_name: otpData.last_name,
          role: otpData.role,
          is_active: otpData.is_active
        } : null
      }
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Increment OTP attempt count
export const incrementOTPAttempts = async (email, otpCode, type = 'registration') => {
  const client = await pool.connect();
  
  try {
    await client.query(
      'UPDATE otp_verifications SET attempts = attempts + 1 WHERE email = $1 AND otp_code = $2 AND type = $3',
      [email, otpCode, type]
    );
  } catch (error) {
    console.error('Error incrementing OTP attempts:', error);
  } finally {
    client.release();
  }
};

// Clean up expired OTPs
export const cleanupExpiredOTPs = async () => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'DELETE FROM otp_verifications WHERE expires_at < NOW()'
    );
    
    console.log(`Cleaned up ${result.rowCount} expired OTPs`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up expired OTPs:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Send OTP via email using SMTP service
export const sendOTPEmailToUser = async (email, otpCode, type = 'registration') => {
  try {
    console.log(`📧 Sending OTP email to ${email} (Type: ${type})`);
    
    const result = await sendOTPEmail(email, otpCode, type);
    
    if (result.success) {
      console.log(`✅ OTP email sent successfully to ${email}`);
      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: result.messageId
      };
    } else {
      console.error(`❌ Failed to send OTP email to ${email}:`, result.error);
      return {
        success: false,
        message: 'Failed to send OTP email',
        error: result.error
      };
    }
  } catch (error) {
    console.error('❌ Error in sendOTPEmailToUser:', error);
    return {
      success: false,
      message: 'Failed to send OTP email',
      error: error.message
    };
  }
};
