import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import NoShowPatientModal from '../NoShowPatientModal';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    getNoShowNotes: vi.fn(),
    addNoShowNote: vi.fn(),
    deleteNoShowNote: vi.fn(),
    rescheduleNoShowAppointment: vi.fn(),
    updateAppointmentStatus: vi.fn()
}));

vi.mock('../../services/bookingService', () => ({
    bookingService: {
        getNoShowNotes: mocks.getNoShowNotes,
        addNoShowNote: mocks.addNoShowNote,
        deleteNoShowNote: mocks.deleteNoShowNote,
        rescheduleNoShowAppointment: mocks.rescheduleNoShowAppointment,
        updateAppointmentStatus: mocks.updateAppointmentStatus
    }
}));

// Mock react-icons
vi.mock('react-icons/fi', () => ({
    FiX: () => <span data-testid="x-icon" />,
    FiCalendar: () => <span data-testid="calendar-icon" />,
    FiClock: () => <span data-testid="clock-icon" />,
    FiUser: () => <span data-testid="user-icon" />,
    FiPhone: () => <span data-testid="phone-icon" />,
    FiMail: () => <span data-testid="mail-icon" />,
    FiAlertCircle: () => <span data-testid="alert-icon" />,
    FiCheck: () => <span data-testid="check-icon" />,
    FiPlus: () => <span data-testid="plus-icon" />,
    FiEdit3: () => <span data-testid="edit-icon" />,
    FiRefreshCw: () => <span data-testid="refresh-icon" />,
    FiMessageSquare: () => <span data-testid="message-icon" />,
    FiPhoneCall: () => <span data-testid="phonecall-icon" />,
    FiTime: () => <span data-testid="time-icon" />,
    FiTrash2: () => <span data-testid="trash-icon" />,
    FiUserX: () => <span data-testid="userx-icon" />
}));

// Mock useEscapeKey
vi.mock('../../utils/useEscapeKey', () => ({
    useEscapeKey: vi.fn()
}));

// Mock child components
vi.mock('../RescheduleConfirmationModal', () => ({
    default: ({ isOpen, onClose, onConfirm }) => (
        isOpen ? (
            <div data-testid="reschedule-modal">
                <button onClick={() => onConfirm({ date: '2024-02-01', time: '10:00' })} data-testid="reschedule-confirm">Confirm</button>
                <button onClick={onClose} data-testid="reschedule-close">Close</button>
            </div>
        ) : null
    )
}));

vi.mock('../ConfirmModal', () => ({
    default: ({ isOpen, onClose, onConfirm, title }) => (
        isOpen ? (
            <div data-testid="confirm-modal">
                <span data-testid="confirm-title">{title}</span>
                <button onClick={onConfirm} data-testid="confirm-button">Confirm</button>
                <button onClick={onClose} data-testid="cancel-button">Cancel</button>
            </div>
        ) : null
    )
}));

describe('NoShowPatientModal Component', () => {
    const mockPatient = {
        id: 1,
        name: 'John Doe',
        phone: '555-1234',
        email: 'john@test.com',
        appointmentDate: '2024-01-15',
        appointmentTime: '10:00'
    };

    const mockOnClose = vi.fn();
    const mockOnReschedule = vi.fn();
    const mockOnAddTimelineEntry = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // Default successful response
        mocks.getNoShowNotes.mockResolvedValue({
            success: true,
            data: { notes: [] }
        });
    });

    describe('Rendering', () => {
        it('should not render when isOpen is false', () => {
            const { container } = render(
                <NoShowPatientModal
                    isOpen={false}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            expect(container.firstChild).toBeNull();
        });

        it('should render when isOpen is true', () => {
            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            expect(screen.getByText('No-Show Patient Details')).toBeInTheDocument();
        });

        it('should display patient information', () => {
            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });
    });

    describe('Loading Timeline Entries', () => {
        it('should load notes on open', async () => {
            mocks.getNoShowNotes.mockResolvedValue({
                success: true,
                data: {
                    notes: [
                        { id: 1, content: 'Called patient', created_at: new Date().toISOString() }
                    ]
                }
            });

            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            await waitFor(() => {
                expect(mocks.getNoShowNotes).toHaveBeenCalledWith(1, 'urologist');
            });
        });

        it('should handle loading notes error', async () => {
            mocks.getNoShowNotes.mockResolvedValue({
                success: false,
                error: 'Failed to load notes'
            });

            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            await waitFor(() => {
                expect(mocks.getNoShowNotes).toHaveBeenCalled();
            });
        });
    });

    describe('Adding Notes', () => {
        it('should add a new note', async () => {
            mocks.addNoShowNote.mockResolvedValue({
                success: true,
                data: { note: { id: 1, content: 'New note' } }
            });

            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                    onAddTimelineEntry={mockOnAddTimelineEntry}
                />
            );

            // Find textarea and type note
            const textarea = screen.getByPlaceholderText(/Add details about follow-up/i);
            fireEvent.change(textarea, { target: { value: 'New note' } });

            // Click add button
            const addButton = screen.getByRole('button', { name: /add note/i });

            await act(async () => {
                fireEvent.click(addButton);
            });

            await waitFor(() => {
                expect(mocks.addNoShowNote).toHaveBeenCalledWith(1, {
                    noteContent: 'New note',
                    type: 'urologist'
                });
            });
        });

        it('should not add empty note', async () => {
            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            // Find textarea and type empty note
            const textarea = screen.getByPlaceholderText(/Add details about follow-up/i);
            fireEvent.change(textarea, { target: { value: '   ' } });

            // Click add button
            const addButton = screen.getByRole('button', { name: /add note/i });
            fireEvent.click(addButton);

            expect(mocks.addNoShowNote).not.toHaveBeenCalled();
        });

        it('should handle add note error', async () => {
            mocks.addNoShowNote.mockResolvedValue({
                success: false,
                error: 'Failed to add note'
            });

            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            const textarea = screen.getByPlaceholderText(/Add details about follow-up/i);
            fireEvent.change(textarea, { target: { value: 'New note' } });

            const addButton = screen.getByRole('button', { name: /add note/i });

            await act(async () => {
                fireEvent.click(addButton);
            });

            await waitFor(() => {
                expect(mocks.addNoShowNote).toHaveBeenCalled();
            });
        });
    });

    describe('Close Functionality', () => {
        it('should call onClose when close button is clicked', () => {
            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            const closeButton = screen.getByRole('button', { name: /close/i });
            fireEvent.click(closeButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe('Reschedule Functionality', () => {
        it('should open reschedule modal when reschedule button is clicked', () => {
            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                    onReschedule={mockOnReschedule}
                />
            );

            const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
            fireEvent.click(rescheduleButton);

            expect(screen.getByTestId('reschedule-modal')).toBeInTheDocument();
        });
    });

    describe('Timeline Notes Display', () => {
        it('should display notes when loaded', async () => {
            const noteContent = 'This is a test note';
            mocks.getNoShowNotes.mockResolvedValue({
                success: true,
                data: {
                    notes: [
                        {
                            id: 1,
                            note_content: noteContent,
                            created_at: new Date().toISOString(),
                            author_name: 'Test User',
                            author_role: 'urologist'
                        }
                    ]
                }
            });

            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            await waitFor(() => {
                expect(screen.getByText(noteContent)).toBeInTheDocument();
            });
        });

        it('should show empty state when no notes', async () => {
            mocks.getNoShowNotes.mockResolvedValue({
                success: true,
                data: { notes: [] }
            });

            render(
                <NoShowPatientModal
                    isOpen={true}
                    onClose={mockOnClose}
                    patient={mockPatient}
                    appointmentId={1}
                    appointmentType="urologist"
                />
            );

            await waitFor(() => {
                expect(mocks.getNoShowNotes).toHaveBeenCalled();
            });

            // Should show empty state message
            expect(screen.getByText('No notes yet')).toBeInTheDocument();
        });
    });
});
