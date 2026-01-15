import express from 'express';
import {
  addNote,
  getPatientNotes,
  updateNote,
  deleteNote
} from '../controllers/notesController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
// Rate limiting removed for notes routes to prevent 429 errors in doctor/urologist panel
// import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();
router.use(xssProtection);

// Add a new note for a patient - accessible by urologists, doctors, and nurses
// Rate limiting removed for doctor/urologist panel to prevent 429 errors
router.post('/patients/:patientId/notes',
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  addNote
);

// Get all notes for a patient - accessible by urologists, doctors, nurses, and GPs
// Rate limiting removed for doctor/urologist panel to prevent 429 errors
router.get('/patients/:patientId/notes',
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  getPatientNotes
);

// Update a note - accessible by urologists, doctors, and nurses (own notes only)
// Rate limiting removed for doctor/urologist panel to prevent 429 errors
router.put('/notes/:noteId',
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  updateNote
);

// Delete a note - accessible by urologists, doctors, and nurses (own notes only)
// Rate limiting removed for doctor/urologist panel to prevent 429 errors
router.delete('/notes/:noteId',
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  deleteNote
);

export default router;


