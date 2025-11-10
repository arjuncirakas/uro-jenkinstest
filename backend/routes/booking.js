import express from 'express';
import { 
  bookUrologistAppointment, 
  bookInvestigation, 
  getPatientAppointments, 
  getPatientInvestigationBookings,
  getAvailableUrologists,
  getAvailableDoctors,
  getTodaysAppointments,
  getNoShowPatients,
  markAppointmentAsNoShow,
  addNoShowNote,
  getNoShowNotes,
  removeNoShowNote,
  getAvailableTimeSlots,
  rescheduleNoShowAppointment,
  getAllAppointments
} from '../controllers/bookingController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { xssProtection } from '../middleware/sanitizer.js';

const router = express.Router();
router.use(xssProtection);

// Book urologist appointment for a patient
router.post('/patients/:patientId/appointments',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  bookUrologistAppointment
);

// Book investigation for a patient
router.post('/patients/:patientId/investigations',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  bookInvestigation
);

// Get patient appointments
router.get('/patients/:patientId/appointments',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'gp']),
  getPatientAppointments
);

// Get patient investigation bookings
router.get('/patients/:patientId/investigation-bookings',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'gp']),
  getPatientInvestigationBookings
);

// Get available urologists
router.get('/urologists',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'gp']),
  getAvailableUrologists
);

// Get all available doctors (all specializations)
router.get('/doctors',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'superadmin']),
  getAvailableDoctors
);

// Get today's appointments
router.get('/appointments/today',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  getTodaysAppointments
);

// Get no-show patients
router.get('/no-show-patients',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  getNoShowPatients
);

// Mark appointment as no-show
router.put('/appointments/:appointmentId/no-show',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  markAppointmentAsNoShow
);

// Add note to no-show patient
router.post('/appointments/:appointmentId/notes',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  addNoShowNote
);

// Get notes for no-show patient
router.get('/appointments/:appointmentId/notes',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  getNoShowNotes
);

// Remove note from no-show patient
router.delete('/notes/:noteId',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  removeNoShowNote
);

// Get available time slots for a doctor
router.get('/doctors/:doctorId/available-slots',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'superadmin']),
  getAvailableTimeSlots
);

// Reschedule a no-show appointment
router.put('/appointments/:appointmentId/reschedule',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  rescheduleNoShowAppointment
);

// Get all appointments for calendar view
router.get('/appointments',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist']),
  getAllAppointments
);

export default router;
