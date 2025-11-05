import express from 'express';
import { 
  addPSAResult, 
  addOtherTestResult, 
  getInvestigationResults, 
  getAllInvestigations,
  deleteInvestigationResult,
  createInvestigationRequest,
  getInvestigationRequests,
  deleteInvestigationRequest,
  upload,
  serveFile
} from '../controllers/investigationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();
router.use(xssProtection);

// Create investigation request for a patient
router.post('/patients/:patientId/investigation-requests',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse']),
  createInvestigationRequest
);

// Get investigation requests for a patient
router.get('/patients/:patientId/investigation-requests',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse', 'gp']),
  getInvestigationRequests
);

// Delete investigation request
router.delete('/investigation-requests/:requestId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse']),
  deleteInvestigationRequest
);

// Add PSA result for a patient
router.post('/patients/:patientId/psa-results',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse']),
  upload.single('testFile'),
  addPSAResult
);

// Add other test result with file upload for a patient
router.post('/patients/:patientId/test-results',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse']),
  upload.single('testFile'),
  addOtherTestResult
);

// Get investigation results for a patient
router.get('/patients/:patientId/investigations',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse', 'gp']),
  getInvestigationResults
);

// Get all investigations
router.get('/investigations',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse']),
  getAllInvestigations
);

// Delete investigation result
router.delete('/investigations/:resultId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse']),
  deleteInvestigationResult
);

// Serve investigation files
router.get('/files/:filePath(*)',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'urology_nurse', 'gp']),
  serveFile
);

export default router;
