import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { generateTokens } from '../utils/jwt.js';

// Simple login without OTP for testing
export const loginSimple = async (req, res) => {
  let client;
  
  try {
    client = await pool.connect();
    const { email, password } = req.body;

    // Find user by email
    const result = await client.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is verified
    if (!user.is_verified) {
      return res.status(401).json({
        success: false,
        message: 'Account not verified. Please verify your email first.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token in database
    await client.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokens.refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
    );

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

