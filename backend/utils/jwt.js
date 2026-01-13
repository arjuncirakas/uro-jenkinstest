import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

// Generate access token with session identifier for single device login
export const generateAccessToken = (user, refreshToken = null) => {
  // Create session hash from refresh token to link access token to active session
  let sessionHash = null;
  if (refreshToken) {
    sessionHash = crypto.createHash('sha256').update(refreshToken).digest('hex').substring(0, 16);
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionHash // Link access token to refresh token session
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// Generate refresh token
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// Generate both tokens
export const generateTokens = (user) => {
  const refreshToken = generateRefreshToken(user);
  // Generate access token with session hash linked to refresh token
  const accessToken = generateAccessToken(user, refreshToken);
  
  return {
    accessToken,
    refreshToken
  };
};

// Verify access token
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

// Cookie configuration helper
export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true, // Prevent JavaScript access
    secure: isProduction, // Only send over HTTPS in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
    ...(isProduction && process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }) // Set domain in production if needed
  };
};
