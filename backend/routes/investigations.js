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

// Handle OPTIONS preflight for file requests with secure origin validation
router.options('/files/:filePath(*)', (req, res) => {
  // Use secure CORS helper that validates origin against allowlist
  setPreflightCorsHeaders(req, res);
  res.status(200).end();
});

// Serve investigation files
// Use /investigations/files to avoid conflicts with other routes
// SSRF Protection: validateFilePathMiddleware prevents path traversal attacks
// Note: Using * wildcard to match paths with slashes (e.g., investigations/file.png)
router.get('/investigations/files/*',
  (req, res, next) => {
    console.log('🛣️ [investigations route] ==========================================');
    console.log('🛣️ [investigations route] Route matched: /investigations/files/*');
    console.log('🛣️ [investigations route] Method:', req.method);
    console.log('🛣️ [investigations route] Original URL:', req.originalUrl);
    console.log('🛣️ [investigations route] Path:', req.path);
    console.log('🛣️ [investigations route] Params:', req.params);
    console.log('🛣️ [investigations route] req.params[0]:', req.params[0]);
    
    // Extract file path from the wildcard match
    // The * wildcard captures everything after /investigations/files/
    const matchedPath = req.params[0] || req.path.replace('/investigations/files/', '');
    console.log('🛣️ [investigations route] Extracted file path:', matchedPath);
    
    // Set it as filePath param for the middleware
    req.params.filePath = matchedPath;
    console.log('🛣️ [investigations route] Set req.params.filePath:', req.params.filePath);
    
    next();
  },
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  validateFilePathMiddleware('filePath', path.join(process.cwd(), 'uploads')),
  serveFile
);

// Also support the old route for backward compatibility
router.get('/files/*',
  (req, res, next) => {
    console.log('🛣️ [investigations route] Old route matched: /files/*');
    const matchedPath = req.params[0] || req.path.replace('/files/', '');
    req.params.filePath = matchedPath;
    next();
  },
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  validateFilePathMiddleware('filePath', path.join(process.cwd(), 'uploads')),
  serveFile
);

export default router;
