import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create mock functions
const mockBookUrologistAppointment = jest.fn();
const mockBookInvestigation = jest.fn();
const mockGetPatientAppointments = jest.fn();
const mockGetPatientInvestigationBookings = jest.fn();
const mockGetAvailableUrologists = jest.fn();
const mockGetAvailableDoctors = jest.fn();
const mockGetTodaysAppointments = jest.fn();
const mockGetNoShowPatients = jest.fn();
const mockMarkAppointmentAsNoShow = jest.fn();
const mockAddNoShowNote = jest.fn();
const mockGetNoShowNotes = jest.fn();
const mockRemoveNoShowNote = jest.fn();
const mockGetAvailableTimeSlots = jest.fn();
const mockRescheduleNoShowAppointment = jest.fn();
const mockGetAllAppointments = jest.fn();
const mockSendAppointmentReminder = jest.fn();
const mockSendBulkAppointmentReminders = jest.fn();
const mockGetUpcomingAppointments = jest.fn();

// Mock bookingController
jest.unstable_mockModule('../controllers/bookingController.js', () => ({
    bookUrologistAppointment: mockBookUrologistAppointment,
    bookInvestigation: mockBookInvestigation,
    getPatientAppointments: mockGetPatientAppointments,
    getPatientInvestigationBookings: mockGetPatientInvestigationBookings,
    getAvailableUrologists: mockGetAvailableUrologists,
    getAvailableDoctors: mockGetAvailableDoctors,
    getTodaysAppointments: mockGetTodaysAppointments,
    getNoShowPatients: mockGetNoShowPatients,
    markAppointmentAsNoShow: mockMarkAppointmentAsNoShow,
    addNoShowNote: mockAddNoShowNote,
    getNoShowNotes: mockGetNoShowNotes,
    removeNoShowNote: mockRemoveNoShowNote,
    getAvailableTimeSlots: mockGetAvailableTimeSlots,
    rescheduleNoShowAppointment: mockRescheduleNoShowAppointment,
    getAllAppointments: mockGetAllAppointments,
    sendAppointmentReminder: mockSendAppointmentReminder,
    sendBulkAppointmentReminders: mockSendBulkAppointmentReminders,
    getUpcomingAppointments: mockGetUpcomingAppointments
}));

// Mock middleware
jest.unstable_mockModule('../middleware/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com', role: 'urology_nurse' };
        next();
    },
    requireRole: (roles) => (req, res, next) => {
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Forbidden' });
        }
    }
}));

jest.unstable_mockModule('../middleware/rateLimiter.js', () => ({
    generalLimiter: (req, res, next) => next()
}));

jest.unstable_mockModule('../middleware/sanitizer.js', () => ({
    xssProtection: (req, res, next) => next()
}));

const bookingRouter = (await import('../routes/booking.js')).default;

describe('Booking Routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/booking', bookingRouter);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/booking/appointments/upcoming', () => {
        it('should call getUpcomingAppointments controller', async () => {
            mockGetUpcomingAppointments.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            const response = await request(app)
                .get('/api/booking/appointments/upcoming')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(mockGetUpcomingAppointments).toHaveBeenCalled();
        });

        it('should log route hit', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            mockGetUpcomingAppointments.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app)
                .get('/api/booking/appointments/upcoming')
                .set('Authorization', 'Bearer test-token');

            expect(consoleSpy).toHaveBeenCalledWith('🔍 Route hit: /appointments/upcoming');
            consoleSpy.mockRestore();
        });
    });

    describe('POST /api/booking/patients/:patientId/appointments', () => {
        it('should call bookUrologistAppointment controller', async () => {
            mockBookUrologistAppointment.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/booking/patients/1/appointments')
                .send({
                    doctor_id: 1,
                    appointment_date: '2024-01-15',
                    time_slot: '09:00'
                });

            expect(mockBookUrologistAppointment).toHaveBeenCalled();
        });
    });

    describe('POST /api/booking/patients/:patientId/investigations', () => {
        it('should call bookInvestigation controller', async () => {
            mockBookInvestigation.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/booking/patients/1/investigations')
                .send({
                    investigation_type: 'MRI',
                    scheduled_date: '2024-01-20'
                });

            expect(mockBookInvestigation).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/patients/:patientId/appointments', () => {
        it('should call getPatientAppointments controller', async () => {
            mockGetPatientAppointments.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/patients/1/appointments');

            expect(mockGetPatientAppointments).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/patients/:patientId/investigation-bookings', () => {
        it('should call getPatientInvestigationBookings controller', async () => {
            mockGetPatientInvestigationBookings.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/patients/1/investigation-bookings');

            expect(mockGetPatientInvestigationBookings).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/urologists', () => {
        it('should call getAvailableUrologists controller', async () => {
            mockGetAvailableUrologists.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/urologists');

            expect(mockGetAvailableUrologists).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/doctors', () => {
        it('should call getAvailableDoctors controller', async () => {
            mockGetAvailableDoctors.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/doctors');

            expect(mockGetAvailableDoctors).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/appointments/today', () => {
        it('should call getTodaysAppointments controller', async () => {
            mockGetTodaysAppointments.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/appointments/today');

            expect(mockGetTodaysAppointments).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/no-show-patients', () => {
        it('should call getNoShowPatients controller', async () => {
            mockGetNoShowPatients.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/no-show-patients');

            expect(mockGetNoShowPatients).toHaveBeenCalled();
        });
    });

    describe('PUT /api/booking/appointments/:appointmentId/no-show', () => {
        it('should call markAppointmentAsNoShow controller', async () => {
            mockMarkAppointmentAsNoShow.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app).put('/api/booking/appointments/1/no-show');

            expect(mockMarkAppointmentAsNoShow).toHaveBeenCalled();
        });
    });

    describe('POST /api/booking/appointments/:appointmentId/notes', () => {
        it('should call addNoShowNote controller', async () => {
            mockAddNoShowNote.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/booking/appointments/1/notes')
                .send({ note: 'Patient contacted' });

            expect(mockAddNoShowNote).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/appointments/:appointmentId/notes', () => {
        it('should call getNoShowNotes controller', async () => {
            mockGetNoShowNotes.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/appointments/1/notes');

            expect(mockGetNoShowNotes).toHaveBeenCalled();
        });
    });

    describe('DELETE /api/booking/notes/:noteId', () => {
        it('should call removeNoShowNote controller', async () => {
            mockRemoveNoShowNote.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app).delete('/api/booking/notes/1');

            expect(mockRemoveNoShowNote).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/doctors/:doctorId/available-slots', () => {
        it('should call getAvailableTimeSlots controller', async () => {
            mockGetAvailableTimeSlots.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/doctors/1/available-slots');

            expect(mockGetAvailableTimeSlots).toHaveBeenCalled();
        });
    });

    describe('PUT /api/booking/appointments/:appointmentId/reschedule', () => {
        it('should call rescheduleNoShowAppointment controller', async () => {
            mockRescheduleNoShowAppointment.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .put('/api/booking/appointments/1/reschedule')
                .send({
                    new_date: '2024-01-20',
                    new_time: '10:00'
                });

            expect(mockRescheduleNoShowAppointment).toHaveBeenCalled();
        });
    });

    describe('GET /api/booking/appointments', () => {
        it('should call getAllAppointments controller', async () => {
            mockGetAllAppointments.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/booking/appointments');

            expect(mockGetAllAppointments).toHaveBeenCalled();
        });
    });

    describe('POST /api/booking/appointments/send-reminder', () => {
        it('should call sendAppointmentReminder controller', async () => {
            mockSendAppointmentReminder.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/booking/appointments/send-reminder')
                .send({ appointment_id: 1 });

            expect(mockSendAppointmentReminder).toHaveBeenCalled();
        });
    });

    describe('POST /api/booking/appointments/send-bulk-reminders', () => {
        it('should call sendBulkAppointmentReminders controller', async () => {
            mockSendBulkAppointmentReminders.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/booking/appointments/send-bulk-reminders')
                .send({ appointment_ids: [1, 2, 3] });

            expect(mockSendBulkAppointmentReminders).toHaveBeenCalled();
        });
    });
});
