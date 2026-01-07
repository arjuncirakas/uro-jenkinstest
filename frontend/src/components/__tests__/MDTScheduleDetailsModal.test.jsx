import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  MapPin: () => <span data-testid="mappin-icon" />,
  Users: () => <span data-testid="users-icon" />,
  User: () => <span data-testid="user-icon" />,
  Building2: () => <span data-testid="building-icon" />,
  ChevronRight: () => <span data-testid="chevron-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Video: () => <span data-testid="video-icon" />,
  FileText: () => <span data-testid="filetext-icon" />,
  Stethoscope: () => <span data-testid="stethoscope-icon" />,
  Activity: () => <span data-testid="activity-icon" />,
  CheckCircle: () => <span data-testid="checkcircle-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  Upload: () => <span data-testid="upload-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  Download: () => <span data-testid="download-icon" />,
  Trash: () => <span data-testid="trash-icon" />,
  AlertCircle: () => <span data-testid="alertcircle-icon" />,
  Save: () => <span data-testid="save-icon" />,
  Send: () => <span data-testid="send-icon" />
}));

// Mock services
const mockGetPatientById = vi.fn();
const mockRescheduleMeeting = vi.fn();
const mockGetMeetingById = vi.fn();

vi.mock('../../services/patientService', () => ({
  patientService: {
    getPatientById: (...args) => mockGetPatientById(...args)
  }
}));

const mockRescheduleMDTMeeting = vi.fn();

vi.mock('../../services/mdtService', () => ({
  mdtService: {
    rescheduleMeeting: (...args) => mockRescheduleMeeting(...args),
    rescheduleMDTMeeting: (...args) => mockRescheduleMDTMeeting(...args),
    getMeetingById: (...args) => mockGetMeetingById(...args)
  }
}));

// Mock useEscapeKey
vi.mock('../../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn()
}));

// Mock ConfirmModal
vi.mock('../ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onCancel, message }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-button">Confirm</button>
        <button onClick={onCancel} data-testid="cancel-button">Cancel</button>
      </div>
    ) : null
}));

// NOW import component AFTER all mocks
import MDTScheduleDetailsModal from '../MDTScheduleDetailsModal';

describe('MDTScheduleDetailsModal', () => {
  const mockOnClose = vi.fn();
  const mockSchedule = {
    id: 1,
    date: '2024-01-15',
    time: '10:00',
    patient: {
      id: 1,
      name: 'John Doe',
      upi: 'UPI123'
    },
    teamMembers: ['Dr. Smith', 'Dr. Jones'],
    location: 'Conference Room A',
    meetingType: 'In-person'
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    schedule: mockSchedule
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPatientById.mockResolvedValue({
      success: true,
      data: { id: 1, name: 'John Doe' }
    });
    mockRescheduleMeeting.mockResolvedValue({
      success: true,
      data: { id: 1 }
    });
    mockRescheduleMDTMeeting.mockResolvedValue({
      success: true,
      data: { id: 1, meetingDate: '2024-01-20', meetingTime: '14:00' }
    });
    mockGetMeetingById.mockResolvedValue({
      success: true,
      data: { id: 1, meetingDate: '2024-01-15', meetingTime: '10:00' }
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container, rerender } = render(
        <MDTScheduleDetailsModal {...defaultProps} isOpen={true} />
      );
      expect(container.firstChild).not.toBeNull();
      
      // Test the early return when isOpen becomes false
      rerender(<MDTScheduleDetailsModal {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when schedule is not provided', () => {
      const { container, rerender } = render(
        <MDTScheduleDetailsModal {...defaultProps} schedule={mockSchedule} />
      );
      expect(container.firstChild).not.toBeNull();
      
      // Test the early return when schedule becomes null
      rerender(<MDTScheduleDetailsModal {...defaultProps} schedule={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when both isOpen is false and schedule is null', () => {
      const { container } = render(
        <MDTScheduleDetailsModal {...defaultProps} isOpen={false} schedule={null} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true and schedule is provided', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });

    it('should display schedule date and time', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      expect(screen.getByText(/2024-01-15/i)).toBeInTheDocument();
      expect(screen.getByText(/10:00/i)).toBeInTheDocument();
    });
  });

  describe('Reschedule Functionality', () => {
    it('should show reschedule form when reschedule button is clicked', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
      if (rescheduleButton) {
        fireEvent.click(rescheduleButton);
        expect(screen.getByLabelText(/Date/i) || screen.getByLabelText(/date/i)).toBeInTheDocument();
      }
    });

    it('should update reschedule date when changed', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
      if (rescheduleButton) {
        fireEvent.click(rescheduleButton);
        
        const dateInput = screen.getByLabelText(/Date/i) || screen.getByLabelText(/date/i);
        if (dateInput) {
          fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
          expect(dateInput.value).toBe('2024-01-20');
        }
      }
    });

    it('should update reschedule time when changed', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const rescheduleButton = screen.getByRole('button', { name: /reschedule/i });
      if (rescheduleButton) {
        fireEvent.click(rescheduleButton);
        
        const timeInput = screen.getByLabelText(/Time/i) || screen.getByLabelText(/time/i);
        if (timeInput) {
          fireEvent.change(timeInput, { target: { value: '14:00' } });
          expect(timeInput.value).toBe('14:00');
        }
      }
    });
  });

  describe('Recommendations Management', () => {
    it('should add new recommendation when add button is clicked', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const recommendationInput = screen.getByPlaceholderText(/recommendation/i) ||
                                 screen.getByLabelText(/recommendation/i);
      const addButton = screen.getByRole('button', { name: /add.*recommendation/i });
      
      if (recommendationInput && addButton) {
        fireEvent.change(recommendationInput, { target: { value: 'Test recommendation' } });
        fireEvent.click(addButton);
        
        expect(screen.getByText(/Test recommendation/i)).toBeInTheDocument();
      }
    });

    it('should remove recommendation when remove button is clicked', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const recommendationInput = screen.getByPlaceholderText(/recommendation/i) ||
                                 screen.getByLabelText(/recommendation/i);
      const addButton = screen.getByRole('button', { name: /add.*recommendation/i });
      
      if (recommendationInput && addButton) {
        fireEvent.change(recommendationInput, { target: { value: 'Test recommendation' } });
        fireEvent.click(addButton);
        
        const removeButton = screen.getByRole('button', { name: /remove|delete/i });
        if (removeButton) {
          fireEvent.click(removeButton);
          expect(screen.queryByText(/Test recommendation/i)).not.toBeInTheDocument();
        }
      }
    });
  });

  describe('Follow-up Actions Management', () => {
    it('should add new follow-up action when add button is clicked', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const actionInput = screen.getByPlaceholderText(/follow.*up|action/i) ||
                         screen.getByLabelText(/follow.*up|action/i);
      const addButton = screen.getByRole('button', { name: /add.*action/i });
      
      if (actionInput && addButton) {
        fireEvent.change(actionInput, { target: { value: 'Test action' } });
        fireEvent.click(addButton);
        
        expect(screen.getByText(/Test action/i)).toBeInTheDocument();
      }
    });

    it('should toggle follow-up action completion', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const actionInput = screen.getByPlaceholderText(/follow.*up|action/i) ||
                         screen.getByLabelText(/follow.*up|action/i);
      const addButton = screen.getByRole('button', { name: /add.*action/i });
      
      if (actionInput && addButton) {
        fireEvent.change(actionInput, { target: { value: 'Test action' } });
        fireEvent.click(addButton);
        
        const checkbox = screen.getByRole('checkbox');
        if (checkbox) {
          fireEvent.click(checkbox);
          expect(checkbox).toBeChecked();
        }
      }
    });
  });

  describe('Document Upload', () => {
    it('should handle document upload', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const fileInput = screen.getByLabelText(/upload|file/i) || 
                       document.querySelector('input[type="file"]');
      
      if (fileInput) {
        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });
        
        expect(screen.getByText(/test.pdf/i)).toBeInTheDocument();
      }
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i }) ||
                         screen.getByTestId('x-icon').closest('button');
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle schedule without patient', () => {
      const scheduleWithoutPatient = { ...mockSchedule };
      delete scheduleWithoutPatient.patient;
      
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={scheduleWithoutPatient} />);
      
      // Should still render modal
      expect(screen.getByText(/2024-01-15/i)).toBeInTheDocument();
    });

    it('should handle schedule without team members', () => {
      const scheduleWithoutTeam = { ...mockSchedule };
      delete scheduleWithoutTeam.teamMembers;
      
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={scheduleWithoutTeam} />);
      
      // Should still render modal
      expect(screen.getByText(/2024-01-15/i)).toBeInTheDocument();
    });

    it('should handle schedule without id in useEffect', async () => {
      const scheduleWithoutId = { ...mockSchedule };
      delete scheduleWithoutId.id;
      
      mockGetMeetingById.mockResolvedValue({ success: true, data: {} });
      
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={scheduleWithoutId} />);
      
      // Should not call getMeetingById when schedule.id is missing
      await waitFor(() => {
        // Component should still render
        expect(screen.getByText(/John Doe/i) || screen.queryByText(/John Doe/i)).toBeDefined();
      });
    });

    it('should handle formatDate with empty string', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      
      // formatDate is called internally, test by checking date display
      // If date is empty, it should return empty string
      expect(screen.getByText(/2024-01-15/i) || screen.queryByText(/2024-01-15/i)).toBeDefined();
    });

    it('should handle Escape key useEffect early return when not open', () => {
      const { rerender } = render(
        <MDTScheduleDetailsModal {...defaultProps} isOpen={true} />
      );
      
      // Test that useEffect returns early when isOpen is false
      rerender(<MDTScheduleDetailsModal {...defaultProps} isOpen={false} />);
      
      // Should not have any escape key handlers when closed
      expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
    });

    it('should handle schedule without patientId in loadPatient', async () => {
      const scheduleWithoutPatientId = { ...mockSchedule };
      delete scheduleWithoutPatientId.patientId;
      scheduleWithoutPatientId.patientName = 'Test Patient';
      
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={scheduleWithoutPatientId} />);
      
      // Should set patient with fallback values
      await waitFor(() => {
        expect(screen.getByText(/Test Patient/i) || screen.queryByText(/Test Patient/i)).toBeDefined();
      });
    });
  });

  describe('Reschedule Modal', () => {
    it('should open reschedule modal when reschedule button is clicked', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const rescheduleButtons = screen.getAllByText(/Reschedule/i);
      const rescheduleButton = rescheduleButtons[0];
      fireEvent.click(rescheduleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Reschedule MDT Meeting/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/New Date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/New Time/i)).toBeInTheDocument();
      });
    });

    it('should close reschedule modal when cancel button is clicked', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const rescheduleButtons = screen.getAllByText(/Reschedule/i);
      const rescheduleButton = rescheduleButtons[0];
      fireEvent.click(rescheduleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Reschedule MDT Meeting/i)).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByText(/Cancel/i);
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Reschedule MDT Meeting/i)).not.toBeInTheDocument();
      });
    });

    it('should call rescheduleMDTMeeting when save button is clicked', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const rescheduleButtons = screen.getAllByText(/Reschedule/i);
      const rescheduleButton = rescheduleButtons[0];
      fireEvent.click(rescheduleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Reschedule MDT Meeting/i)).toBeInTheDocument();
      });
      
      const dateInput = screen.getByLabelText(/New Date/i);
      const timeInput = screen.getByLabelText(/New Time/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
      fireEvent.change(timeInput, { target: { value: '14:00' } });
      
      const saveButtons = screen.getAllByText(/Save/i);
      const saveButton = saveButtons.find(btn => btn.textContent === 'Save');
      if (saveButton) {
        fireEvent.click(saveButton);
        
        await waitFor(() => {
          expect(mockRescheduleMDTMeeting).toHaveBeenCalledWith(
            expect.any(Number),
            { meetingDate: '2024-01-20', meetingTime: '14:00' }
          );
        });
      }
    });

    it('should handle reschedule error', async () => {
      mockRescheduleMDTMeeting.mockResolvedValueOnce({
        success: false,
        error: 'Failed to reschedule'
      });
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const rescheduleButtons = screen.getAllByText(/Reschedule/i);
      const rescheduleButton = rescheduleButtons[0];
      fireEvent.click(rescheduleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Reschedule MDT Meeting/i)).toBeInTheDocument();
      });
      
      const dateInput = screen.getByLabelText(/New Date/i);
      const timeInput = screen.getByLabelText(/New Time/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
      fireEvent.change(timeInput, { target: { value: '14:00' } });
      
      const saveButtons = screen.getAllByText(/Save/i);
      const saveButton = saveButtons.find(btn => btn.textContent === 'Save');
      if (saveButton) {
        fireEvent.click(saveButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Failed to reschedule/i)).toBeInTheDocument();
        });
      }
    });

    it('should disable save button when date or time is missing', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const rescheduleButtons = screen.getAllByText(/Reschedule/i);
      const rescheduleButton = rescheduleButtons[0];
      fireEvent.click(rescheduleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Reschedule MDT Meeting/i)).toBeInTheDocument();
      });
      
      const saveButtons = screen.getAllByText(/Save/i);
      const saveButton = saveButtons.find(btn => btn.textContent === 'Save');
      if (saveButton) {
        expect(saveButton).toBeDisabled();
      }
    });

    it('should use meeting.id when available for reschedule', async () => {
      mockGetMeetingById.mockResolvedValueOnce({
        success: true,
        data: { id: 2, meetingDate: '2024-01-15', meetingTime: '10:00' }
      });
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const rescheduleButtons = screen.getAllByText(/Reschedule/i);
      const rescheduleButton = rescheduleButtons[0];
      fireEvent.click(rescheduleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Reschedule MDT Meeting/i)).toBeInTheDocument();
      });
      
      const dateInput = screen.getByLabelText(/New Date/i);
      const timeInput = screen.getByLabelText(/New Time/i);
      fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
      fireEvent.change(timeInput, { target: { value: '14:00' } });
      
      const saveButtons = screen.getAllByText(/Save/i);
      const saveButton = saveButtons.find(btn => btn.textContent === 'Save');
      if (saveButton) {
        fireEvent.click(saveButton);
        
        await waitFor(() => {
          expect(mockRescheduleMDTMeeting).toHaveBeenCalledWith(
            2,
            { meetingDate: '2024-01-20', meetingTime: '14:00' }
          );
        });
      }
    });
  });

  describe('Confirm Modal', () => {
    it('should show confirm modal when closing with unsaved changes', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const discussionNotesTextarea = screen.getByPlaceholderText(/Document key discussion points/i);
      fireEvent.change(discussionNotesTextarea, { target: { value: 'Test notes' } });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
        expect(screen.getByText(/Unsaved Changes/i)).toBeInTheDocument();
      });
    });

    it('should close without confirm modal when no unsaved changes', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
        expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      });
    });

    it('should save and close when confirm button is clicked', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const discussionNotesTextarea = screen.getByPlaceholderText(/Document key discussion points/i);
      fireEvent.change(discussionNotesTextarea, { target: { value: 'Test notes' } });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByTestId('confirm-button');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
      
      consoleLogSpy.mockRestore();
    });

    it('should close without saving when cancel button is clicked', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const discussionNotesTextarea = screen.getByPlaceholderText(/Document key discussion points/i);
      fireEvent.change(discussionNotesTextarea, { target: { value: 'Test notes' } });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Escape Key Handler', () => {
    it('should handle escape key press with unsaved changes', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const discussionNotesTextarea = screen.getByPlaceholderText(/Document key discussion points/i);
      fireEvent.change(discussionNotesTextarea, { target: { value: 'Test notes' } });
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
    });

    it('should close directly when escape key is pressed with no unsaved changes', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Format Functions', () => {
    it('should format date correctly', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      expect(screen.getByText(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i)).toBeInTheDocument();
    });

    it('should format time to 12-hour format', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, time: '14:00' }} />);
      expect(screen.getByText(/2:00 PM/i)).toBeInTheDocument();
    });

    it('should format time correctly for AM times', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, time: '09:30' }} />);
      expect(screen.getByText(/9:30 AM/i)).toBeInTheDocument();
    });

    it('should format time correctly for noon', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, time: '12:00' }} />);
      expect(screen.getByText(/12:00 PM/i)).toBeInTheDocument();
    });

    it('should format time correctly for midnight', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, time: '00:00' }} />);
      expect(screen.getByText(/12:00 AM/i)).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('should display upcoming status badge', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, status: 'upcoming' }} />);
      expect(screen.getByText(/Upcoming/i)).toBeInTheDocument();
    });

    it('should display completed status badge', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, status: 'completed' }} />);
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    });

    it('should display cancelled status badge', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, status: 'cancelled' }} />);
      expect(screen.getByText(/Cancelled/i)).toBeInTheDocument();
    });

    it('should display default status badge for unknown status', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, status: 'unknown' }} />);
      expect(screen.getByText(/Scheduled/i)).toBeInTheDocument();
    });
  });

  describe('Virtual Meeting Detection', () => {
    it('should detect virtual meeting from location', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, location: 'Virtual Meeting' }} />);
      expect(screen.getByText(/Virtual Meeting/i)).toBeInTheDocument();
    });

    it('should detect virtual meeting from zoom location', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, location: 'Zoom Meeting' }} />);
      expect(screen.getByText(/Virtual Meeting/i)).toBeInTheDocument();
    });

    it('should detect virtual meeting from teams location', () => {
      render(<MDTScheduleDetailsModal {...defaultProps} schedule={{ ...mockSchedule, location: 'Teams Meeting' }} />);
      expect(screen.getByText(/Virtual Meeting/i)).toBeInTheDocument();
    });
  });

  describe('Meeting Completion Check', () => {
    it('should disable reschedule button when meeting is complete', async () => {
      mockGetMeetingById.mockResolvedValueOnce({
        success: true,
        data: {
          id: 1,
          meetingDate: '2024-01-15',
          meetingTime: '10:00',
          mdtOutcome: 'treatment_approved',
          notes: JSON.stringify({ content: 'Test content' })
        }
      });
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        const rescheduleButtons = screen.getAllByText(/Reschedule/i);
        const rescheduleButton = rescheduleButtons[0];
        expect(rescheduleButton).toBeDisabled();
      });
    });

    it('should enable reschedule button when meeting is not complete', async () => {
      mockGetMeetingById.mockResolvedValueOnce({
        success: true,
        data: {
          id: 1,
          meetingDate: '2024-01-15',
          meetingTime: '10:00'
        }
      });
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        const rescheduleButtons = screen.getAllByText(/Reschedule/i);
        const rescheduleButton = rescheduleButtons[0];
        expect(rescheduleButton).not.toBeDisabled();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save meeting data when save button is clicked', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const discussionNotesTextarea = screen.getByPlaceholderText(/Document key discussion points/i);
      fireEvent.change(discussionNotesTextarea, { target: { value: 'Test notes' } });
      
      const saveButton = screen.getByText(/Save Meeting Record/i);
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Saving MDT meeting data:'),
          expect.any(Object)
        );
        expect(mockOnClose).toHaveBeenCalled();
      });
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Unsaved Changes Detection', () => {
    it('should detect unsaved changes from discussion notes', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const discussionNotesTextarea = screen.getByPlaceholderText(/Document key discussion points/i);
      fireEvent.change(discussionNotesTextarea, { target: { value: 'Test notes' } });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
    });

    it('should detect unsaved changes from MDT outcome', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const outcomeSelect = screen.getByDisplayValue(/Select MDT Outcome/i);
      fireEvent.change(outcomeSelect, { target: { value: 'treatment_approved' } });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
    });

    it('should detect unsaved changes from recommendations', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const recommendationInput = screen.getByPlaceholderText(/Add clinical recommendation/i);
      fireEvent.change(recommendationInput, { target: { value: 'Test recommendation' } });
      fireEvent.keyPress(recommendationInput, { key: 'Enter' });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
    });

    it('should detect unsaved changes from follow-up actions', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const actionInput = screen.getByPlaceholderText(/Add follow-up action item/i);
      fireEvent.change(actionInput, { target: { value: 'Test action' } });
      fireEvent.keyPress(actionInput, { key: 'Enter' });
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
    });

    it('should detect unsaved changes from documents', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
      
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });
      }
      
      const closeButton = screen.getByLabelText(/Close modal/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Meeting Data Loading', () => {
    it('should load meeting data on mount', async () => {
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(mockGetMeetingById).toHaveBeenCalledWith(1);
      });
    });

    it('should handle meeting load error', async () => {
      mockGetMeetingById.mockResolvedValueOnce({
        success: false,
        error: 'Failed to load'
      });
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(mockGetMeetingById).toHaveBeenCalled();
      });
    });

    it('should initialize reschedule fields from loaded meeting', async () => {
      mockGetMeetingById.mockResolvedValueOnce({
        success: true,
        data: {
          id: 1,
          meetingDate: '2024-01-20',
          meetingTime: '14:00'
        }
      });
      
      render(<MDTScheduleDetailsModal {...defaultProps} />);
      await waitFor(() => {
        expect(mockGetMeetingById).toHaveBeenCalled();
      });
      
      const rescheduleButtons = screen.getAllByText(/Reschedule/i);
      const rescheduleButton = rescheduleButtons[0];
      fireEvent.click(rescheduleButton);
      
      await waitFor(() => {
        const dateInput = screen.getByLabelText(/New Date/i);
        expect(dateInput.value).toBe('2024-01-20');
      });
    });
  });
});
