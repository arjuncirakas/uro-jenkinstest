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

// Test endpoint to verify route is accessible
router.get('/test', (req, res) => {
  console.log('✅ Consent forms test endpoint hit');
  res.json({
    success: true,
    message: 'Consent forms route is working',
    timestamp: new Date().toISOString()
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
    console.log('🔍 [Consent Forms] GET /templates route hit');
    console.log('🔍 [Consent Forms] Request path:', req.path);
    console.log('🔍 [Consent Forms] Request originalUrl:', req.originalUrl);
    console.log('🔍 [Consent Forms] Request method:', req.method);
    next();
  },
  authenticateToken,
  requireRole(['superadmin', 'urology_nurse', 'urologist', 'doctor']),
  getConsentFormTemplates
);

// Create a new consent form template
router.post('/templates',
  generalLimiter,
  authenticateToken,
  requireRole(['superadmin']),
  uploadTemplate.single('template_file'),
  createConsentFormTemplate
);

// Update a consent form template
router.put('/templates/:templateId',
  generalLimiter,
  authenticateToken,
  requireRole(['superadmin']),
  uploadTemplate.single('template_file'),
  updateConsentFormTemplate
);

// Delete a consent form template
router.delete('/templates/:templateId',
  generalLimiter,
  authenticateToken,
  requireRole(['superadmin']),
  deleteConsentFormTemplate
);

export default router;











