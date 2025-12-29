import express from 'express';
import multer from 'multer';
import {
  addPSAResult,
  updatePSAResult,
  addOtherTestResult,
  updateOtherTestResult,
  getInvestigationResults,
  getAllInvestigations,
  deleteInvestigationResult,
  createInvestigationRequest,
  getInvestigationRequests,
  updateInvestigationRequestStatus,
  deleteInvestigationRequest,
  upload,
  serveFile,
  parsePSAFile
} from '../controllers/investigationController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';
import { validateFilePathMiddleware } from '../utils/ssrfProtection.js';
import { setPreflightCorsHeaders } from '../utils/corsHelper.js';
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

// Parse PSA file and extract values
router.post('/parse-psa-file',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  upload.single('file'),
  parsePSAFile
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

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the 10MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  if (err) {
    // This catches fileFilter errors
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid file type'
    });
  }
  next();
};

// Add other test result with file upload for a patient
router.post('/patients/:patientId/test-results',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  upload.single('testFile'),
  handleMulterError,
  addOtherTestResult
);

// Update other test result with file upload
router.patch('/test-results/:resultId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  upload.single('testFile'),
  handleMulterError,
  updateOtherTestResult
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

// Handle OPTIONS preflight for file requests with secure origin validation
router.options('/files/:filePath(*)', (req, res) => {
  // Use secure CORS helper that validates origin against allowlist
  setPreflightCorsHeaders(req, res);
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
