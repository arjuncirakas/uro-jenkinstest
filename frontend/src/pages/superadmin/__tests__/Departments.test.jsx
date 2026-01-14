import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Departments from '../Departments';
import { doctorsService } from '../../../services/doctorsService';

// Mock dependencies
vi.mock('../../../services/doctorsService', () => ({
  doctorsService: {
    getAllDepartments: vi.fn(),
    addDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    deleteDepartment: vi.fn()
  }
}));

vi.mock('../../../components/SuccessModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="success-modal">{message}</div> : null
  )
}));

vi.mock('../../../components/modals/ErrorModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="error-modal">{message}</div> : null
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

describe('Departments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doctorsService.getAllDepartments.mockResolvedValue({
      success: true,
      data: []
    });
  });

  describe('Rendering', () => {
    it('should render departments page', () => {
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      expect(screen.getByText(/departments/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search departments/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch departments on mount', async () => {
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(doctorsService.getAllDepartments).toHaveBeenCalled();
      });
    });

    it('should display departments', async () => {
      const mockDepartments = [
        {
          id: 1,
          name: 'Urology',
          description: 'Urology department'
        }
      ];
      
      doctorsService.getAllDepartments.mockResolvedValue({
        success: true,
        data: mockDepartments
      });
      
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Urology')).toBeInTheDocument();
      });
    });

    it('should handle fetch error', async () => {
      doctorsService.getAllDepartments.mockResolvedValue({
        success: false,
        error: 'Fetch failed'
      });
      
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Add Department', () => {
    it('should open add department modal', () => {
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      
      const addButton = screen.getByText(/add department/i);
      fireEvent.click(addButton);
      
      expect(screen.getByText(/department name/i)).toBeInTheDocument();
    });

    it('should validate required fields', () => {
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      
      const addButton = screen.getByText(/add department/i);
      fireEvent.click(addButton);
      
      const submitButton = screen.getByText(/save/i);
      fireEvent.click(submitButton);
      
      expect(screen.getByText(/department name is required/i)).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should filter departments by search query', async () => {
      const mockDepartments = [
        { id: 1, name: 'Urology', description: 'Urology dept' },
        { id: 2, name: 'Cardiology', description: 'Cardiology dept' }
      ];
      
      doctorsService.getAllDepartments.mockResolvedValue({
        success: true,
        data: mockDepartments
      });
      
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Urology')).toBeInTheDocument();
        expect(screen.getByText('Cardiology')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText(/search departments/i);
      fireEvent.change(searchInput, { target: { value: 'Urology' } });
      
      expect(screen.getByText('Urology')).toBeInTheDocument();
      expect(screen.queryByText('Cardiology')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty departments list', async () => {
      render(
        <BrowserRouter>
          <Departments />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/no departments/i)).toBeInTheDocument();
      });
    });
  });
});
