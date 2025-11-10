import express from 'express';
import { 
  getAllUsers,
  filterUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  setupPassword,
  resendPasswordSetupEmail,
  getDashboardStats
} from '../controllers/superadminController.js';
import { authenticateToken } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();

// Apply XSS protection to all routes
router.use(xssProtection);

// Public password setup route (no authentication required) - MUST be before auth middleware
router.post('/setup-password', generalLimiter, setupPassword);

// Middleware to check if user is superadmin
const requireSuperadmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Superadmin privileges required.'
    });
  }
};

// Apply authentication and superadmin check to all routes
router.use(authenticateToken);
router.use(requireSuperadmin);

// Superadmin API info
router.get('/', generalLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Superadmin API',
    endpoints: {
      dashboardStats: 'GET /api/superadmin/dashboard-stats',
      getAllUsers: 'GET /api/superadmin/users',
      createUser: 'POST /api/superadmin/users',
      getUserById: 'GET /api/superadmin/users/:id',
      updateUser: 'PUT /api/superadmin/users/:id',
      deleteUser: 'DELETE /api/superadmin/users/:id',
      resendPasswordSetup: 'POST /api/superadmin/users/:id/resend-password-setup'
    }
  });
});

// Dashboard routes
router.get('/dashboard-stats', generalLimiter, getDashboardStats);

// User management routes
router.get('/users', generalLimiter, getAllUsers);
router.get('/users/filter', generalLimiter, filterUsers);
router.post('/users', generalLimiter, createUser);
router.get('/users/:id', generalLimiter, getUserById);
router.put('/users/:id', generalLimiter, updateUser);
router.delete('/users/:id', generalLimiter, deleteUser);
router.post('/users/:id/resend-password-setup', generalLimiter, resendPasswordSetupEmail);

export default router;
