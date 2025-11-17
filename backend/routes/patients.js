import express from 'express';
import {
  addPatient,
  getPatients,
  getNewPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getAssignedPatientsForDoctor, 
  updatePatientPathway,
  getPatientsDueForReview,
  searchPatients
} from '../controllers/patientController.js';
import {
  getDischargeSummary,
  createDischargeSummary,
  updateDischargeSummary,
  deleteDischargeSummary
} from '../controllers/dischargeSummaryController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';
import { validateRequest, addPatientSchema, updatePatientSchema } from '../utils/validation.js';
import { validatePatientInput, validatePatientUpdateInput } from '../middleware/patientValidation.js';
import { checkPatientAccess } from '../middleware/idorProtection.js';

const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Patient API info
router.get('/', generalLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Patient Management API',
    endpoints: {
      addPatient: 'POST /api/patients',
      getPatients: 'GET /api/patients',
      getPatientById: 'GET /api/patients/:id',
      updatePatient: 'PUT /api/patients/:id',
      deletePatient: 'DELETE /api/patients/:id'
    },
    permissions: {
      addPatient: 'urologist, urology_nurse, gp',
      getPatients: 'urologist, urology_nurse, gp',
      getPatientById: 'urologist, urology_nurse, gp',
      updatePatient: 'urologist, urology_nurse',
      deletePatient: 'urologist, urology_nurse'
    }
  });
});

// Add new patient - accessible by urologists, doctors, nurses, and GPs
router.post('/', 
  generalLimiter, 
  authenticateToken, 
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']), 
  validatePatientInput,
  addPatient
);

// Get all patients - accessible by urologists, doctors, nurses, and GPs
router.get('/list', 
  generalLimiter, 
  authenticateToken, 
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']), 
  getPatients
);

// Get new patients - accessible by urologists, doctors, nurses, and GPs
router.get('/new', 
  generalLimiter, 
  authenticateToken, 
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']), 
  getNewPatients
);

// Search patients (autocomplete) - accessible by all authenticated users
router.get('/search',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  searchPatients
);

// Get patients assigned to current doctor with category filter
router.get('/assigned',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor']),
  getAssignedPatientsForDoctor
);

// Get patients due for review (7-14 days window)
router.get('/due-for-review',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  getPatientsDueForReview
);

// Get patient by ID - accessible by urologists, doctors, nurses, and GPs
router.get('/:id', 
  generalLimiter, 
  authenticateToken, 
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  getPatientById
);

// Update patient - accessible by urologists, doctors, and nurses
router.put('/:id', 
  generalLimiter, 
  authenticateToken, 
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  validatePatientUpdateInput,
  updatePatient
);

// Update patient care pathway
router.put('/:id/pathway',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  updatePatientPathway
);

// Delete patient (soft delete) - accessible by urologists, doctors, and nurses
router.delete('/:id', 
  generalLimiter, 
  authenticateToken, 
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  deletePatient
);

// Get discharge summary for a patient - accessible by urologists, doctors, nurses, and GPs
router.get('/:id/discharge-summary',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  getDischargeSummary
);

// Create discharge summary for a patient - accessible by urologists, doctors, and nurses
router.post('/:id/discharge-summary',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  createDischargeSummary
);

// Update discharge summary - accessible by urologists, doctors, and nurses
router.put('/:id/discharge-summary/:summaryId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  updateDischargeSummary
);

// Delete discharge summary - accessible by urologists, doctors, and nurses
router.delete('/:id/discharge-summary/:summaryId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  (req, res, next) => {
    // Map :id parameter to patientId for IDOR protection
    req.params.patientId = req.params.id;
    next();
  },
  checkPatientAccess,
  deleteDischargeSummary
);

export default router;
