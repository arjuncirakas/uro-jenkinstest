/**
 * Health Check Access Control Middleware
 * Restricts /health endpoint access to internal monitoring systems only
 * 
 * SECURITY FIX: Now restricts access by default in production environment
 * 
 * Configuration via environment variables:
 * - HEALTH_CHECK_ALLOWED_IPS: Comma-separated list of allowed IPs/CIDR ranges
 *   Example: "127.0.0.1,::1,10.0.0.0/8,192.168.0.0/16"
 * - HEALTH_CHECK_RESTRICT_ACCESS: Override default behavior
 *   - In production: defaults to restricted (set to "false" to disable)
 *   - In development: defaults to open (set to "true" to enable)
 */

/**
 * Check if an IP address matches a CIDR range
 * Supports IPv4 addresses and CIDR notation
 */
const ipInRange = (ip, cidr) => {
  try {
    if (!cidr.includes('/')) {
      // Simple IP match
      return ip === cidr;
    }

    const [rangeIp, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    // Only handle IPv4 addresses for CIDR matching
    // IPv6 addresses will fall through to exact match
    if (!ip.includes('.') || !rangeIp.includes('.')) {
      return ip === cidr; // Fallback to exact match for non-IPv4
    }

    // Convert IPv4 to number
    const ipToNumber = (ip) => {
      const parts = ip.split('.');
      if (parts.length !== 4) return null;
      return parts.reduce((acc, octet) => {
        const num = parseInt(octet, 10);
        if (isNaN(num) || num < 0 || num > 255) return null;
        return (acc << 8) + num;
      }, 0) >>> 0;
    };

    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(rangeIp);

    if (ipNum === null || rangeNum === null || prefix < 0 || prefix > 32) {
      return ip === cidr; // Fallback to exact match on error
    }

    const mask = ~(2 ** (32 - prefix) - 1);
    return (ipNum & mask) === (rangeNum & mask);
  } catch (error) {
    // On any error, fall back to exact match
    return ip === cidr;
  }
};

/**
 * Get client IP address from request
 */
const getClientIp = (req) => {
  // Check X-Forwarded-For header (from proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  // Check X-Real-IP header
  if (req.headers['x-real-ip']) {
    return req.headers['x-real-ip'];
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || 'unknown';
};

/**
 * Health check access control middleware
 * SECURITY FIX: Now restricts access by default in production
 */
export const restrictHealthCheckAccess = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Check if restriction is explicitly configured, otherwise default based on environment
  // In production: restricted by default (set HEALTH_CHECK_RESTRICT_ACCESS=false to disable)
  // In development: open by default (set HEALTH_CHECK_RESTRICT_ACCESS=true to enable)
  const restrictionSetting = process.env.HEALTH_CHECK_RESTRICT_ACCESS;
  const isRestricted = restrictionSetting !== undefined
    ? restrictionSetting === 'true'
    : isProduction; // Default: restricted in production, open in development

  // If restriction is disabled, allow all
  if (!isRestricted) {
    return next();
  }

  // Get allowed IPs from environment variable
  const allowedIpsEnv = process.env.HEALTH_CHECK_ALLOWED_IPS || '127.0.0.1,::1';
  const allowedIps = allowedIpsEnv.split(',').map(ip => ip.trim()).filter(ip => ip);

  // Get client IP
  const clientIp = getClientIp(req);

  // Check if client IP is allowed
  const isAllowed = allowedIps.some(allowedIp => {
    // Handle IPv6 localhost
    if (allowedIp === '::1' && (clientIp === '::1' || clientIp === '::ffff:127.0.0.1')) {
      return true;
    }
    // Handle IPv4 localhost variants
    if (allowedIp === '127.0.0.1' && (clientIp === '127.0.0.1' || clientIp === '::ffff:127.0.0.1')) {
      return true;
    }
    // Check CIDR range or exact match
    return ipInRange(clientIp, allowedIp) || clientIp === allowedIp;
  });

  if (!isAllowed) {
    // Log unauthorized access attempt
    console.warn(`🚫 [Health Check] Unauthorized access attempt from ${clientIp} at ${new Date().toISOString()}`);
    return res.status(403).json({
      status: 'FORBIDDEN'
    });
  }

  // Allow access
  return next();
};

