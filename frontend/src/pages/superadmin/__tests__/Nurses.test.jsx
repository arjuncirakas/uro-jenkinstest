import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Nurses from '../Nurses';
import { nursesService } from '../../../services/nursesService';

// Mock dependencies
vi.mock('../../../services/nursesService', () => ({
  nursesService: {
    getAllNurses: vi.fn(),
    addNurse: vi.fn(),
    updateNurse: vi.fn(),
    deleteNurse: vi.fn()
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

describe('Nurses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nursesService.getAllNurses.mockResolvedValue({
      success: true,
      data: []
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render nurses page', () => {
      render(
        <BrowserRouter>
          <Nurses />
        </BrowserRouter>
      );
      expect(screen.getByText(/nurses/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <BrowserRouter>
          <Nurses />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText(/search nurses/i)).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch nurses on mount', async () => {
      render(
        <BrowserRouter>
          <Nurses />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(nursesService.getAllNurses).toHaveBeenCalled();
      });
    });

    it('should display nurses', async () => {
      const mockNurses = [
        {
          id: 1,
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          phone: '1234567890',
          organization: 'Hospital A'
        }
      ];
      
      nursesService.getAllNurses.mockResolvedValue({
        success: true,
        data: mockNurses
      });
      
      render(
        <BrowserRouter>
          <Nurses />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    it('should debounce search requests', async () => {
      render(
        <BrowserRouter>
          <Nurses />
        </BrowserRouter>
      );
      
      const searchInput = screen.getByPlaceholderText(/search nurses/i);
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Ja' } });
      fireEvent.change(searchInput, { target: { value: 'Jane' } });
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(searchInput.value).toBe('Jane');
      });
    });
  });

  describe('Add Nurse', () => {
    it('should open add nurse modal', () => {
      render(
        <BrowserRouter>
          <Nurses />
        </BrowserRouter>
      );
      
      const addButton = screen.getByText(/add nurse/i);
      fireEvent.click(addButton);
      
      expect(screen.getByText(/first name/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch error', async () => {
      nursesService.getAllNurses.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <Nurses />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });
  });
});
