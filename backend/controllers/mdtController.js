import pool from '../config/database.js';

// Schedule MDT meeting
export const scheduleMDTMeeting = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { 
      meetingDate, 
      meetingTime, 
      priority = 'Medium',
      notes = '',
      teamMembers = []
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!meetingDate || !meetingTime) {
      return res.status(400).json({
        success: false,
        message: 'Meeting date and time are required'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get user details
    const userCheck = await client.query(
      'SELECT first_name, last_name, role FROM users WHERE id = $1',
      [userId]
    );

    const userDetails = userCheck.rows[0];
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Insert MDT meeting
    const mdtResult = await client.query(
      `INSERT INTO mdt_meetings (
        patient_id, meeting_date, meeting_time, priority, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [patientId, meetingDate, meetingTime, priority, notes, userId]
    );

    const mdtMeeting = mdtResult.rows[0];

    // Add team members (if any)
    const teamMemberInserts = [];
    if (teamMembers && Array.isArray(teamMembers)) {
      for (const member of teamMembers) {
        // For now, we'll create placeholder entries since we don't have user IDs for external team members
        // In a real system, you'd look up or create user records for external team members
        const memberResult = await client.query(
          `INSERT INTO mdt_team_members (mdt_meeting_id, user_id, external_name, role, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [mdtMeeting.id, null, member.name || null, member.role || 'Team Member', 'Invited']
        );
        teamMemberInserts.push(memberResult.rows[0]);
      }
    }

    // Add the creator as a team member
    await client.query(
      `INSERT INTO mdt_team_members (mdt_meeting_id, user_id, role, status)
       VALUES ($1, $2, $3, $4)`,
      [mdtMeeting.id, userId, userDetails.role, 'Confirmed']
    );

    // Commit transaction
    await client.query('COMMIT');

    // Get team members with user details
    const teamMembersWithDetails = await client.query(
      `SELECT 
        mtm.id,
        mtm.user_id,
        mtm.role,
        mtm.status,
        mtm.external_name,
        COALESCE(u.first_name, 'External') as first_name,
        COALESCE(u.last_name, 'Team Member') as last_name,
        COALESCE(u.role, mtm.role) as user_role
       FROM mdt_team_members mtm
       LEFT JOIN users u ON mtm.user_id = u.id
       WHERE mtm.mdt_meeting_id = $1`,
      [mdtMeeting.id]
    );

    res.json({
      success: true,
      message: 'MDT meeting scheduled successfully',
      data: {
        id: mdtMeeting.id,
        patientId: mdtMeeting.patient_id,
        meetingDate: mdtMeeting.meeting_date,
        meetingTime: mdtMeeting.meeting_time,
        priority: mdtMeeting.priority,
        status: mdtMeeting.status,
        notes: mdtMeeting.notes,
        createdBy: {
          id: userId,
          name: `${userDetails.first_name} ${userDetails.last_name}`,
          role: userDetails.role
        },
        teamMembers: teamMembersWithDetails.rows.map(member => ({
          id: member.id,
          userId: member.user_id,
          name: member.user_id ? `${member.first_name} ${member.last_name}` : (member.external_name || 'External Team Member'),
          role: member.role,
          userRole: member.user_role,
          status: member.status
        })),
        createdAt: mdtMeeting.created_at
      }
    });

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Schedule MDT meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: error?.message || String(error)
    });
  } finally {
    client.release();
  }
};

// Get MDT meetings for a patient
export const getPatientMDTMeetings = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get MDT meetings with team members
    const mdtMeetings = await client.query(
      `SELECT 
        m.id,
        m.meeting_date,
        m.meeting_time,
        m.priority,
        m.status,
        m.notes,
        m.created_at,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        u.role as created_by_role
       FROM mdt_meetings m
       JOIN users u ON m.created_by = u.id
       WHERE m.patient_id = $1
       ORDER BY m.meeting_date DESC, m.meeting_time DESC`,
      [patientId]
    );

    // Get team members for each meeting
    const meetingsWithTeamMembers = await Promise.all(
      mdtMeetings.rows.map(async (meeting) => {
        const teamMembers = await client.query(
          `SELECT 
            mtm.id,
            mtm.role,
            mtm.status,
            mtm.external_name,
            u.first_name,
            u.last_name,
            u.role as user_role
           FROM mdt_team_members mtm
           LEFT JOIN users u ON mtm.user_id = u.id
           WHERE mtm.mdt_meeting_id = $1`,
          [meeting.id]
        );

        return {
          id: meeting.id,
          meetingDate: meeting.meeting_date,
          meetingTime: meeting.meeting_time,
          priority: meeting.priority,
          status: meeting.status,
          notes: meeting.notes,
          createdBy: {
            name: `${meeting.created_by_first_name} ${meeting.created_by_last_name}`,
            role: meeting.created_by_role
          },
          teamMembers: teamMembers.rows.map(member => ({
            id: member.id,
            name: member.first_name ? `${member.first_name} ${member.last_name}` : (member.external_name || 'External Team Member'),
            role: member.role,
            userRole: member.user_role,
            status: member.status
          })),
          createdAt: meeting.created_at
        };
      })
    );

    res.json({
      success: true,
      message: 'MDT meetings retrieved successfully',
      data: {
        meetings: meetingsWithTeamMembers,
        count: meetingsWithTeamMembers.length
      }
    });

  } catch (error) {
    console.error('Get patient MDT meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get all MDT meetings
export const getAllMDTMeetings = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { status, priority, date } = req.query;

    // Build query with filters
    let query = `
      SELECT 
        m.id,
        m.meeting_date,
        m.meeting_time,
        m.priority,
        m.status,
        m.notes,
        m.created_at,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.upi,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        u.role as created_by_role
      FROM mdt_meetings m
      JOIN patients p ON m.patient_id = p.id
      JOIN users u ON m.created_by = u.id
    `;

    const queryParams = [];
    const whereConditions = [];

    if (status) {
      whereConditions.push(`m.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    if (priority) {
      whereConditions.push(`m.priority = $${queryParams.length + 1}`);
      queryParams.push(priority);
    }

    if (date) {
      whereConditions.push(`m.meeting_date = $${queryParams.length + 1}`);
      queryParams.push(date);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` ORDER BY m.meeting_date DESC, m.meeting_time DESC`;

    const result = await client.query(query, queryParams);

    // Get team members for each meeting
    const meetingsWithTeamMembers = await Promise.all(
      result.rows.map(async (meeting) => {
        const teamMembers = await client.query(
          `SELECT 
            mtm.id,
            mtm.role,
            mtm.status,
            u.first_name,
            u.last_name,
            u.role as user_role
           FROM mdt_team_members mtm
           JOIN users u ON mtm.user_id = u.id
           WHERE mtm.mdt_meeting_id = $1`,
          [meeting.id]
        );

        return {
          id: meeting.id,
          patient: {
            name: `${meeting.patient_first_name} ${meeting.patient_last_name}`,
            upi: meeting.upi
          },
          meetingDate: meeting.meeting_date,
          meetingTime: meeting.meeting_time,
          priority: meeting.priority,
          status: meeting.status,
          notes: meeting.notes,
          createdBy: {
            name: `${meeting.created_by_first_name} ${meeting.created_by_last_name}`,
            role: meeting.created_by_role
          },
          teamMembers: teamMembers.rows.map(member => ({
            id: member.id,
            name: `${member.first_name} ${member.last_name}`,
            role: member.role,
            userRole: member.user_role,
            status: member.status
          })),
          createdAt: meeting.created_at
        };
      })
    );

    res.json({
      success: true,
      message: 'MDT meetings retrieved successfully',
      data: {
        meetings: meetingsWithTeamMembers,
        count: meetingsWithTeamMembers.length
      }
    });

  } catch (error) {
    console.error('Get all MDT meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get single MDT meeting by ID (with patient and team members)
export const getMDTMeetingById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { meetingId } = req.params;

    const meetingQuery = await client.query(
      `SELECT 
         m.id,
         m.patient_id,
         m.meeting_date,
         m.meeting_time,
         m.priority,
         m.status,
         m.notes,
         m.created_at,
         p.first_name as patient_first_name,
         p.last_name as patient_last_name,
         p.upi as patient_upi,
         u.first_name as created_by_first_name,
         u.last_name as created_by_last_name,
         u.role as created_by_role
       FROM mdt_meetings m
       JOIN patients p ON m.patient_id = p.id
       JOIN users u ON m.created_by = u.id
       WHERE m.id = $1`,
      [meetingId]
    );

    if (meetingQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'MDT meeting not found' });
    }

    const meeting = meetingQuery.rows[0];

    const teamMembers = await client.query(
      `SELECT 
         mtm.id,
         mtm.role,
         mtm.status,
         mtm.external_name,
         u.first_name,
         u.last_name,
         u.role as user_role
       FROM mdt_team_members mtm
       LEFT JOIN users u ON mtm.user_id = u.id
       WHERE mtm.mdt_meeting_id = $1`,
      [meetingId]
    );

    // Parse notes JSON (if any)
    let parsedNotes = {};
    try {
      parsedNotes = meeting.notes ? (typeof meeting.notes === 'string' ? JSON.parse(meeting.notes) : meeting.notes) : {};
    } catch (_) {
      parsedNotes = {};
    }

    const data = {
      id: meeting.id,
      meetingDate: meeting.meeting_date,
      meetingTime: meeting.meeting_time,
      priority: meeting.priority,
      status: meeting.status,
      // Keep raw notes and also surface parsed fields
      notes: meeting.notes,
      clinicalSummary: parsedNotes.clinicalSummary || null,
      content: parsedNotes.content || null,
      mdtOutcome: parsedNotes.mdtOutcome || null,
      recommendations: parsedNotes.recommendations || [],
      actionItems: parsedNotes.actionItems || [],
      decisions: parsedNotes.decisions || [],
      outcomes: parsedNotes.outcomes || [],
      attendees: parsedNotes.attendees || [],
      patientInfo: parsedNotes.patientInfo || null,
      meta: parsedNotes.meta || null,
      patient: {
        id: meeting.patient_id,
        name: `${meeting.patient_first_name} ${meeting.patient_last_name}`,
        upi: meeting.patient_upi
      },
      createdBy: {
        name: `${meeting.created_by_first_name} ${meeting.created_by_last_name}`,
        role: meeting.created_by_role
      },
      teamMembers: teamMembers.rows.map(member => ({
        id: member.id,
        name: member.first_name ? `${member.first_name} ${member.last_name}` : (member.external_name || 'External Team Member'),
        role: member.role,
        userRole: member.user_role,
        status: member.status
      })),
      createdAt: meeting.created_at
    };

    res.json({ success: true, message: 'MDT meeting retrieved successfully', data });
  } catch (error) {
    console.error('Get MDT meeting by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Get MDT meetings for current authenticated user (creator or team member)
export const getMyMDTMeetings = async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`\n📋 [getMyMDTMeetings ${requestId}] Starting`);
  console.log(`📋 [getMyMDTMeetings ${requestId}] User:`, req.user?.id, req.user?.role);
  
  let client;
  try {
    console.log(`📋 [getMyMDTMeetings ${requestId}] Connecting to database...`);
    client = await pool.connect();
    console.log(`✅ [getMyMDTMeetings ${requestId}] Database connection successful`);
  } catch (dbError) {
    console.error(`❌ [getMyMDTMeetings ${requestId}] Database connection failed:`, dbError.message);
    console.error(`❌ [getMyMDTMeetings ${requestId}] Error stack:`, dbError.stack);
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: 'Service temporarily unavailable'
    });
  }
  
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    console.log(`📋 [getMyMDTMeetings ${requestId}] Processing for userId: ${userId}, role: ${userRole}`);

    const meetings = await client.query(
      `SELECT 
         m.id,
         m.patient_id,
         m.meeting_date,
         m.meeting_time,
         m.priority,
         m.status,
         m.notes,
         m.created_at,
         p.first_name as patient_first_name,
         p.last_name as patient_last_name,
         p.upi as patient_upi,
         u.first_name as created_by_first_name,
         u.last_name as created_by_last_name,
         u.role as created_by_role
       FROM mdt_meetings m
       JOIN users u ON m.created_by = u.id
       JOIN patients p ON m.patient_id = p.id
       WHERE m.created_by = $1
          OR EXISTS (
            SELECT 1 FROM mdt_team_members mtm
            WHERE mtm.mdt_meeting_id = m.id AND mtm.user_id = $1
          )
       ORDER BY m.meeting_date DESC, m.meeting_time DESC`,
      [userId]
    );

    const meetingsWithMembers = await Promise.all(
      meetings.rows.map(async (meeting) => {
        const teamMembers = await client.query(
          `SELECT 
             mtm.id,
             mtm.role,
             mtm.status,
             mtm.external_name,
             u.first_name,
             u.last_name,
             u.role as user_role
           FROM mdt_team_members mtm
           LEFT JOIN users u ON mtm.user_id = u.id
           WHERE mtm.mdt_meeting_id = $1`,
          [meeting.id]
        );

        return {
          id: meeting.id,
          meetingDate: meeting.meeting_date,
          meetingTime: meeting.meeting_time,
          priority: meeting.priority,
          status: meeting.status,
          notes: meeting.notes,
          patient: {
            id: meeting.patient_id,
            name: `${meeting.patient_first_name} ${meeting.patient_last_name}`,
            upi: meeting.patient_upi
          },
          createdBy: {
            name: `${meeting.created_by_first_name} ${meeting.created_by_last_name}`,
            role: meeting.created_by_role
          },
          teamMembers: teamMembers.rows.map(member => ({
            id: member.id,
            name: member.first_name ? `${member.first_name} ${member.last_name}` : (member.external_name || 'External Team Member'),
            role: member.role,
            userRole: member.user_role,
            status: member.status
          })),
          createdAt: meeting.created_at
        };
      })
    );

    res.json({
      success: true,
      message: 'MDT meetings for user retrieved successfully',
      data: { meetings: meetingsWithMembers, count: meetingsWithMembers.length }
    });
  } catch (error) {
    console.error(`❌ [getMyMDTMeetings ${requestId}] Error occurred:`, error.message);
    console.error(`❌ [getMyMDTMeetings ${requestId}] Error stack:`, error.stack);
    console.error(`❌ [getMyMDTMeetings ${requestId}] User info:`, { id: req.user?.id, role: req.user?.role });
    console.error(`❌ [getMyMDTMeetings ${requestId}] Error code:`, error.code);
    console.error(`❌ [getMyMDTMeetings ${requestId}] Error name:`, error.name);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      console.log(`📋 [getMyMDTMeetings ${requestId}] Releasing database connection`);
      client.release();
    }
  }
};

// Update MDT meeting status
export const updateMDTMeetingStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { meetingId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Check if meeting exists
    const meetingCheck = await client.query(
      'SELECT id, patient_id FROM mdt_meetings WHERE id = $1',
      [meetingId]
    );

    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'MDT meeting not found'
      });
    }

    // Update meeting status
    const updateResult = await client.query(
      `UPDATE mdt_meetings 
       SET status = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, meetingId]
    );

    const updatedMeeting = updateResult.rows[0];

    res.json({
      success: true,
      message: 'MDT meeting status updated successfully',
      data: {
        id: updatedMeeting.id,
        patientId: updatedMeeting.patient_id,
        status: updatedMeeting.status,
        notes: updatedMeeting.notes,
        updatedAt: updatedMeeting.updated_at
      }
    });

  } catch (error) {
    console.error('Update MDT meeting status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete MDT meeting
export const deleteMDTMeeting = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    // Check if meeting exists and user has permission
    const meetingCheck = await client.query(
      'SELECT id, created_by FROM mdt_meetings WHERE id = $1',
      [meetingId]
    );

    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'MDT meeting not found'
      });
    }

    // Check if user is the creator (or admin)
    if (meetingCheck.rows[0].created_by !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own MDT meetings'
      });
    }

    // Delete meeting (team members will be deleted by CASCADE)
    await client.query('DELETE FROM mdt_meetings WHERE id = $1', [meetingId]);

    res.json({
      success: true,
      message: 'MDT meeting deleted successfully'
    });

  } catch (error) {
    console.error('Delete MDT meeting error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Reschedule MDT meeting (update date/time)
export const rescheduleMDTMeeting = async (req, res) => {
  const client = await pool.connect();
  try {
    const { meetingId } = req.params;
    const { meetingDate, meetingTime, notes } = req.body;

    if (!meetingDate || !meetingTime) {
      return res.status(400).json({
        success: false,
        message: 'Meeting date and time are required',
      });
    }

    // Ensure meeting exists
    const existing = await client.query(
      'SELECT id, patient_id FROM mdt_meetings WHERE id = $1',
      [meetingId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'MDT meeting not found' });
    }

    const update = await client.query(
      `UPDATE mdt_meetings
       SET meeting_date = $1,
           meeting_time = $2,
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, patient_id, meeting_date, meeting_time, priority, status, notes, updated_at`,
      [meetingDate, meetingTime, notes || null, meetingId]
    );

    const row = update.rows[0];
    res.json({
      success: true,
      message: 'MDT meeting rescheduled successfully',
      data: {
        id: row.id,
        patientId: row.patient_id,
        meetingDate: row.meeting_date,
        meetingTime: row.meeting_time,
        priority: row.priority,
        status: row.status,
        notes: row.notes,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Reschedule MDT meeting error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Save MDT meeting detailed notes (store as JSON in notes column)
export const saveMDTNotes = async (req, res) => {
  const client = await pool.connect();
  try {
    const { meetingId } = req.params;
    const {
      content = '',
      mdtOutcome = '',
      recommendations = [],
      actionItems = [],
      decisions = [],
      outcomes = [],
      attendees = [],
      clinicalSummary = '',
      patientInfo = {},
      meta = {}
    } = req.body || {};

    // Ensure meeting exists
    const existing = await client.query(
      'SELECT id, patient_id FROM mdt_meetings WHERE id = $1',
      [meetingId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'MDT meeting not found' });
    }

    // Persist as JSON string in notes column (backward compatible)
    const notesPayload = {
      clinicalSummary,
      content,
      mdtOutcome,
      recommendations,
      actionItems,
      decisions,
      outcomes,
      attendees,
      patientInfo,
      meta,
      savedAt: new Date().toISOString()
    };

    const update = await client.query(
      `UPDATE mdt_meetings
       SET notes = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, patient_id, meeting_date, meeting_time, priority, status, notes, updated_at`,
      [JSON.stringify(notesPayload), meetingId]
    );

    const row = update.rows[0];
    // Parse notes JSON for convenient separate fields in API response
    let parsed = {};
    try {
      parsed = typeof row.notes === 'string' ? JSON.parse(row.notes) : (row.notes || {});
    } catch (_) {
      parsed = {};
    }
    res.json({
      success: true,
      message: 'MDT notes saved successfully',
      data: {
        id: row.id,
        patientId: row.patient_id,
        meetingDate: row.meeting_date,
        meetingTime: row.meeting_time,
        priority: row.priority,
        status: row.status,
        // Keep raw notes for backward compatibility
        notes: row.notes,
        // Expose structured fields separately
        clinicalSummary: parsed.clinicalSummary || null,
        content: parsed.content || null,
        mdtOutcome: parsed.mdtOutcome || null,
        recommendations: parsed.recommendations || [],
        actionItems: parsed.actionItems || [],
        decisions: parsed.decisions || [],
        outcomes: parsed.outcomes || [],
        attendees: parsed.attendees || [],
        patientInfo: parsed.patientInfo || null,
        meta: parsed.meta || null,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Save MDT notes error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};
