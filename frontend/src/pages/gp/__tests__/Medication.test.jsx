import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Medication from '../Medication';
import { gpService } from '../../../services/gpService';

// Mock dependencies
vi.mock('../../../services/gpService', () => ({
  gpService: {
    getMedicationPatients: vi.fn()
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

describe('Medication (GP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gpService.getMedicationPatients.mockResolvedValue({
      success: true,
      data: {
        patients: []
      }
    });
  });

  describe('Rendering', () => {
    it('should render medication page', () => {
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      expect(screen.getByText(/medication/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search.*medication/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch medication patients', async () => {
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(gpService.getMedicationPatients).toHaveBeenCalled();
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
          monitoringStatus: 'On Medication'
        }
      ];
      
      gpService.getMedicationPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      gpService.getMedicationPatients.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <Medication />
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
          assignedUrologist: 'Dr. Smith'
        },
        {
          id: 2,
          fullName: 'Jane Smith',
          upi: 'URP456',
          assignedUrologist: 'Dr. Jones'
        }
      ];
      
      gpService.getMedicationPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search.*medication/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Event Listeners', () => {
    it('should refresh on patient added event', async () => {
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(gpService.getMedicationPatients).toHaveBeenCalledTimes(1);
      });
      
      window.dispatchEvent(new CustomEvent('patientAdded', { detail: { id: 1 } }));
      
      await waitFor(() => {
        expect(gpService.getMedicationPatients).toHaveBeenCalledTimes(2);
      });
    });

    it('should refresh on patient updated event', async () => {
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(gpService.getMedicationPatients).toHaveBeenCalledTimes(1);
      });
      
      window.dispatchEvent(new CustomEvent('patientUpdated', { detail: { id: 1 } }));
      
      await waitFor(() => {
        expect(gpService.getMedicationPatients).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty patients list', async () => {
      render(
        <BrowserRouter>
          <Medication />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no.*medication.*patients/i)).toBeInTheDocument();
      });
    });
  });
});
