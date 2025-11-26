import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  scheduleMDTMeeting,
  getPatientMDTMeetings,
  getAllMDTMeetings,
  getMyMDTMeetings,
  getMDTMeetingById,
  updateMDTMeetingStatus,
  deleteMDTMeeting,
  rescheduleMDTMeeting,
  saveMDTNotes
} from '../controllers/mdtController.js';
import { checkPatientAccess } from '../middleware/idorProtection.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Schedule MDT meeting for a patient
router.post('/patients/:patientId/mdt', checkPatientAccess, scheduleMDTMeeting);

// Get MDT meetings for a specific patient
router.get('/patients/:patientId/mdt', checkPatientAccess, getPatientMDTMeetings);

// Get all MDT meetings (with optional filters)
router.get('/mdt', getAllMDTMeetings);

// Get MDT meetings for current authenticated user
router.get('/mdt/my', getMyMDTMeetings);

// Get specific MDT meeting by id
router.get('/mdt/:meetingId', getMDTMeetingById);

// Update MDT meeting status
router.put('/mdt/:meetingId/status', updateMDTMeetingStatus);

// Reschedule MDT meeting (update date/time)
router.put('/mdt/:meetingId/reschedule', rescheduleMDTMeeting);

// Save MDT notes (details stored in notes JSON)
router.put('/mdt/:meetingId/notes', saveMDTNotes);

// Delete MDT meeting
router.delete('/mdt/:meetingId', deleteMDTMeeting);

export default router;

