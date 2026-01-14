import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReferredPatients from '../ReferredPatients';
import { gpService } from '../../../services/gpService';

// Mock dependencies
vi.mock('../../../services/gpService', () => ({
  gpService: {
    getReferredPatients: vi.fn()
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

describe('ReferredPatients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gpService.getReferredPatients.mockResolvedValue({
      success: true,
      data: {
        patients: []
      }
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render referred patients page', () => {
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      expect(screen.getByText(/referred patients/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search patients/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch referred patients on mount', async () => {
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(gpService.getReferredPatients).toHaveBeenCalled();
      });
    });

    it('should display patients', async () => {
      const mockPatients = [
        {
          id: 1,
          fullName: 'John Doe',
          upi: 'URP123',
          age: 50,
          gender: 'Male',
          initialPSA: 4.5,
          referralDate: '2024-01-15',
          priority: 'Normal',
          carePathway: 'OPD Queue'
        }
      ];
      
      gpService.getReferredPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      gpService.getReferredPatients.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('should handle empty patients list', async () => {
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no patients/i)).toBeInTheDocument();
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
          age: 50,
          gender: 'Male',
          initialPSA: 4.5,
          referralDate: '2024-01-15',
          priority: 'Normal',
          carePathway: 'OPD Queue'
        },
        {
          id: 2,
          fullName: 'Jane Smith',
          upi: 'URP456',
          age: 45,
          gender: 'Female',
          initialPSA: 3.5,
          referralDate: '2024-01-16',
          priority: 'High',
          carePathway: 'Surgery Pathway'
        }
      ];
      
      gpService.getReferredPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Patient Details', () => {
    it('should open patient details modal', async () => {
      const mockPatients = [
        {
          id: 1,
          fullName: 'John Doe',
          upi: 'URP123',
          age: 50,
          gender: 'Male',
          initialPSA: 4.5,
          referralDate: '2024-01-15',
          priority: 'Normal',
          carePathway: 'OPD Queue'
        }
      ];
      
      gpService.getReferredPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const viewButton = screen.getByLabelText(/view details.*john doe/i);
        fireEvent.click(viewButton);
      });
      
      expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
    });
  });

  describe('Event Listeners', () => {
    it('should refresh on patient added event', async () => {
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(gpService.getReferredPatients).toHaveBeenCalledTimes(1);
      });
      
      window.dispatchEvent(new CustomEvent('patientAdded', { detail: { id: 1 } }));
      
      await waitFor(() => {
        expect(gpService.getReferredPatients).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('PSA Status', () => {
    it('should display PSA status based on age', async () => {
      const mockPatients = [
        {
          id: 1,
          fullName: 'John Doe',
          upi: 'URP123',
          age: 50,
          gender: 'Male',
          initialPSA: 5.5,
          referralDate: '2024-01-15',
          priority: 'Normal',
          carePathway: 'OPD Queue'
        }
      ];
      
      gpService.getReferredPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('5.5')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null patient data', async () => {
      gpService.getReferredPatients.mockResolvedValue({
        success: true,
        data: null
      });
      
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no patients/i)).toBeInTheDocument();
      });
    });

    it('should handle missing patient fields', async () => {
      const mockPatients = [
        {
          id: 1
        }
      ];
      
      gpService.getReferredPatients.mockResolvedValue({
        success: true,
        data: {
          patients: mockPatients
        }
      });
      
      render(
        <BrowserRouter>
          <ReferredPatients />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        // Should not crash
        expect(screen.getByText(/referred patients/i)).toBeInTheDocument();
      });
    });
  });
});
