import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MissedAppointmentsList from '../MissedAppointmentsList';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    sendAppointmentReminder: vi.fn(),
    sendBulkReminders: vi.fn(),
    getPatientById: vi.fn()
}));

vi.mock('../../services/emailService', () => ({
    default: {
        sendAppointmentReminder: mocks.sendAppointmentReminder,
        sendBulkReminders: mocks.sendBulkReminders
    }
}));

vi.mock('../../services/patientService', () => ({
    default: {
        getPatientById: mocks.getPatientById
    }
}));

// Mock react-icons
vi.mock('react-icons/fi', () => ({
    FiMail: () => <span data-testid="mail-icon" />,
    FiCalendar: () => <span data-testid="calendar-icon" />,
    FiClock: () => <span data-testid="clock-icon" />,
    FiUser: () => <span data-testid="user-icon" />,
    FiAlertCircle: () => <span data-testid="alert-icon" />,
    FiCheckCircle: () => <span data-testid="check-icon" />
}));

// Mock child components
vi.mock('../SendReminderModal', () => ({
    default: ({ isOpen, onClose, onSend, appointment }) => (
        isOpen ? (
            <div data-testid="reminder-modal">
                <span data-testid="modal-patient">{appointment?.patientName}</span>
                <button onClick={() => onSend(appointment?.id, 'Test message')} data-testid="send-button">Send</button>
                <button onClick={onClose} data-testid="modal-close">Close</button>
            </div>
        ) : null
    )
}));

vi.mock('../SuccessErrorModal', () => ({
    default: ({ isOpen, message, type, onClose }) => (
        isOpen ? (
            <div data-testid="message-modal">
                <span data-testid="message-type">{type}</span>
                <span data-testid="message-content">{message}</span>
                <button onClick={onClose} data-testid="message-close">Close</button>
            </div>
        ) : null
    )
}));

describe('MissedAppointmentsList Component', () => {
    const mockMissedAppointments = [
        {
            id: 1,
            patientName: 'John Doe',
            patient_id: 101,
            missedDate: '2024-01-15',
            time: '10:00',
            email: 'john@test.com',
            reminderSent: false
        },
        {
            id: 2,
            patientName: 'Jane Smith',
            patient_id: 102,
            missedDate: '2024-01-16',
            time: '14:30',
            email: 'jane@test.com',
            reminderSent: true
        },
        {
            id: 3,
            patientName: 'Bob Wilson',
            patient_id: 103,
            missedDate: '2024-01-17',
            time: '09:15',
            reminderSent: false
        }
    ];

    const mockOnTogglePatients = vi.fn();
    const mockOnRefresh = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('Rendering', () => {
        it('should render empty state when no appointments', () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={[]}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            // Should show empty state message
            expect(screen.getByText('No missed appointments')).toBeInTheDocument();
        });

        it('should render header with appointment count', () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            expect(screen.getByText('Missed Appointments')).toBeInTheDocument();
        });

        it('should render patient names in appointments list', () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            // John and Bob have reminderSent: false, should appear
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        });

        it('should show reminder sent indicator for sent reminders', () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            // Jane Smith has reminderSent: true
            expect(screen.getByText('Reminder Sent')).toBeInTheDocument();
        });
    });

    describe('Time Formatting', () => {
        it('should format 24-hour time to 12-hour format', () => {
            const appointments = [
                { id: 1, patientName: 'Test', missedDate: '2024-01-15', time: '14:30' }
            ];

            render(
                <MissedAppointmentsList
                    missedAppointments={appointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            expect(screen.getByText('2:30 PM')).toBeInTheDocument();
        });

        it('should handle morning times', () => {
            const appointments = [
                { id: 1, patientName: 'Test', missedDate: '2024-01-15', time: '09:00' }
            ];

            render(
                <MissedAppointmentsList
                    missedAppointments={appointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            expect(screen.getByText('9:00 AM')).toBeInTheDocument();
        });

        it('should handle noon time', () => {
            const appointments = [
                { id: 1, patientName: 'Test', missedDate: '2024-01-15', time: '12:00' }
            ];

            render(
                <MissedAppointmentsList
                    missedAppointments={appointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            expect(screen.getByText('12:00 PM')).toBeInTheDocument();
        });

        it('should handle midnight time', () => {
            const appointments = [
                { id: 1, patientName: 'Test', missedDate: '2024-01-15', time: '00:30' }
            ];

            render(
                <MissedAppointmentsList
                    missedAppointments={appointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            expect(screen.getByText('12:30 AM')).toBeInTheDocument();
        });
    });

    describe('Appointment Selection', () => {
        it('should toggle individual appointment selection', () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            // First checkbox after "select all" is John Doe
            fireEvent.click(checkboxes[1]);

            expect(checkboxes[1]).toBeChecked();
        });

        it('should show selected count when appointments are selected', () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');
            // Select first individual appointment
            fireEvent.click(checkboxes[1]);

            // Should show selected count
            expect(screen.getByText('1 selected')).toBeInTheDocument();
        });

        it('should deselect all when all are selected', () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            const checkboxes = screen.getAllByRole('checkbox');

            // Select all
            fireEvent.click(checkboxes[0]);

            // Deselect all
            fireEvent.click(checkboxes[0]);

            // All should be unchecked
            checkboxes.forEach(checkbox => {
                expect(checkbox).not.toBeChecked();
            });
        });
    });

    describe('Send Reminder Modal', () => {
        it('should open reminder modal when clicking send reminder button', async () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            // Find and click send reminder button (buttons that contain "Send Reminder" text)
            const sendButtons = screen.getAllByRole('button', { name: /send reminder/i });
            fireEvent.click(sendButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('reminder-modal')).toBeInTheDocument();
            });
        });

        it('should fetch patient email when not available', async () => {
            mocks.getPatientById.mockResolvedValue({
                success: true,
                data: { email: 'bob@test.com' }
            });

            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onTogglePatients={mockOnTogglePatients}
                />
            );

            // Bob Wilson (id: 3) doesn't have email - find his button
            const sendButtons = screen.getAllByRole('button', { name: /send reminder/i });
            // Bob is 3rd patient but only has 2 buttons since Jane has reminderSent: true
            fireEvent.click(sendButtons[1]); // This should be Bob

            await waitFor(() => {
                expect(mocks.getPatientById).toHaveBeenCalledWith(103);
            });
        });
    });

    describe('Sending Reminders', () => {
        it('should send single reminder successfully', async () => {
            mocks.sendAppointmentReminder.mockResolvedValue({
                success: true
            });

            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                    onRefresh={mockOnRefresh}
                />
            );

            // Open modal
            const sendButtons = screen.getAllByRole('button', { name: /send reminder/i });
            fireEvent.click(sendButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('reminder-modal')).toBeInTheDocument();
            });

            // Send reminder
            fireEvent.click(screen.getByTestId('send-button'));

            await waitFor(() => {
                expect(mocks.sendAppointmentReminder).toHaveBeenCalled();
            });

            // Success modal should appear
            await waitFor(() => {
                expect(screen.getByTestId('message-modal')).toBeInTheDocument();
                expect(screen.getByTestId('message-type')).toHaveTextContent('success');
            });
        });

        it('should show error when reminder fails', async () => {
            mocks.sendAppointmentReminder.mockResolvedValue({
                success: false,
                error: 'Email service unavailable'
            });

            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                />
            );

            // Open modal
            const sendButtons = screen.getAllByRole('button', { name: /send reminder/i });
            fireEvent.click(sendButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('reminder-modal')).toBeInTheDocument();
            });

            // Send reminder
            fireEvent.click(screen.getByTestId('send-button'));

            await waitFor(() => {
                expect(screen.getByTestId('message-modal')).toBeInTheDocument();
                expect(screen.getByTestId('message-type')).toHaveTextContent('error');
            });
        });

        it('should handle send reminder exception', async () => {
            mocks.sendAppointmentReminder.mockRejectedValue(new Error('Network error'));

            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                />
            );

            // Open modal
            const sendButtons = screen.getAllByRole('button', { name: /send reminder/i });
            fireEvent.click(sendButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('reminder-modal')).toBeInTheDocument();
            });

            // Send reminder
            fireEvent.click(screen.getByTestId('send-button'));

            await waitFor(() => {
                expect(screen.getByTestId('message-modal')).toBeInTheDocument();
                expect(screen.getByTestId('message-type')).toHaveTextContent('error');
            });
        });
    });

    describe('Bulk Reminders', () => {
        it('should show send reminders button when appointments selected', async () => {
            render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                />
            );

            // Select first appointment
            const checkboxes = screen.getAllByRole('checkbox');
            fireEvent.click(checkboxes[1]);

            // Send Reminders button should appear
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /send reminders/i })).toBeInTheDocument();
            });
        });
    });

    describe('Props Updates', () => {
        it('should update local appointments when prop changes', () => {
            const { rerender } = render(
                <MissedAppointmentsList
                    missedAppointments={mockMissedAppointments}
                />
            );

            expect(screen.getByText('John Doe')).toBeInTheDocument();

            const newAppointments = [
                { id: 4, patientName: 'New Patient', missedDate: '2024-01-18', time: '11:00' }
            ];

            rerender(
                <MissedAppointmentsList
                    missedAppointments={newAppointments}
                />
            );

            expect(screen.getByText('New Patient')).toBeInTheDocument();
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        });
    });
});
