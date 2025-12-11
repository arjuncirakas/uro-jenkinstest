import express from 'express';
import { 
  addPSAResult, 
  updatePSAResult,
  addOtherTestResult, 
  getInvestigationResults, 
  getAllInvestigations,
  deleteInvestigationResult,
  createInvestigationRequest,
  getInvestigationRequests,
  updateInvestigationRequestStatus,
  deleteInvestigationRequest,
  upload,
  serveFile
} from '../controllers/investigationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';
import { validateFilePathMiddleware } from '../utils/ssrfProtection.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
router.use(xssProtection);

// Create investigation request for a patient
router.post('/patients/:patientId/investigation-requests',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  createInvestigationRequest
);

// Get investigation requests for a patient
router.get('/patients/:patientId/investigation-requests',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  getInvestigationRequests
);

// Update investigation request status
router.patch('/investigation-requests/:requestId/status',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  (req, res, next) => {
    console.log(`[Investigation Routes] PATCH /investigation-requests/${req.params.requestId}/status - Route matched`);
    next();
  },
  updateInvestigationRequestStatus
);

// Delete investigation request
router.delete('/investigation-requests/:requestId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  deleteInvestigationRequest
);

// Add PSA result for a patient
router.post('/patients/:patientId/psa-results',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  upload.single('testFile'),
  addPSAResult
);

// Update PSA result
router.patch('/psa-results/:resultId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  upload.single('testFile'),
  updatePSAResult
);

// Add other test result with file upload for a patient
router.post('/patients/:patientId/test-results',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  upload.single('testFile'),
  addOtherTestResult
);

// Get investigation results for a patient
router.get('/patients/:patientId/investigations',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  getInvestigationResults
);

// Get all investigations
router.get('/investigations',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  getAllInvestigations
);

// Delete investigation result
router.delete('/investigations/:resultId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  deleteInvestigationResult
);

// Handle OPTIONS preflight for file requests
router.options('/files/:filePath(*)', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.status(200).end();
});

// Serve investigation files
// Use /investigations/files to avoid conflicts with other routes
// SSRF Protection: validateFilePathMiddleware prevents path traversal attacks
router.get('/investigations/files/:filePath(*)',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  validateFilePathMiddleware('filePath', path.join(process.cwd(), 'uploads')),
  serveFile
);

// Also support the old route for backward compatibility
router.get('/files/:filePath(*)',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  validateFilePathMiddleware('filePath', path.join(process.cwd(), 'uploads')),
  serveFile
);

export default router;
