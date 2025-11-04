import express from 'express';
import { body, param, query } from 'express-validator';
import { 
  getAllDoctors, 
  getDoctorById, 
  createDoctor, 
  updateDoctor, 
  deleteDoctor,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getGPs
} from '../controllers/doctorsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Apply authentication to all routes
router.use(authenticateToken);

// Doctors API info
router.get('/', generalLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Doctors API',
    endpoints: {
      getAllDoctors: 'GET /api/doctors',
      getDoctorById: 'GET /api/doctors/:id',
      createDoctor: 'POST /api/doctors',
      updateDoctor: 'PUT /api/doctors/:id',
      deleteDoctor: 'DELETE /api/doctors/:id',
      getAllDepartments: 'GET /api/doctors/departments',
      createDepartment: 'POST /api/doctors/departments',
      updateDepartment: 'PUT /api/doctors/departments/:id',
      deleteDepartment: 'DELETE /api/doctors/departments/:id'
    }
  });
});

// Get all GPs
router.get('/gps', generalLimiter, getGPs);

// Get all doctors
router.get('/doctors', generalLimiter, getAllDoctors);

// Get doctor by ID
router.get('/doctors/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid doctor ID')
  ],
  getDoctorById
);

// Create new doctor
router.post('/doctors', 
  generalLimiter,
  [
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    // Allow empty/omitted last name
    body('last_name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Last name must be up to 100 characters'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().isLength({ min: 10, max: 20 }).withMessage('Phone must be 10-20 characters'),
    body('department_id').optional().isInt({ min: 1 }).withMessage('Invalid department ID'),
  ],
  createDoctor
);

// Update doctor
router.put('/doctors/:id', 
  generalLimiter,
  param('id').isInt({ min: 1 }).withMessage('Invalid doctor ID'),
  body('first_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
  // Allow empty/omitted last name
  body('last_name').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Last name must be up to 100 characters'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isLength({ min: 10, max: 20 }).withMessage('Phone must be 10-20 characters'),
  body('department_id').optional().isInt({ min: 1 }).withMessage('Invalid department ID'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  updateDoctor
);

// Delete doctor (soft delete)
router.delete('/doctors/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid doctor ID')
  ],
  deleteDoctor
);

// Get all departments
router.get('/departments', generalLimiter, getAllDepartments);

// Create new department
router.post('/departments', 
  generalLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Department name must be 2-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be max 500 characters')
  ],
  createDepartment
);

// Update department
router.put('/departments/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid department ID'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Department name must be 2-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be max 500 characters')
  ],
  updateDepartment
);

// Delete department
router.delete('/departments/:id', 
  generalLimiter,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid department ID')
  ],
  deleteDepartment
);

export default router;
