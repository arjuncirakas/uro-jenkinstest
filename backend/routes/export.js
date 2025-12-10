import express from 'express';
import {
  exportPatientsToCSV,
  exportPatientsToExcel,
  getExportFields
} from '../controllers/exportController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All export routes require department_admin role
router.use(authenticateToken);
router.use(requireRole(['department_admin', 'superadmin']));

// Apply rate limiting
router.use(generalLimiter);

// Export endpoints
router.get('/fields', getExportFields);
router.get('/patients/csv', exportPatientsToCSV);
router.get('/patients/excel', exportPatientsToExcel);

export default router;

