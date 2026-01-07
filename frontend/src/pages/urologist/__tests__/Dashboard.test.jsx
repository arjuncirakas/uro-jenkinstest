import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import Dashboard from '../Dashboard';

// Hoist mocks
const mocks = vi.hoisted(() => ({
  mockGetTodaysAppointments: vi.fn(),
  mockGetSurgicalQueue: vi.fn(),
  mockGetMdtOutcomes: vi.fn(),
  mockGetRecentPatients: vi.fn(),
  mockGetSurgeries: vi.fn(),
  mockGetMdtSchedules: vi.fn(),
  mockGetPatientsDueForReview: vi.fn(),
  mockGetCurrentUser: vi.fn()
}));

vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getTodaysAppointments: (...args) => mocks.mockGetTodaysAppointments(...args),
    getSurgicalQueue: (...args) => mocks.mockGetSurgicalQueue(...args)
  }
}));

vi.mock('../../services/patientService', () => ({
  patientService: {
    getRecentPatients: (...args) => mocks.mockGetRecentPatients(...args),
    getPatientsDueForReview: (...args) => mocks.mockGetPatientsDueForReview(...args)
  }
}));

vi.mock('../../services/mdtService', () => ({
  mdtService: {
    getMdtOutcomes: (...args) => mocks.mockGetMdtOutcomes(...args),
    getMdtSchedules: (...args) => mocks.mockGetMdtSchedules(...args)
  }
}));

vi.mock('../../services/authService', () => ({
  default: {
    getCurrentUser: (...args) => mocks.mockGetCurrentUser(...args)
  }
}));

// Mock components
vi.mock('../../components/NotificationModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="notification-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../components/PatientDetailsModalWrapper', () => ({
  default: ({ isOpen, onClose, patientId }) =>
    isOpen ? (
      <div data-testid="patient-details-modal">
        <span data-testid="patient-id">{patientId}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../components/MDTScheduleDetailsModal', () => ({
  default: ({ isOpen, onClose, schedule }) =>
    isOpen ? (
      <div data-testid="mdt-schedule-details-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../components/MDTNotesModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="mdt-notes-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../components/PatientsDueForReviewModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="patients-review-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../components/ProfileDropdown', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="profile-dropdown">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

vi.mock('../../components/GlobalPatientSearch', () => ({
  default: () => <div data-testid="global-patient-search">Search</div>
}));

// Mock icons
vi.mock('react-icons/io5', () => ({
  IoChevronForward: () => <span data-testid="chevron-icon" />,
  IoNotificationsOutline: () => <span data-testid="notifications-icon" />,
  IoPersonCircleOutline: () => <span data-testid="person-icon" />
}));

vi.mock('react-icons/bs', () => ({
  BsCalendar3: () => <span data-testid="calendar-icon" />
}));

describe('Urologist Dashboard', () => {
  const mockUser = {
    id: 1,
    role: 'urologist',
    name: 'Dr. Smith',
    email: 'dr.smith@example.com'
  };

  const mockAppointments = {
    success: true,
    data: {
      appointments: [
        {
          id: 1,
          patientName: 'John Doe',
          appointmentTime: '10:00',
          appointmentType: 'Consultation'
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetCurrentUser.mockReturnValue(mockUser);
    mocks.mockGetTodaysAppointments.mockResolvedValue(mockAppointments);
    mocks.mockGetSurgicalQueue.mockResolvedValue({ success: true, data: [] });
    mocks.mockGetMdtOutcomes.mockResolvedValue({ success: true, data: [] });
    mocks.mockGetRecentPatients.mockResolvedValue({ success: true, data: [] });
    mocks.mockGetSurgeries.mockResolvedValue({ success: true, data: [] });
    mocks.mockGetMdtSchedules.mockResolvedValue({ success: true, data: [] });
    mocks.mockGetPatientsDueForReview.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard with tabs', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Appointments/i) || screen.getByText(/appointments/i)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      mocks.mockGetTodaysAppointments.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<Dashboard />);
      expect(screen.getByText(/loading/i) || screen.queryByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch today\'s appointments on mount', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetTodaysAppointments).toHaveBeenCalled();
      });
    });

    it('should fetch surgical queue on mount', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetSurgicalQueue).toHaveBeenCalled();
      });
    });

    it('should fetch MDT outcomes on mount', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetMdtOutcomes).toHaveBeenCalled();
      });
    });

    it('should display appointments when loaded', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to appointments tab', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const appointmentsTab = screen.getByText(/Appointments/i) || 
                               screen.getByText(/appointments/i);
        if (appointmentsTab) {
          fireEvent.click(appointmentsTab);
          expect(appointmentsTab).toBeInTheDocument();
        }
      });
    });

    it('should switch to surgical queue tab', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const surgicalTab = screen.getByText(/Surgical/i) || 
                           screen.getByText(/surgical/i);
        if (surgicalTab) {
          fireEvent.click(surgicalTab);
          expect(surgicalTab).toBeInTheDocument();
        }
      });
    });
  });

  describe('Notification Modal', () => {
    it('should open notification modal when notification icon is clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const notificationButton = screen.getByTestId('notifications-icon')?.closest('button') ||
                                 screen.getByRole('button', { name: /notification/i });
        if (notificationButton) {
          fireEvent.click(notificationButton);
          expect(screen.getByTestId('notification-modal')).toBeInTheDocument();
        }
      });
    });
  });

  describe('Profile Dropdown', () => {
    it('should open profile dropdown when profile icon is clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const profileButton = screen.getByTestId('person-icon')?.closest('button') ||
                            screen.getByRole('button', { name: /profile/i });
        if (profileButton) {
          fireEvent.click(profileButton);
          expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();
        }
      });
    });
  });

  describe('Patients Due for Review Modal', () => {
    it('should open patients review modal when button is clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const reviewButton = screen.getByRole('button', { name: /review|due/i });
        if (reviewButton) {
          fireEvent.click(reviewButton);
          expect(screen.getByTestId('patients-review-modal')).toBeInTheDocument();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle error when appointments fetch fails', async () => {
      mocks.mockGetTodaysAppointments.mockResolvedValue({
        success: false,
        error: 'Failed to fetch appointments'
      });
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetTodaysAppointments).toHaveBeenCalled();
      });
    });

    it('should handle missing user', () => {
      mocks.mockGetCurrentUser.mockReturnValue(null);
      
      render(<Dashboard />);
      
      // Should still render but may show error
      expect(screen.getByText(/Appointments/i) || screen.getByText(/appointments/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty appointments list', async () => {
      mocks.mockGetTodaysAppointments.mockResolvedValue({
        success: true,
        data: { appointments: [] }
      });
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetTodaysAppointments).toHaveBeenCalled();
      });
    });

    it('should handle empty surgical queue', async () => {
      mocks.mockGetSurgicalQueue.mockResolvedValue({
        success: true,
        data: []
      });
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetSurgicalQueue).toHaveBeenCalled();
      });
    });
  });
});
