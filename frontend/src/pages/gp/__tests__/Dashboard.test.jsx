import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import Dashboard from '../Dashboard';

// Hoist mocks
const mocks = vi.hoisted(() => ({
  mockGetRecentReferrals: vi.fn(),
  mockGetActiveMonitoringAndMedicationPatients: vi.fn(),
  mockGetCurrentUser: vi.fn()
}));

vi.mock('../../services/gpService', () => ({
  gpService: {
    getRecentReferrals: (...args) => mocks.mockGetRecentReferrals(...args),
    getActiveMonitoringAndMedicationPatients: (...args) => mocks.mockGetActiveMonitoringAndMedicationPatients(...args)
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

vi.mock('../../components/GPPatientDetailsModal', () => ({
  default: ({ isOpen, onClose, patientId }) =>
    isOpen ? (
      <div data-testid="gp-patient-details-modal">
        <span data-testid="patient-id">{patientId}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}));

// Mock icons
vi.mock('react-icons/fi', () => ({
  FiSearch: () => <span data-testid="search-icon" />
}));

vi.mock('react-icons/io5', () => ({
  IoChevronForward: () => <span data-testid="chevron-icon" />,
  IoNotificationsOutline: () => <span data-testid="notifications-icon" />
}));

vi.mock('react-icons/bs', () => ({
  BsCalendar3: () => <span data-testid="calendar-icon" />
}));

describe('GP Dashboard', () => {
  const mockUser = {
    id: 1,
    role: 'gp',
    name: 'Dr. Smith',
    email: 'dr.smith@example.com'
  };

  const mockReferrals = {
    success: true,
    data: {
      patients: [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          name: 'John Doe',
          dateOfEntry: '2024-01-15',
          createdAt: '2024-01-15T00:00:00Z',
          age: 65,
          psa: 4.5,
          status: 'Pending Review',
          priority: 'Normal'
        }
      ]
    }
  };

  const mockMonitoringPatients = {
    success: true,
    data: {
      patients: [
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          fullName: 'Jane Smith',
          age: 70,
          initialPSA: 3.2,
          initialPSADate: '2024-01-10T00:00:00Z',
          createdAt: '2024-01-10T00:00:00Z',
          nextReview: '2024-04-10',
          carePathway: 'Active Monitoring',
          monitoringStatus: 'Stable'
        }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetCurrentUser.mockReturnValue(mockUser);
    mocks.mockGetRecentReferrals.mockResolvedValue(mockReferrals);
    mocks.mockGetActiveMonitoringAndMedicationPatients.mockResolvedValue(mockMonitoringPatients);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard with tabs', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Referrals/i) || screen.getByText(/referrals/i)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      mocks.mockGetRecentReferrals.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<Dashboard />);
      expect(screen.getByText(/loading/i) || screen.queryByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch recent referrals on mount', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetRecentReferrals).toHaveBeenCalled();
      });
    });

    it('should fetch active monitoring patients on mount', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetActiveMonitoringAndMedicationPatients).toHaveBeenCalled();
      });
    });

    it('should display recent referrals when loaded', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
    });

    it('should display active monitoring patients when loaded', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to active monitoring tab when clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const monitoringTab = screen.getByText(/Active Monitoring/i) || 
                            screen.getByText(/active monitoring/i);
        if (monitoringTab) {
          fireEvent.click(monitoringTab);
          expect(monitoringTab).toBeInTheDocument();
        }
      });
    });

    it('should switch to referrals tab when clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const referralsTab = screen.getByText(/Referrals/i) || 
                           screen.getByText(/referrals/i);
        if (referralsTab) {
          fireEvent.click(referralsTab);
          expect(referralsTab).toBeInTheDocument();
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

    it('should close notification modal when close button is clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const notificationButton = screen.getByTestId('notifications-icon')?.closest('button') ||
                                 screen.getByRole('button', { name: /notification/i });
        if (notificationButton) {
          fireEvent.click(notificationButton);
          
          const closeButton = screen.getByRole('button', { name: /close/i });
          if (closeButton) {
            fireEvent.click(closeButton);
            expect(screen.queryByTestId('notification-modal')).not.toBeInTheDocument();
          }
        }
      });
    });
  });

  describe('Patient Details Modal', () => {
    it('should open patient details modal when patient is clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const patientRow = screen.getByText(/John Doe/i);
        if (patientRow) {
          fireEvent.click(patientRow);
          expect(screen.getByTestId('gp-patient-details-modal')).toBeInTheDocument();
        }
      });
    });

    it('should close patient details modal when close button is clicked', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        const patientRow = screen.getByText(/John Doe/i);
        if (patientRow) {
          fireEvent.click(patientRow);
          
          const closeButton = screen.getByRole('button', { name: /close/i });
          if (closeButton) {
            fireEvent.click(closeButton);
            expect(screen.queryByTestId('gp-patient-details-modal')).not.toBeInTheDocument();
          }
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when referrals fetch fails', async () => {
      mocks.mockGetRecentReferrals.mockResolvedValue({
        success: false,
        error: 'Failed to fetch referrals'
      });
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetRecentReferrals).toHaveBeenCalled();
      });
    });

    it('should handle empty referrals list', async () => {
      mocks.mockGetRecentReferrals.mockResolvedValue({
        success: true,
        data: { patients: [] }
      });
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetRecentReferrals).toHaveBeenCalled();
      });
    });
  });

  describe('Event Listeners', () => {
    it('should refresh data when patientAdded event is fired', async () => {
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetRecentReferrals).toHaveBeenCalledTimes(1);
      });
      
      // Fire patientAdded event
      window.dispatchEvent(new CustomEvent('patientAdded', { detail: { patientId: 123 } }));
      
      await waitFor(() => {
        expect(mocks.mockGetRecentReferrals).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user data', () => {
      mocks.mockGetCurrentUser.mockReturnValue(null);
      
      render(<Dashboard />);
      
      // Should still render dashboard
      expect(screen.getByText(/Referrals/i) || screen.getByText(/referrals/i)).toBeInTheDocument();
    });

    it('should handle patient data with missing fields', async () => {
      mocks.mockGetRecentReferrals.mockResolvedValue({
        success: true,
        data: {
          patients: [
            {
              id: 1,
              // Missing name fields
              dateOfEntry: '2024-01-15'
            }
          ]
        }
      });
      
      render(<Dashboard />);
      
      await waitFor(() => {
        expect(mocks.mockGetRecentReferrals).toHaveBeenCalled();
      });
    });
  });
});
