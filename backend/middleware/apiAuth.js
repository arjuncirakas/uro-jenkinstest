import { authenticateToken } from './auth.js';

/**
 * Global API Authentication Middleware
 * Protects all /api/* routes except public auth endpoints
 * 
 * Public routes (no auth required):
 * - /api/auth/register
 * - /api/auth/verify-registration-otp
 * - /api/auth/resend-registration-otp
 * - /api/auth/login
 * - /api/auth/verify-login-otp
 * - /api/auth/resend-login-otp
 * - /api/auth/refresh-token
 * - /api/auth/logout
 * - /api/auth/forgot-password
 * - /api/auth/verify-reset-otp
 * - /api/auth/reset-password
 * - /api/superadmin/setup-password
 * - /api (API info endpoint)
 * - /health (health check)
 */
export const protectApiRoutes = (req, res, next) => {
  // Use originalUrl to get the full path including base path
  const fullPath = req.originalUrl || req.url;
  const path = req.path;
  const method = req.method;

  // Define public routes that don't require authentication
  const publicRoutes = [
    // Auth routes - check both /api/auth/* and /auth/*
    '/api/auth/register',
    '/api/auth/verify-registration-otp',
    '/api/auth/resend-registration-otp',
    '/api/auth/login',
    '/api/auth/verify-login-otp',
    '/api/auth/resend-login-otp',
    '/api/auth/refresh-token',
    '/api/auth/logout',
    '/api/auth/forgot-password',
    '/api/auth/verify-reset-otp',
    '/api/auth/reset-password',
    // Superadmin public route
    '/api/superadmin/setup-password',
    // Info endpoints
    '/api',
    '/health',
    // Static file serving
    '/uploads'
  ];

  // Check if this is a public route (check both fullPath and path)
  const isPublicRoute = publicRoutes.some(route => {
    // Check full path and base path
    return fullPath === route || 
           fullPath.startsWith(route + '/') ||
           path === route || 
           path.startsWith(route + '/');
  });

  // Allow OPTIONS requests (CORS preflight)
  if (method === 'OPTIONS') {
    return next();
  }

  // If it's a public route, skip authentication
  if (isPublicRoute) {
    console.log(`🌐 [API Auth] Public route accessed: ${method} ${fullPath}`);
    return next();
  }

  // Check if route starts with /api (check both fullPath and path)
  const isApiRoute = fullPath.startsWith('/api') || path.startsWith('/api');
  
  if (isApiRoute) {
    console.log(`🔒 [API Auth] Protected route accessed: ${method} ${fullPath}`);
    // Apply authentication middleware
    return authenticateToken(req, res, next);
  }

  // For non-API routes, continue without authentication
  return next();
};

