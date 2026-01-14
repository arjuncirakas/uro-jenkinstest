import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Doctors from '../Doctors';
import { doctorsService } from '../../../services/doctorsService';

// Mock dependencies
vi.mock('../../../services/doctorsService', () => ({
  doctorsService: {
    getAllDoctors: vi.fn(),
    getAllDepartments: vi.fn(),
    addDoctor: vi.fn(),
    updateDoctor: vi.fn(),
    deleteDoctor: vi.fn()
  }
}));

vi.mock('../../../components/SuccessModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="success-modal">{message}</div> : null
  )
}));

vi.mock('../../../components/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onCancel }) => (
    isOpen ? (
      <div data-testid="confirm-modal">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  )
}));

vi.mock('../../../utils/inputValidation', () => ({
  validatePhoneInput: vi.fn((value) => /^[\d\s\-\(\)\+]*$/.test(value)),
  validateNameInput: vi.fn((value) => /^[a-zA-Z\s'.-]*$/.test(value)),
  validateEmail: vi.fn((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
}));

describe('Doctors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doctorsService.getAllDoctors.mockResolvedValue({
      success: true,
      data: []
    });
    doctorsService.getAllDepartments.mockResolvedValue({
      success: true,
      data: []
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render doctors page', () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      expect(screen.getByText(/doctors/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search doctors/i)).toBeInTheDocument();
    });

    it('should display department filter', () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch doctors on mount', async () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(doctorsService.getAllDoctors).toHaveBeenCalled();
      });
    });

    it('should fetch departments on mount', async () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(doctorsService.getAllDepartments).toHaveBeenCalled();
      });
    });

    it('should display doctors', async () => {
      const mockDoctors = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          phone: '1234567890',
          department_id: 1
        }
      ];
      
      doctorsService.getAllDoctors.mockResolvedValue({
        success: true,
        data: mockDoctors
      });
      
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should filter by department', async () => {
      doctorsService.getAllDoctors.mockResolvedValue({
        success: true,
        data: []
      });
      
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      const departmentSelect = screen.getByLabelText(/department/i);
      fireEvent.change(departmentSelect, { target: { value: '1' } });
      
      await waitFor(() => {
        expect(doctorsService.getAllDoctors).toHaveBeenCalledWith(
          expect.objectContaining({
            department_id: '1'
          })
        );
      });
    });
  });

  describe('Search', () => {
    it('should debounce search requests', async () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      const searchInput = screen.getByPlaceholderText(/search doctors/i);
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Jo' } });
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(searchInput.value).toBe('John');
      });
    });
  });

  describe('Add Doctor', () => {
    it('should open add doctor modal', () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      const addButton = screen.getByText(/add doctor/i);
      fireEvent.click(addButton);
      
      expect(screen.getByText(/first name/i)).toBeInTheDocument();
    });

    it('should validate required fields', () => {
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      const addButton = screen.getByText(/add doctor/i);
      fireEvent.click(addButton);
      
      const submitButton = screen.getByText(/save/i);
      fireEvent.click(submitButton);
      
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch error', async () => {
      doctorsService.getAllDoctors.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <Doctors />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });
  });
});
