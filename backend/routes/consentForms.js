import express from 'express';
import {
  getConsentForms,
  createConsentForm,
  uploadPatientConsentForm,
  getPatientConsentForms,
  getConsentFormTemplates,
  createConsentFormTemplate,
  updateConsentFormTemplate,
  deleteConsentFormTemplate,
  upload,
  uploadTemplate
} from '../controllers/consentFormController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();

// Log all requests to this router
router.use((req, res, next) => {
  console.log(`🔍 [Consent Forms Router] Incoming request: ${req.method} ${req.path}`);
  console.log(`🔍 [Consent Forms Router] Original URL: ${req.originalUrl}`);
  console.log(`🔍 [Consent Forms Router] Base URL: ${req.baseUrl}`);
  next();
});

// Test endpoint to verify route is accessible (no auth required for testing)
router.get('/test', (req, res) => {
  console.log('✅ Consent forms test endpoint hit');
  console.log('✅ Request details:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url
  });
  res.json({
    success: true,
    message: 'Consent forms route is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    routes: {
      templates: {
        get: '/api/consent-forms/templates',
        post: '/api/consent-forms/templates'
      },
      patients: {
        get: '/api/consent-forms/patients/:patientId',
        post: '/api/consent-forms/patients/:patientId'
      }
    },
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
});

// Apply XSS protection to all routes
router.use(xssProtection);

// Get all consent forms
router.get('/',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  getConsentForms
);

// Create a new consent form
router.post('/',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  createConsentForm
);

// Get patient consent forms
router.get('/patients/:patientId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  getPatientConsentForms
);

// Upload consent form file for a patient
router.post('/patients/:patientId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  upload.single('file'),
  uploadPatientConsentForm
);

// Template Management Routes
// Get all consent form templates (accessible to superadmin, nurses, and doctors)
router.get('/templates',
  generalLimiter,
  (req, res, next) => {
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    req.requestId = requestId; // Attach to request for controller use
    console.log(`🔍 [Consent Forms ${requestId}] GET /templates route hit`);
    console.log(`🔍 [Consent Forms ${requestId}] Request details:`, {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Authentication successful - User ID: ${req.user?.id}, Role: ${req.user?.role}`);
    next();
  },
  requireRole(['superadmin', 'urology_nurse', 'urologist', 'doctor']),
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Role check passed - Proceeding to controller`);
    next();
  },
  getConsentFormTemplates
);

// Create a new consent form template
router.post('/templates',
  generalLimiter,
  (req, res, next) => {
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    req.requestId = requestId; // Attach to request for controller use
    console.log(`🔍 [Consent Forms ${requestId}] POST /templates route hit`);
    console.log(`🔍 [Consent Forms ${requestId}] Request details:`, {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      contentType: req.get('content-type'),
      contentLength: req.get('content-length'),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Authentication successful - User ID: ${req.user?.id}, Role: ${req.user?.role}`);
    next();
  },
  requireRole(['superadmin']),
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Role check passed - Proceeding to file upload`);
    next();
  },
  uploadTemplate.single('template_file'),
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] File upload processed:`, {
      hasFile: !!req.file,
      fileName: req.file?.originalname || 'N/A',
      fileSize: req.file?.size || 'N/A',
      fileMimetype: req.file?.mimetype || 'N/A'
    });
    next();
  },
  createConsentFormTemplate
);

// Update a consent form template
router.put('/templates/:templateId',
  generalLimiter,
  (req, res, next) => {
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    req.requestId = requestId;
    console.log(`🔍 [Consent Forms ${requestId}] PUT /templates/:templateId route hit`);
    console.log(`🔍 [Consent Forms ${requestId}] Request details:`, {
      method: req.method,
      path: req.path,
      params: req.params,
      originalUrl: req.originalUrl,
      contentType: req.get('content-type'),
      ip: req.ip
    });
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Authentication successful - User ID: ${req.user?.id}, Role: ${req.user?.role}`);
    next();
  },
  requireRole(['superadmin']),
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Role check passed - Proceeding to file upload`);
    next();
  },
  uploadTemplate.single('template_file'),
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] File upload processed:`, {
      hasFile: !!req.file,
      fileName: req.file?.originalname || 'N/A',
      fileSize: req.file?.size || 'N/A'
    });
    next();
  },
  updateConsentFormTemplate
);

// Delete a consent form template
router.delete('/templates/:templateId',
  generalLimiter,
  (req, res, next) => {
    const requestId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    req.requestId = requestId;
    console.log(`🔍 [Consent Forms ${requestId}] DELETE /templates/:templateId route hit`);
    console.log(`🔍 [Consent Forms ${requestId}] Request details:`, {
      method: req.method,
      path: req.path,
      params: req.params,
      originalUrl: req.originalUrl,
      ip: req.ip
    });
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Authentication successful - User ID: ${req.user?.id}, Role: ${req.user?.role}`);
    next();
  },
  requireRole(['superadmin']),
  (req, res, next) => {
    console.log(`🔍 [Consent Forms ${req.requestId}] Role check passed - Proceeding to controller`);
    next();
  },
  deleteConsentFormTemplate
);

export default router;











