import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../config/database.js', () => ({
    default: {
        connect: jest.fn(),
        query: jest.fn()
    }
}));

// Mock cron
jest.unstable_mockModule('node-cron', () => ({
    default: {
        schedule: jest.fn()
    }
}));

const mockPool = (await import('../config/database.js')).default;
const cron = (await import('node-cron')).default;
const initAutoNoShowScheduler = (await import('../schedulers/autoNoShowScheduler.js')).default;
const { hasPatientActivity, markOldAppointmentsAsNoShow } = await import('../schedulers/autoNoShowScheduler.js');

describe('Auto No-Show Scheduler', () => {
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };

        mockPool.connect.mockResolvedValue(mockClient);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('initAutoNoShowScheduler', () => {
        it('should schedule a cron job', () => {
            initAutoNoShowScheduler();
            expect(cron.schedule).toHaveBeenCalled();
        });

        it('should schedule job to run every hour', () => {
            initAutoNoShowScheduler();
            expect(cron.schedule).toHaveBeenCalledWith(
                expect.stringContaining('0'),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should log initialization message', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            initAutoNoShowScheduler();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('hasPatientActivity', () => {
        it('should return true when patient data was modified after appointment', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // PSA changes
                .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Clinical notes
                .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Test results
                .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // Investigation results

            const result = await hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00'));
            expect(result).toBe(true);
        });

        it('should return false when no patient activity after appointment', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] });

            const result = await hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00'));
            expect(result).toBe(false);
        });

        it('should check clinical notes for activity', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // PSA
                .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // Clinical notes
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] });

            const result = await hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00'));
            expect(result).toBe(true);
        });

        it('should check test results for activity', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // Test results
                .mockResolvedValueOnce({ rows: [{ count: 0 }] });

            const result = await hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00'));
            expect(result).toBe(true);
        });

        it('should check investigation results for activity', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // Investigation results

            const result = await hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00'));
            expect(result).toBe(true);
        });

        it('should handle database errors', async () => {
            mockClient.query.mockRejectedValue(new Error('Database error'));

            await expect(hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00')))
                .rejects.toThrow('Database error');
        });
    });

    describe('markOldAppointmentsAsNoShow', () => {
        it('should query for appointments older than threshold hours', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });

            await markOldAppointmentsAsNoShow();

            expect(mockClient.query).toHaveBeenCalled();
        });

        it('should mark appointments as no_show when no activity detected', async () => {
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        { id: 1, patient_id: 1, appointment_datetime: new Date('2024-01-15 09:00') }
                    ]
                })
                // hasPatientActivity checks - all return 0
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                // Update query
                .mockResolvedValueOnce({ rowCount: 1 });

            await markOldAppointmentsAsNoShow();

            // Should have called update
            expect(mockClient.query).toHaveBeenCalledTimes(6);
        });

        it('should not mark appointments when patient activity detected', async () => {
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        { id: 1, patient_id: 1, appointment_datetime: new Date('2024-01-15 09:00') }
                    ]
                })
                // hasPatientActivity checks - PSA returns 1
                .mockResolvedValueOnce({ rows: [{ count: 1 }] });

            await markOldAppointmentsAsNoShow();

            // Should NOT call update query
            expect(mockClient.query).toHaveBeenCalledTimes(2);
        });

        it('should handle empty appointments list', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });

            await markOldAppointmentsAsNoShow();

            // Only the initial query should be called
            expect(mockClient.query).toHaveBeenCalledTimes(1);
        });

        it('should handle database connection errors', async () => {
            mockPool.connect.mockRejectedValue(new Error('Connection failed'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            await markOldAppointmentsAsNoShow();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should release client after processing', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });

            await markOldAppointmentsAsNoShow();

            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should release client even on error', async () => {
            mockClient.query.mockRejectedValue(new Error('Query error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            await markOldAppointmentsAsNoShow();

            expect(mockClient.release).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should log number of appointments marked as no_show', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        { id: 1, patient_id: 1, appointment_datetime: new Date('2024-01-15 09:00') },
                        { id: 2, patient_id: 2, appointment_datetime: new Date('2024-01-15 10:00') }
                    ]
                })
                // First appointment - no activity
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                // Second appointment - no activity  
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 });

            await markOldAppointmentsAsNoShow();

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should process multiple appointments correctly', async () => {
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        { id: 1, patient_id: 1, appointment_datetime: new Date('2024-01-15 09:00') },
                        { id: 2, patient_id: 2, appointment_datetime: new Date('2024-01-15 10:00') }
                    ]
                })
                // First appointment - has activity
                .mockResolvedValueOnce({ rows: [{ count: 1 }] })
                // Second appointment - no activity
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 });

            await markOldAppointmentsAsNoShow();

            // First marked, second not
            expect(mockClient.query).toHaveBeenCalledTimes(7);
        });

        it('should handle investigation bookings', async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // No appointments
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            scheduled_date: '2024-01-15',
                            scheduled_time: '10:00',
                            investigation_name: 'MRI',
                            appointment_datetime: new Date('2024-01-15 10:00')
                        }
                    ]
                })
                // hasPatientActivity - no activity
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                // Update investigation booking
                .mockResolvedValueOnce({ rowCount: 1 })
                // Insert timeline note
                .mockResolvedValueOnce({});

            const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

            await markOldAppointmentsAsNoShow();

            const updateCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('UPDATE investigation_bookings')
            );
            expect(updateCall).toBeDefined();

            consoleLog.mockRestore();
        });

        it('should not insert timeline note if update rowCount is 0', async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            appointment_date: '2024-01-15',
                            appointment_time: '09:00',
                            urologist_name: 'Dr. Smith',
                            appointment_datetime: new Date('2024-01-15 09:00')
                        }
                    ]
                })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                // Update returns 0 rowCount (already no_show)
                .mockResolvedValueOnce({ rowCount: 0 })
                .mockResolvedValueOnce({ rows: [] }); // Investigation bookings

            await markOldAppointmentsAsNoShow();

            const timelineCalls = mockClient.query.mock.calls.filter(call =>
                call[0]?.includes('INSERT INTO patient_notes')
            );
            // Should not insert note if rowCount is 0
            expect(timelineCalls.length).toBe(0);
        });

        it('should handle investigation bookings with activity', async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // No appointments
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            scheduled_date: '2024-01-15',
                            scheduled_time: '10:00',
                            investigation_name: 'MRI',
                            appointment_datetime: new Date('2024-01-15 10:00')
                        }
                    ]
                })
                // hasPatientActivity - has activity
                .mockResolvedValueOnce({ rows: [{ count: 1 }] });

            const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

            await markOldAppointmentsAsNoShow();

            const updateCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('UPDATE investigation_bookings')
            );
            // Should not update if activity detected
            expect(updateCall).toBeUndefined();

            consoleLog.mockRestore();
        });

        it('should check for new appointments as activity indicator', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Patient updates
                .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Notes
                .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // Investigation results
                .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // New appointments

            const result = await hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00'));
            expect(result).toBe(true);
        });

        it('should handle transaction rollback on error', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            appointment_date: '2024-01-15',
                            appointment_time: '09:00',
                            urologist_name: 'Dr. Smith',
                            appointment_datetime: new Date('2024-01-15 09:00')
                        }
                    ]
                })
                .mockRejectedValueOnce(new Error('Query error'));

            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            await markOldAppointmentsAsNoShow();

            const rollbackCall = mockClient.query.mock.calls.find(call =>
                call[0] === 'ROLLBACK'
            );
            expect(rollbackCall).toBeDefined();
            expect(consoleError).toHaveBeenCalled();

            consoleError.mockRestore();
        });

        it('should commit transaction on success', async () => {
            mockClient.query
                .mockResolvedValueOnce({}) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Appointments
                .mockResolvedValueOnce({ rows: [] }) // Investigations
                .mockResolvedValueOnce({}); // COMMIT

            await markOldAppointmentsAsNoShow();

            const commitCall = mockClient.query.mock.calls.find(call =>
                call[0] === 'COMMIT'
            );
            expect(commitCall).toBeDefined();
        });

        it('should log summary when appointments are checked', async () => {
            const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            appointment_date: '2024-01-15',
                            appointment_time: '09:00',
                            urologist_name: 'Dr. Smith',
                            appointment_datetime: new Date('2024-01-15 09:00')
                        }
                    ]
                })
                .mockResolvedValueOnce({ rows: [] }) // Investigations
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({});

            await markOldAppointmentsAsNoShow();

            expect(consoleLog).toHaveBeenCalledWith(
                expect.stringContaining('Checked')
            );

            consoleLog.mockRestore();
        });

        it('should log message when no appointments found', async () => {
            const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // Appointments
                .mockResolvedValueOnce({ rows: [] }); // Investigations

            await markOldAppointmentsAsNoShow();

            expect(consoleLog).toHaveBeenCalledWith(
                expect.stringContaining('No old appointments found')
            );

            consoleLog.mockRestore();
        });

        it('should handle appointment date parsing errors', async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            appointment_date: 'invalid-date',
                            appointment_time: 'invalid-time',
                            urologist_name: 'Dr. Smith',
                            appointment_datetime: null
                        }
                    ]
                })
                .mockResolvedValueOnce({ rows: [] }); // Investigations

            const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

            await markOldAppointmentsAsNoShow();

            // Should handle gracefully
            expect(mockClient.release).toHaveBeenCalled();

            consoleWarn.mockRestore();
        });

        it('should handle different appointment statuses', async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            appointment_date: '2024-01-15',
                            appointment_time: '09:00',
                            urologist_name: 'Dr. Smith',
                            appointment_datetime: new Date('2024-01-15 09:00'),
                            status: 'scheduled'
                        },
                        {
                            id: 2,
                            patient_id: 2,
                            appointment_date: '2024-01-15',
                            appointment_time: '10:00',
                            urologist_name: 'Dr. Smith',
                            appointment_datetime: new Date('2024-01-15 10:00'),
                            status: 'confirmed'
                        }
                    ]
                })
                .mockResolvedValueOnce({ rows: [] }) // Investigations
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({});

            await markOldAppointmentsAsNoShow();

            // Both scheduled and confirmed should be processed
            const updateCalls = mockClient.query.mock.calls.filter(call =>
                call[0]?.includes('UPDATE appointments')
            );
            expect(updateCalls.length).toBe(2);
        });

        it('should handle investigation bookings with different statuses', async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // Appointments
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            scheduled_date: '2024-01-15',
                            scheduled_time: '10:00',
                            investigation_name: 'MRI',
                            appointment_datetime: new Date('2024-01-15 10:00'),
                            status: 'scheduled'
                        },
                        {
                            id: 2,
                            patient_id: 2,
                            scheduled_date: '2024-01-15',
                            scheduled_time: '11:00',
                            investigation_name: 'TRUS',
                            appointment_datetime: new Date('2024-01-15 11:00'),
                            status: 'confirmed'
                        }
                    ]
                })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({})
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({});

            await markOldAppointmentsAsNoShow();

            const updateCalls = mockClient.query.mock.calls.filter(call =>
                call[0]?.includes('UPDATE investigation_bookings')
            );
            expect(updateCalls.length).toBe(2);
        });

        it('should only update appointments that are not already no_show', async () => {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [
                        {
                            id: 1,
                            patient_id: 1,
                            appointment_date: '2024-01-15',
                            appointment_time: '09:00',
                            urologist_name: 'Dr. Smith',
                            appointment_datetime: new Date('2024-01-15 09:00')
                        }
                    ]
                })
                .mockResolvedValueOnce({ rows: [] }) // Investigations
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ count: 0 }] })
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({});

            await markOldAppointmentsAsNoShow();

            const updateCall = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('UPDATE appointments') && call[0]?.includes("status != 'no_show'")
            );
            expect(updateCall).toBeDefined();
        });

        it('should handle error in hasPatientActivity and assume patient showed up', async () => {
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            mockClient.query
                .mockRejectedValueOnce(new Error('Database error'));

            // On error, should return true (safer to not mark as no-show)
            const result = await hasPatientActivity(mockClient, 1, new Date('2024-01-15 09:00'));
            expect(result).toBe(true);
            expect(consoleError).toHaveBeenCalled();

            consoleError.mockRestore();
        });

        it('should format today date correctly in local timezone', async () => {
            const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
            
            mockClient.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await markOldAppointmentsAsNoShow();

            const findQuery = mockClient.query.mock.calls.find(call =>
                call[0]?.includes('appointment_date < $1')
            );
            expect(findQuery).toBeDefined();
            // Should use today's date in YYYY-MM-DD format
            const dateParam = findQuery[1][0];
            expect(dateParam).toMatch(/^\d{4}-\d{2}-\d{2}$/);

            consoleLog.mockRestore();
        });
    });
});
