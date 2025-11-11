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

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
  if (req.path.includes('/files/')) {
    console.log('🔍 [Investigations Router] Request received:', req.method, req.path);
    console.log('🔍 [Investigations Router] Original URL:', req.originalUrl);
  }
  next();
});

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

// Handle OPTIONS preflight for file requests (must be before GET route and without auth)
router.options('/files/:filePath(*)', (req, res) => {
  const origin = req.headers.origin;
  console.log('OPTIONS preflight request for file:', req.params.filePath, 'from origin:', origin);
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    res.setHeader('Access-Control-Max-Age', '86400');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  }
  
  res.status(200).end();
});

// Serve investigation files
// Use parameter with wildcard to capture the full path including slashes
router.get('/files/:filePath(*)',
  (req, res, next) => {
    console.log('🔍 [File Route] Route matched!');
    console.log('🔍 [File Route] Path:', req.path);
    console.log('🔍 [File Route] Params:', req.params);
    console.log('🔍 [File Route] Original URL:', req.originalUrl);
    next();
  },
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  serveFile
);

export default router;
