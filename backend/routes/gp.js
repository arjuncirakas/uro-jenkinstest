import express from 'express';
import { body, param } from 'express-validator';
import { 
  getAllGPs, 
  getGPById, 
  createGP, 
  updateGP, 
  deleteGP
} from '../controllers/gpController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Apply authentication to all routes
router.use(authenticateToken);

// Get all GPs - accessible to all authenticated users
// Create GP - accessible to superadmin, urologist, and nurse
// Other operations - require superadmin role

// Get all GPs - accessible to all authenticated users
router.get('/', generalLimiter, getAllGPs);

// Get GP by ID - accessible to all authenticated users
router.get('/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid GP ID')
  ],
  getGPById
);

// Create new GP - accessible to superadmin, urologist, and nurse
router.post('/', 
  generalLimiter,
  requireRole(['superadmin', 'urologist', 'doctor', 'urology_nurse']),
  [
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').isLength({ min: 8, max: 20 }).withMessage('Phone must be 8-20 characters'),
    body('organization').optional().trim().isLength({ max: 255 }).withMessage('Organization must be up to 255 characters'),
  ],
  createGP
);

// Require superadmin role for update and delete operations
router.use(requireRole(['superadmin']));

// Update GP - superadmin only
router.put('/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid GP ID'),
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').isLength({ min: 8, max: 20 }).withMessage('Phone must be 8-20 characters'),
    body('organization').optional().trim().isLength({ max: 255 }).withMessage('Organization must be up to 255 characters'),
  ],
  updateGP
);

// Delete GP - superadmin only
router.delete('/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid GP ID')
  ],
  deleteGP
);

export default router;

