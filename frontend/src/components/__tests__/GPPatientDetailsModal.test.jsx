import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GPPatientDetailsModal from '../GPPatientDetailsModal';
import { patientService } from '../../services/patientService';
import { bookingService } from '../../services/bookingService';

// Mock dependencies
vi.mock('../../services/patientService', () => ({
  patientService: {
    getPatientById: vi.fn()
  }
}));

vi.mock('../../services/bookingService', () => ({
  bookingService: {
    getPatientAppointments: vi.fn()
  }
}));

vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn()
}));

// Mock fetch for discharge summary
global.fetch = vi.fn();

describe('GPPatientDetailsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    patientService.getPatientById.mockResolvedValue({
      success: true,
      data: {}
    });
    bookingService.getPatientAppointments.mockResolvedValue({
      success: true,
      data: { appointments: [] }
    });
    global.fetch.mockResolvedValue({
      ok: false
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <GPPatientDetailsModal
          isOpen={false}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      expect(screen.queryByText('Patient Details')).not.toBeInTheDocument();
    });

    it('should not render when patientId is null', () => {
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={null}
        />
      );
      expect(screen.queryByText('Patient Details')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true and patientId is provided', () => {
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      expect(screen.getByText('Patient Details')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      patientService.getPatientById.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 100)));
      
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      expect(screen.getByText(/loading patient details/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch patient data on open', async () => {
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      
      await waitFor(() => {
        expect(patientService.getPatientById).toHaveBeenCalledWith(1);
      });
    });

    it('should fetch appointments on open', async () => {
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      
      await waitFor(() => {
        expect(bookingService.getPatientAppointments).toHaveBeenCalledWith(1);
      });
    });

    it('should display patient information', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        upi: 'URP123',
        age: 50,
        gender: 'Male',
        email: 'john@example.com',
        phone: '1234567890'
      };
      
      patientService.getPatientById.mockResolvedValue({
        success: true,
        data: mockPatient
      });
      
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('URP123')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      patientService.getPatientById.mockResolvedValue({
        success: false,
        error: 'Fetch failed'
      });
      
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/error loading patient details/i)).toBeInTheDocument();
      });
    });
  });

  describe('Tabs', () => {
    it('should switch between tabs', async () => {
      const mockPatient = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe'
      };
      
      patientService.getPatientById.mockResolvedValue({
        success: true,
        data: mockPatient
      });
      
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      
      await waitFor(() => {
        const appointmentsTab = screen.getByText(/appointments/i);
        fireEvent.click(appointmentsTab);
      });
      
      expect(screen.getByText(/appointments/i)).toBeInTheDocument();
    });
  });

  describe('Close', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      const closeButton = screen.getByLabelText(/close modal/i);
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle network error', async () => {
      patientService.getPatientById.mockRejectedValue(new Error('Network error'));
      
      render(
        <GPPatientDetailsModal
          isOpen={true}
          onClose={mockOnClose}
          patientId={1}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/error loading patient details/i)).toBeInTheDocument();
      });
    });
  });
});
