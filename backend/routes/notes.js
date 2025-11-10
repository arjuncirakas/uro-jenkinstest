import express from 'express';
import {
  addNote,
  getPatientNotes,
  updateNote,
  deleteNote
} from '../controllers/notesController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();
router.use(xssProtection);

// Add a new note for a patient - accessible by urologists, doctors, and nurses
router.post('/patients/:patientId/notes',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  addNote
);

// Get all notes for a patient - accessible by urologists, doctors, nurses, and GPs
router.get('/patients/:patientId/notes',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse', 'gp']),
  getPatientNotes
);

// Update a note - accessible by urologists, doctors, and nurses (own notes only)
router.put('/notes/:noteId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  updateNote
);

// Delete a note - accessible by urologists, doctors, and nurses (own notes only)
router.delete('/notes/:noteId',
  generalLimiter,
  authenticateToken,
  requireRole(['urologist', 'doctor', 'urology_nurse']),
  deleteNote
);

export default router;


