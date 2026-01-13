import pool from '../config/database.js';
import { getActiveAlerts, acknowledgeAlert, resolveAlert } from '../services/alertService.js';

/**
 * Security Dashboard Controller
 * Handles security alert management, security team member management, and DPO contact information
 */

/**
 * Get all security alerts with filters
 */
export const getSecurityAlerts = async (req, res) => {
  try {
    const { status, severity, limit = 50, offset = 0 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    filters.limit = Number.parseInt(limit, 10);
    filters.offset = Number.parseInt(offset, 10);
    
    const result = await getActiveAlerts(filters);
    
    res.json({
      success: true,
      data: result.alerts,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error getting security alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get alert statistics
 */
export const getAlertStats = async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get counts by severity
      const severityResult = await client.query(`
        SELECT severity, COUNT(*) as count
        FROM security_alerts
        WHERE status != 'resolved'
        GROUP BY severity
      `);
      
      // Get counts by status
      const statusResult = await client.query(`
        SELECT status, COUNT(*) as count
        FROM security_alerts
        GROUP BY status
      `);
      
      // Get total alerts
      const totalResult = await client.query(`
        SELECT COUNT(*) as total
        FROM security_alerts
      `);
      
      const stats = {
        bySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        byStatus: {
          new: 0,
          acknowledged: 0,
          resolved: 0
        },
        total: Number.parseInt(totalResult.rows[0].total, 10)
      };
      
      severityResult.rows.forEach(row => {
        stats.bySeverity[row.severity] = Number.parseInt(row.count, 10);
      });
      
      statusResult.rows.forEach(row => {
        stats.byStatus[row.status] = Number.parseInt(row.count, 10);
      });
      
      res.json({
        success: true,
        data: stats
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alert statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Acknowledge an alert
 */
export const acknowledgeAlertController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const alert = await acknowledgeAlert(Number.parseInt(id, 10), userId);
    
    res.json({
      success: true,
      data: alert,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Resolve an alert
 */
export const resolveAlertController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const alert = await resolveAlert(Number.parseInt(id, 10), userId);
    
    res.json({
      success: true,
      data: alert,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all security team members
 */
export const getSecurityTeamMembers = async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, name, email, created_at, created_by
        FROM security_team_members
        ORDER BY created_at DESC
      `);
      
      res.json({
        success: true,
        data: result.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting security team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security team members',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add new security team member
 */
export const addSecurityTeamMember = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Check for duplicate email
      const existingResult = await client.query(`
        SELECT id FROM security_team_members WHERE email = $1
      `, [email]);
      
      if (existingResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Security team member with this email already exists'
        });
      }
      
      // Insert new member
      const result = await client.query(`
        INSERT INTO security_team_members (name, email, created_by)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at, created_by
      `, [name, email, userId]);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Security team member added successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding security team member:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: 'Security team member with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to add security team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Remove security team member
 */
export const removeSecurityTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Check if member exists
      const checkResult = await client.query(`
        SELECT id FROM security_team_members WHERE id = $1
      `, [Number.parseInt(id, 10)]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Security team member not found'
        });
      }
      
      // Delete member
      await client.query(`
        DELETE FROM security_team_members WHERE id = $1
      `, [Number.parseInt(id, 10)]);
      
      res.json({
        success: true,
        message: 'Security team member removed successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error removing security team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove security team member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get DPO contact information
 */
export const getDPOContactInfo = async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, name, email, contact_number, created_at, updated_at
        FROM dpo_contact_info
        ORDER BY updated_at DESC
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: null
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting DPO contact info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve DPO contact information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add or update DPO contact information
 */
export const setDPOContactInfo = async (req, res) => {
  try {
    const { name, email, contact_number } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    if (!name || !email || !contact_number) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and contact number are required'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Validate contact number (basic validation - allow digits, spaces, dashes, plus)
    const contactRegex = /^[\d\s\-+()]+$/;
    if (!contactRegex.test(contact_number) || contact_number.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact number format'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // Check if DPO info already exists
      const existingResult = await client.query(`
        SELECT id FROM dpo_contact_info LIMIT 1
      `);
      
      let result;
      if (existingResult.rows.length > 0) {
        // Update existing record
        result = await client.query(`
          UPDATE dpo_contact_info
          SET name = $1, email = $2, contact_number = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING id, name, email, contact_number, created_at, updated_at
        `, [name.trim(), email.trim(), contact_number.trim(), existingResult.rows[0].id]);
      } else {
        // Insert new record
        result = await client.query(`
          INSERT INTO dpo_contact_info (name, email, contact_number, created_by)
          VALUES ($1, $2, $3, $4)
          RETURNING id, name, email, contact_number, created_at, updated_at
        `, [name.trim(), email.trim(), contact_number.trim(), userId]);
      }
      
      res.json({
        success: true,
        data: result.rows[0],
        message: existingResult.rows.length > 0 
          ? 'DPO contact information updated successfully'
          : 'DPO contact information added successfully'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error setting DPO contact info:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: 'DPO contact information already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to save DPO contact information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
