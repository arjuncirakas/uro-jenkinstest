import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ActiveMonitoring from '../ActiveMonitoring';
import { gpService } from '../../../services/gpService';

// Mock dependencies
vi.mock('../../../services/gpService', () => ({
  gpService: {
    getActiveMonitoringPatients: vi.fn()
  }
}));

vi.mock('../../../components/layout/GPHeader', () => ({
  default: ({ title }) => <h1>{title}</h1>
}));

vi.mock('../../../components/GPPatientDetailsModal', () => ({
  default: ({ isOpen, onClose, patientId }) => (
    isOpen ? (
      <div data-testid="patient-details-modal">
        <div>Patient ID: {patientId}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../../../utils/psaStatusByAge', () => ({
  getPSAStatusByAge: vi.fn((psa, age) => ({
    status: psa > 4 ? 'High' : 'Low',
    threshold: 4
  }))
}));

describe('ActiveMonitoring (GP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gpService.getActiveMonitoringPatients.mockResolvedValue({
      success: true,
      data: {
        patients: []
      }
    });
  });

  describe('Rendering', () => {
    it('should render active monitoring page', () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      expect(screen.getByText(/active monitoring/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search.*monitoring/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch active monitoring patients', async () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(gpService.getActiveMonitoringPatients).toHaveBeenCalled();
      });
    });

    it('should display patients', async () => {
      const mockPatients = [
        {
          id: 1,
          fullName: 'John Doe',
          upi: 'URP123',
          age: 50,
          initialPSA: 4.5,
          assignedUrologist: 'Dr. Smith',
          nextAppointmentDate: '2024-01-15'
        }
      ];
      
      gpService.getActiveMonitoringPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      gpService.getActiveMonitoringPatients.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should filter patients by search query', async () => {
      const mockPatients = [
        {
          id: 1,
          fullName: 'John Doe',
          upi: 'URP123',
          monitoringStatus: 'Stable',
          assignedUrologist: 'Dr. Smith'
        },
        {
          id: 2,
          fullName: 'Jane Smith',
          upi: 'URP456',
          monitoringStatus: 'Stable',
          assignedUrologist: 'Dr. Jones'
        }
      ];
      
      gpService.getActiveMonitoringPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search.*monitoring/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Event Listeners', () => {
    it('should refresh on patient added event', async () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(gpService.getActiveMonitoringPatients).toHaveBeenCalledTimes(1);
      });
      
      window.dispatchEvent(new CustomEvent('patientAdded', { detail: { id: 1 } }));
      
      await waitFor(() => {
        expect(gpService.getActiveMonitoringPatients).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty patients list', async () => {
      render(
        <BrowserRouter>
          <ActiveMonitoring />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no.*monitoring.*patients/i)).toBeInTheDocument();
      });
    });
  });
});
