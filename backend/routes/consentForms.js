import express from 'express';
import {
  getConsentForms,
  createConsentForm,
  uploadPatientConsentForm,
  getPatientConsentForms,
  upload
} from '../controllers/consentFormController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();

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

export default router;

