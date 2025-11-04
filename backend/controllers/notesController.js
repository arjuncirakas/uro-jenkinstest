import pool from '../config/database.js';

// Add a new note for a patient
export const addNote = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { content, noteContent, noteType = 'clinical' } = req.body;
    const noteContentToUse = content || noteContent;
    const userId = req.user.id; // From auth middleware
    const userRole = req.user.role; // From auth middleware

    // Validate required fields
    if (!noteContentToUse || noteContentToUse.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
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

    const patient = patientCheck.rows[0];

    // Get user details for author information
    const userCheck = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const authorName = userCheck.rows.length > 0 
      ? `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`
      : 'Unknown User';

    // Insert the note
    const result = await client.query(
      `INSERT INTO patient_notes (
        patient_id, note_content, note_type, author_id, author_name, author_role
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [patientId, noteContentToUse.trim(), noteType, userId, authorName, userRole]
    );

    const newNote = result.rows[0];

    res.json({
      success: true,
      message: 'Note added successfully',
      data: {
        id: newNote.id,
        patientId: newNote.patient_id,
        content: newNote.note_content,
        noteType: newNote.note_type,
        authorName: newNote.author_name,
        authorRole: newNote.author_role,
        createdAt: newNote.created_at,
        updatedAt: newNote.updated_at,
        formattedDate: new Date(newNote.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      }
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get all notes for a patient
export const getPatientNotes = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

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

    // Get notes with pagination
    const notesQuery = `
      SELECT 
        id,
        note_content,
        note_type,
        author_name,
        author_role,
        created_at,
        updated_at
      FROM patient_notes
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const notesResult = await client.query(notesQuery, [patientId, parseInt(limit), offset]);

    // Get total count
    const countResult = await client.query(
      'SELECT COUNT(*) as total FROM patient_notes WHERE patient_id = $1',
      [patientId]
    );

    const totalNotes = parseInt(countResult.rows[0].total);

    // Format notes for frontend
    const formattedNotes = notesResult.rows.map(note => ({
      id: note.id,
      content: note.note_content,
      type: note.note_type,
      authorName: note.author_name,
      authorRole: note.author_role,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      // Format date for display
      formattedDate: new Date(note.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }));

    res.json({
      success: true,
      message: 'Notes retrieved successfully',
      data: {
        notes: formattedNotes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalNotes,
          pages: Math.ceil(totalNotes / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get patient notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Update a note
export const updateNote = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { noteId } = req.params;
    const { content, noteContent } = req.body;
    const noteContentToUse = content || noteContent;
    const userId = req.user.id;

    // Validate required fields
    if (!noteContentToUse || noteContentToUse.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    // Check if note exists and user has permission
    const noteCheck = await client.query(
      'SELECT id, author_id FROM patient_notes WHERE id = $1',
      [noteId]
    );

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check if user is the author (or admin)
    if (noteCheck.rows[0].author_id !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own notes'
      });
    }

    // Update the note
    const result = await client.query(
      `UPDATE patient_notes 
       SET note_content = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [noteContentToUse.trim(), noteId]
    );

    const updatedNote = result.rows[0];

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: {
        id: updatedNote.id,
        noteContent: updatedNote.note_content,
        updatedAt: updatedNote.updated_at
      }
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete a note
export const deleteNote = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { noteId } = req.params;
    const userId = req.user.id;

    // Check if note exists and user has permission
    const noteCheck = await client.query(
      'SELECT id, author_id FROM patient_notes WHERE id = $1',
      [noteId]
    );

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check if user is the author (or admin)
    if (noteCheck.rows[0].author_id !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own notes'
      });
    }

    // Delete the note
    await client.query('DELETE FROM patient_notes WHERE id = $1', [noteId]);

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};
