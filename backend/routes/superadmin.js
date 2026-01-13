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
import {
  getDataInventoryController,
  getAccessLogsController,
  getProcessingActivitiesController,
  getRetentionInfoController,
  getThirdPartySharingController,
  getComplianceMetricsController,
  getChartDataController,
  exportAuditReportController,
  verifyAuditLogIntegrityController,
  verifyImmutabilityStatusController
} from '../controllers/dataAuditController.js';
import {
  getClassificationsController,
  setClassificationController,
  initializeClassificationsController
} from '../controllers/dataClassificationController.js';
import {
  getSecurityAlerts,
  getAlertStats,
  acknowledgeAlertController,
  resolveAlertController,
  getSecurityTeamMembers,
  addSecurityTeamMember,
  removeSecurityTeamMember,
  getDPOContactInfo,
  setDPOContactInfo
} from '../controllers/securityDashboardController.js';
import {
  getBaselines,
  getAnomaliesController,
  updateAnomalyStatusController,
  calculateBaselineController,
  getStatistics
} from '../controllers/behavioralAnalyticsController.js';
import {
  createIncidentController,
  getIncidentsController,
  updateIncidentStatusController,
  createNotificationController,
  sendNotificationController,
  getNotificationsController,
  addRemediationController,
  getRemediationsController
} from '../controllers/breachNotificationController.js';
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

// Data Audit routes
router.get('/data-audit/inventory', generalLimiter, getDataInventoryController);
router.get('/data-audit/access-logs', generalLimiter, getAccessLogsController);
router.get('/data-audit/processing-activities', generalLimiter, getProcessingActivitiesController);
router.get('/data-audit/retention', generalLimiter, getRetentionInfoController);
router.get('/data-audit/third-party-sharing', generalLimiter, getThirdPartySharingController);
router.get('/data-audit/compliance-metrics', generalLimiter, getComplianceMetricsController);
router.get('/data-audit/chart-data', generalLimiter, getChartDataController);
router.get('/data-audit/export', generalLimiter, exportAuditReportController);
router.get('/data-audit/verify-integrity', generalLimiter, verifyAuditLogIntegrityController);
router.get('/data-audit/verify-immutability', generalLimiter, verifyImmutabilityStatusController);

// Data Classification routes
router.get('/data-classification', generalLimiter, getClassificationsController);
router.post('/data-classification', generalLimiter, setClassificationController);
router.post('/data-classification/initialize', generalLimiter, initializeClassificationsController);

// Security Dashboard routes
router.get('/security-alerts', generalLimiter, getSecurityAlerts);
router.get('/security-alerts/stats', generalLimiter, getAlertStats);
router.post('/security-alerts/:id/acknowledge', generalLimiter, acknowledgeAlertController);
router.post('/security-alerts/:id/resolve', generalLimiter, resolveAlertController);
router.get('/security-team', generalLimiter, getSecurityTeamMembers);
router.post('/security-team', generalLimiter, addSecurityTeamMember);
router.delete('/security-team/:id', generalLimiter, removeSecurityTeamMember);
router.get('/dpo-contact', generalLimiter, getDPOContactInfo);
router.post('/dpo-contact', generalLimiter, setDPOContactInfo);

// Behavioral Analytics routes
router.get('/behavioral-analytics/baselines', generalLimiter, getBaselines);
router.get('/behavioral-analytics/anomalies', generalLimiter, getAnomaliesController);
router.put('/behavioral-analytics/anomalies/:id', generalLimiter, updateAnomalyStatusController);
router.post('/behavioral-analytics/baselines/calculate', generalLimiter, calculateBaselineController);
router.get('/behavioral-analytics/statistics', generalLimiter, getStatistics);

// Breach Management routes
router.post('/breach-incidents', generalLimiter, createIncidentController);
router.get('/breach-incidents', generalLimiter, getIncidentsController);
router.put('/breach-incidents/:id/status', generalLimiter, updateIncidentStatusController);
router.post('/breach-incidents/:id/notifications', generalLimiter, createNotificationController);
router.get('/breach-incidents/:id/notifications', generalLimiter, getNotificationsController);
router.post('/breach-notifications/:id/send', generalLimiter, sendNotificationController);
router.post('/breach-incidents/:id/remediations', generalLimiter, addRemediationController);
router.get('/breach-incidents/:id/remediations', generalLimiter, getRemediationsController);

export default router;
