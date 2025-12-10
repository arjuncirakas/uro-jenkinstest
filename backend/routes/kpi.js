import express from 'express';
import {
  getAverageWaitTime,
  getActiveSurveillanceCompliance,
  getDischargeToGPPercentage,
  getAllKPIs,
  getKPITrends
} from '../controllers/kpiController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All KPI routes require department_admin role
router.use(authenticateToken);
router.use(requireRole(['department_admin', 'superadmin']));

// Apply rate limiting
router.use(generalLimiter);

// KPI endpoints
router.get('/wait-time', getAverageWaitTime);
router.get('/active-surveillance-compliance', getActiveSurveillanceCompliance);
router.get('/discharge-to-gp', getDischargeToGPPercentage);
router.get('/all', getAllKPIs);
router.get('/trends', getKPITrends);

export default router;

