import express from 'express';
import { body, param } from 'express-validator';
import { 
  getAllNurses, 
  getNurseById, 
  createNurse, 
  updateNurse, 
  deleteNurse
} from '../controllers/nursesController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Apply authentication to all routes
router.use(authenticateToken);

// Require superadmin role
router.use(requireRole(['superadmin']));

// Get all Nurses
router.get('/', generalLimiter, getAllNurses);

// Get Nurse by ID
router.get('/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid Nurse ID')
  ],
  getNurseById
);

// Create new Nurse
router.post('/', 
  generalLimiter,
  [
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').isLength({ min: 8, max: 20 }).withMessage('Phone must be 8-20 characters'),
    body('organization').optional().trim().isLength({ max: 255 }).withMessage('Organization must be up to 255 characters'),
  ],
  createNurse
);

// Update Nurse
router.put('/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid Nurse ID'),
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('email').isEmail().withMessage('Invalid email format'),
    body('phone').isLength({ min: 8, max: 20 }).withMessage('Phone must be 8-20 characters'),
    body('organization').optional().trim().isLength({ max: 255 }).withMessage('Organization must be up to 255 characters'),
  ],
  updateNurse
);

// Delete Nurse
router.delete('/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid Nurse ID')
  ],
  deleteNurse
);

export default router;

