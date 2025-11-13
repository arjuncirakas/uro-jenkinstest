import express from 'express';
import { 
  bookUrologistAppointment, 
  bookInvestigation, 
  getPatientAppointments, 
  getPatientInvestigationBookings,
  getAvailableUrologists,
  getAvailableDoctors,
  getTodaysAppointments,
  getDashboardTodaysAppointments,
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

// Log all requests to booking routes for debugging
router.use((req, res, next) => {
  console.log(`🔷 [BOOKING ROUTER] ${req.method} ${req.path} - Query:`, req.query);
  console.log(`🔷 [BOOKING ROUTER] Original URL: ${req.originalUrl}`);
  next();
});

// Book urologist appointment for a patient
router.post('/patients/:patientId/appointments',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  bookUrologistAppointment
);

// Book investigation for a patient
router.post('/patients/:patientId/investigations',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  bookInvestigation
);

// Get patient appointments
router.get('/patients/:patientId/appointments',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor', 'gp']),
  getPatientAppointments
);

// Get patient investigation bookings
router.get('/patients/:patientId/investigation-bookings',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor', 'gp']),
  getPatientInvestigationBookings
);

// Get available urologists
router.get('/urologists',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor', 'gp']),
  getAvailableUrologists
);

// Get all available doctors (all specializations)
router.get('/doctors',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor', 'superadmin']),
  getAvailableDoctors
);

// Get today's appointments for dashboard (new simplified endpoint)
router.get('/appointments/dashboard-today',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  getDashboardTodaysAppointments
);

// Get today's appointments
router.get('/appointments/today',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  (req, res, next) => {
    console.log(`🔵 [ROUTE] /appointments/today - Request received`);
    console.log(`🔵 [ROUTE] /appointments/today - User:`, req.user?.id, req.user?.role);
    console.log(`🔵 [ROUTE] /appointments/today - Query:`, req.query);
    next();
  },
  getTodaysAppointments
);

// Get no-show patients
router.get('/no-show-patients',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  getNoShowPatients
);

// Mark appointment as no-show
router.put('/appointments/:appointmentId/no-show',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  markAppointmentAsNoShow
);

// Add note to no-show patient
router.post('/appointments/:appointmentId/notes',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  addNoShowNote
);

// Get notes for no-show patient
router.get('/appointments/:appointmentId/notes',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  getNoShowNotes
);

// Remove note from no-show patient
router.delete('/notes/:noteId',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  removeNoShowNote
);

// Get available time slots for a doctor
router.get('/doctors/:doctorId/available-slots',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor', 'superadmin']),
  getAvailableTimeSlots
);

// Reschedule a no-show appointment
router.put('/appointments/:appointmentId/reschedule',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  rescheduleNoShowAppointment
);

// Get all appointments for calendar view
router.get('/appointments',
  generalLimiter,
  authenticateToken,
  requireRole(['urology_nurse', 'urologist', 'doctor']),
  (req, res, next) => {
    console.log(`🟢 [ROUTE] /appointments - Request received`);
    console.log(`🟢 [ROUTE] /appointments - User:`, req.user?.id, req.user?.role);
    console.log(`🟢 [ROUTE] /appointments - Query:`, req.query);
    next();
  },
  getAllAppointments
);

export default router;
