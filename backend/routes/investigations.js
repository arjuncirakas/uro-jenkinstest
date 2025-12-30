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

// IMPORTANT: File serving routes must be registered BEFORE other /investigations routes
// to avoid route conflicts. Express matches routes in order.

// Helper function to create file serving route handlers (reduces duplication)
const createFileRouteHandlers = (routePath, routeLabel) => {
  // OPTIONS handler
  const optionsHandler = (req, res) => {
    console.log(`🛣️ [investigations route] OPTIONS request for ${routeLabel}`);
    setPreflightCorsHeaders(req, res);
    res.status(200).end();
  };

  // GET handler middleware
  const getHandlerMiddleware = (req, res, next) => {
    console.log('🛣️ [investigations route] ==========================================');
    console.log(`🛣️ [investigations route] ✅✅✅ ${routeLabel.toUpperCase()} ROUTE MATCHED! ✅✅✅`);
    console.log(`🛣️ [investigations route] Route pattern: ${routePath}`);
    console.log('🛣️ [investigations route] Method:', req.method);
    console.log('🛣️ [investigations route] Original URL:', req.originalUrl);
    console.log('🛣️ [investigations route] Path:', req.path);
    console.log('🛣️ [investigations route] Base URL:', req.baseUrl);
    console.log('🛣️ [investigations route] URL:', req.url);
    console.log('🛣️ [investigations route] Params:', JSON.stringify(req.params, null, 2));
    console.log('🛣️ [investigations route] filePath param:', req.params.filePath);
    console.log('🛣️ [investigations route] Query:', JSON.stringify(req.query, null, 2));
    console.log('🛣️ [investigations route] Headers:', {
      host: req.get('host'),
      'x-forwarded-for': req.get('x-forwarded-for'),
      'x-real-ip': req.get('x-real-ip'),
      'user-agent': req.get('user-agent'),
      'accept': req.get('accept')
    });
    console.log('🛣️ [investigations route] ==========================================');
    next();
  };

  return { optionsHandler, getHandlerMiddleware };
};

// Create handlers for new route
const newRouteHandlers = createFileRouteHandlers('/investigations/files/:filePath(*)', 'route');

// Handle OPTIONS preflight for file requests with secure origin validation
router.options('/investigations/files/:filePath(*)', newRouteHandlers.optionsHandler);

// Serve investigation files - MUST be before /investigations route
// Use /investigations/files to avoid conflicts with other routes
// SSRF Protection: validateFilePathMiddleware prevents path traversal attacks
// Using :filePath(*) to match paths with slashes (e.g., investigations/file.png)
router.get('/investigations/files/:filePath(*)',
  newRouteHandlers.getHandlerMiddleware,
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  validateFilePathMiddleware('filePath', path.join(process.cwd(), 'uploads')),
  serveFile
);

// Get all investigations (must be after /investigations/files route)
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

// Also support the old route for backward compatibility
const oldRouteHandlers = createFileRouteHandlers('/files/:filePath(*)', 'old route');

router.options('/files/:filePath(*)', oldRouteHandlers.optionsHandler);

router.get('/files/:filePath(*)',
  oldRouteHandlers.getHandlerMiddleware,
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  validateFilePathMiddleware('filePath', path.join(process.cwd(), 'uploads')),
  serveFile
);

export default router;
