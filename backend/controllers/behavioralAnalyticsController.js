import {
  calculateBaseline,
  getUserBaselines,
  getAnomalies,
  getNotifiedAnomalies,
  updateAnomalyStatus,
  getAnomalyStatistics
} from '../services/behavioralAnalyticsService.js';

/**
 * Behavioral Analytics Controller
 * Handles API endpoints for behavioral analytics
 */

/**
 * Get all baselines
 * GET /api/superadmin/behavioral-analytics/baselines?userId=123 OR ?email=user@example.com
 */
export const getBaselines = async (req, res) => {
  try {
    const { userId, email } = req.query;

    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: 'userId or email query parameter is required'
      });
    }

    const userIdOrEmail = email || userId;
    const baselines = await getUserBaselines(userIdOrEmail);

    res.json({
      success: true,
      data: baselines
    });
  } catch (error) {
    console.error('Error getting baselines:', error);
    
    if (error.message?.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve baselines',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get anomalies with filters
 * GET /api/superadmin/behavioral-analytics/anomalies?status=new&severity=high&limit=50&offset=0
 */
export const getAnomaliesController = async (req, res) => {
  try {
    const {
      status,
      severity,
      userId,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (userId) filters.userId = parseInt(userId);
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await getAnomalies(filters);

    res.json({
      success: true,
      data: result.anomalies,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset
      }
    });
  } catch (error) {
    console.error('Error getting anomalies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve anomalies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get notified anomalies (anomalies that have been converted to breach incidents)
 * GET /api/superadmin/behavioral-analytics/anomalies/notified?severity=high&limit=50&offset=0
 */
export const getNotifiedAnomaliesController = async (req, res) => {
  try {
    const {
      severity,
      userId,
      startDate,
      endDate,
      limit,
      offset
    } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (userId) filters.userId = parseInt(userId);
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const result = await getNotifiedAnomalies(filters);

    res.json({
      success: true,
      data: result.anomalies,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset
      }
    });
  } catch (error) {
    console.error('Error getting notified anomalies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notified anomalies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update anomaly status
 * PUT /api/superadmin/behavioral-analytics/anomalies/:id
 */
export const updateAnomalyStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'anomaly ID is required'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }

    // Validate and parse ID
    const anomalyId = parseInt(id, 10);
    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid anomaly ID'
      });
    }

    const anomaly = await updateAnomalyStatus(anomalyId, status, reviewedBy ? parseInt(reviewedBy, 10) : null);

    res.json({
      success: true,
      data: anomaly
    });
  } catch (error) {
    console.error('Error updating anomaly status:', error);
    
    if (error.message === 'Anomaly not found') {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update anomaly status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Calculate baseline for a user
 * POST /api/superadmin/behavioral-analytics/baselines/calculate
 * Body: { userId: 123, baselineType: 'time' } OR { email: 'user@example.com', baselineType: 'time' }
 */
// Helper function to validate baseline request
const validateBaselineRequest = (userId, email, baselineType) => {
  if ((!userId && !email) || !baselineType) {
    return {
      isValid: false,
      error: {
        status: 400,
        message: 'userId or email, and baselineType are required'
      }
    };
  }

  if (!['location', 'time', 'access_pattern'].includes(baselineType)) {
    return {
      isValid: false,
      error: {
        status: 400,
        message: 'Invalid baselineType. Must be: location, time, or access_pattern'
      }
    };
  }

  return { isValid: true };
};

// Helper function to handle baseline calculation errors
const handleBaselineError = (error, req, res) => {
  console.error('Error calculating baseline:', error);
  
  if (error.message?.includes('does not exist')) {
    return res.status(404).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  if (error.message?.includes('foreign key constraint')) {
    return res.status(400).json({
      success: false,
      message: `User with ID ${req.body.userId} does not exist. Please verify the user ID.`,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Failed to calculate baseline',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const calculateBaselineController = async (req, res) => {
  try {
    const { userId, email, baselineType } = req.body;

    const validation = validateBaselineRequest(userId, email, baselineType);
    if (!validation.isValid) {
      return res.status(validation.error.status).json({
        success: false,
        message: validation.error.message
      });
    }

    const userIdOrEmail = email || userId;
    const baseline = await calculateBaseline(userIdOrEmail, baselineType);

    res.json({
      success: true,
      data: baseline,
      message: 'Baseline calculated successfully'
    });
  } catch (error) {
    return handleBaselineError(error, req, res);
  }
};

/**
 * Get anomaly statistics
 * GET /api/superadmin/behavioral-analytics/statistics
 */
export const getStatistics = async (req, res) => {
  try {
    const statistics = await getAnomalyStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
