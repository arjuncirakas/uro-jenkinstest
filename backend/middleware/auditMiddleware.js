import { logAuditEvent, logPHIAccess, logFailedAccess } from '../services/auditLogger.js';

/**
 * Middleware to automatically log API requests
 */
export const auditMiddleware = (req, res, next) => {
  // Skip logging for health checks and static files
  if (req.path === '/health' || req.path.startsWith('/uploads')) {
    return next();
  }
  
  // Store original res.json to intercept responses
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    // Log the request after response is sent
    const user = req.user || {};
    const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
    
    // Determine resource type from path
    let resourceType = null;
    let resourceId = null;
    
    if (req.path.includes('/patients')) {
      resourceType = 'patient';
      resourceId = req.params.patientId || req.body?.patientId || req.query?.patientId;
    } else if (req.path.includes('/appointments') || req.path.includes('/booking')) {
      resourceType = 'appointment';
      resourceId = req.params.appointmentId || req.body?.appointmentId || req.params.id;
    } else if (req.path.includes('/investigations')) {
      resourceType = 'investigation';
      resourceId = req.params.investigationId || req.body?.investigationId || req.params.id;
    } else if (req.path.includes('/notes')) {
      resourceType = 'note';
      resourceId = req.params.noteId || req.body?.noteId || req.params.id;
    } else if (req.path.includes('/mdt')) {
      resourceType = 'mdt_meeting';
      resourceId = req.params.meetingId || req.body?.meetingId || req.params.id;
    }
    
    // Log PHI access if it's a patient-related resource
    if (resourceType === 'patient' && user.id) {
      logPHIAccess(req, resourceType, resourceId, req.method.toLowerCase());
    } else if (resourceType && user.id) {
      // Log general API access for other resources
      logAuditEvent({
        userId: user.id || null,
        userEmail: user.email || null,
        userRole: user.role || null,
        action: `api.${req.method.toLowerCase()}`,
        resourceType: resourceType,
        resourceId: resourceId,
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        requestMethod: req.method,
        requestPath: req.path,
        status: status,
        errorCode: res.statusCode >= 400 ? String(res.statusCode) : null,
        errorMessage: data?.message || null,
        metadata: {
          endpoint: req.originalUrl
        }
      });
    }
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Middleware to log authentication events
 */
export const auditAuthMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const action = req.path.includes('login') ? 'login' : 
                   req.path.includes('register') ? 'register' :
                   req.path.includes('logout') ? 'logout' :
                   req.path.includes('refresh') ? 'token_refresh' : 'auth';
    
    const status = data.success ? 'success' : 'failure';
    
    logAuditEvent({
      userId: data.data?.user?.id || null,
      userEmail: req.body?.email || data.data?.user?.email || null,
      userRole: data.data?.user?.role || null,
      action: `auth.${action}`,
      resourceType: 'authentication',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      requestMethod: req.method,
      requestPath: req.path,
      status: status,
      errorMessage: data.message || null,
      metadata: {
        endpoint: req.originalUrl,
        requiresOTP: data.data?.requiresOTPVerification || false
      }
    });
    
    return originalJson(data);
  };
  
  next();
};

