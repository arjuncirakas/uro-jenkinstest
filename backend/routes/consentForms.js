import express from 'express';
import {
  getConsentFormTemplates,
  createConsentFormTemplate,
  updateConsentFormTemplate,
  deleteConsentFormTemplate,
  uploadTemplate,
  getPatientConsentForms,
  uploadPatientConsentForm,
  uploadPatientConsent
} from '../controllers/consentFormController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Consent Forms] ${req.method} ${req.path}`);
  next();
});

// Get all consent form templates
router.get('/templates',
  generalLimiter,
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

// Patient consent forms routes
// Get patient consent forms
router.get('/patients/:patientId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp', 'superadmin']),
  getPatientConsentForms
);

// Upload patient consent form
router.post('/patients/:patientId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'superadmin']),
  uploadPatientConsent.single('file'),
  uploadPatientConsentForm
);

export default router;
