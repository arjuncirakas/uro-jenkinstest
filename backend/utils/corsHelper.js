/**
 * Secure CORS Helper Utility
 * 
 * This module provides secure CORS header setting functions that validate
 * origins against a strict allowlist. It fixes the CORS misconfiguration
 * vulnerability (CVE/CORS Misconfiguration - Arbitrary Origin Allowed with Credentials).
 * 
 * Security: Origins are validated against a strict allowlist, and only exact matches
 * are allowed when credentials are enabled.
 */

/**
 * Get the list of allowed origins based on environment
 * @returns {string[]} Array of allowed origins
 */
export const getAllowedOrigins = () => {
    const environment = process.env.NODE_ENV || 'development';

    // Build list of allowed origins
    const allowedOrigins = [];

    // Always allow localhost in development
    if (environment === 'development') {
        allowedOrigins.push(
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5000'
        );
    }

    // Add production frontend URL(s) from environment
    if (process.env.FRONTEND_URL) {
        // Support multiple origins separated by comma
        const frontendUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
        frontendUrls.forEach(url => {
            if (url && !allowedOrigins.includes(url)) {
                allowedOrigins.push(url);
            }
        });
    }

    return allowedOrigins;
};

/**
 * Check if an origin is in the allowed list
 * @param {string} origin - The origin to check
 * @returns {boolean} True if origin is allowed
 */
export const isOriginAllowed = (origin) => {
    if (!origin) {
        // Requests without origin header are NOT allowed when credentials are needed
        // This is handled separately for server-to-server requests
        return false;
    }

    const allowedOrigins = getAllowedOrigins();

    // Exact match only - no substring matching for security
    return allowedOrigins.includes(origin);
};

/**
 * Set CORS headers for file responses with strict origin validation
 * 
 * SECURITY FIX: This function now performs strict origin validation
 * instead of dynamically reflecting arbitrary origins. Only origins
 * in the allowlist will receive CORS headers with credentials.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const setCorsHeaders = (req, res) => {
    const origin = req.headers.origin;

    if (origin) {
        // Check if origin is in our allowlist (exact match)
        if (isOriginAllowed(origin)) {
            // Origin is explicitly allowed - set CORS headers
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
        }
        // If origin is NOT in allowlist, we intentionally do NOT set any CORS headers
        // This will cause the browser to block the cross-origin request
    }
    // Requests without origin: We do NOT set Access-Control-Allow-Origin: '*'
    // when we're also setting credentials. This is a security best practice.
    // Server-to-server requests don't need CORS headers anyway.
};

/**
 * Set CORS headers for preflight OPTIONS requests with strict validation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} True if origin was allowed, false otherwise
 */
export const setPreflightCorsHeaders = (req, res) => {
    const origin = req.headers.origin;

    if (origin && isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
        return true;
    }

    // If no origin or origin not allowed, don't set any CORS headers
    return false;
};

export default {
    getAllowedOrigins,
    isOriginAllowed,
    setCorsHeaders,
    setPreflightCorsHeaders
};
