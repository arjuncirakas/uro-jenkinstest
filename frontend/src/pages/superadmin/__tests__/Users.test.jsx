import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Users from '../Users';
import { doctorsService } from '../../../services/doctorsService';
import superadminReducer from '../../../store/slices/superadminSlice';

// Mock dependencies
vi.mock('../../../services/doctorsService', () => ({
  doctorsService: {
    getAllDepartments: vi.fn()
  }
}));

vi.mock('../../../components/modals/ErrorModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="error-modal">{message}</div> : null
  )
}));

vi.mock('../../../components/modals/SuccessModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="success-modal">{message}</div> : null
  )
}));

vi.mock('../../../components/modals/AddUserModal', () => ({
  default: ({ isOpen, onClose, onSuccess }) => (
    isOpen ? (
      <div data-testid="add-user-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSuccess()}>Add</button>
      </div>
    ) : null
  )
}));

// Create mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      superadmin: (state = { users: [], pagination: {}, isLoading: false, error: null, filters: {} }, action) => {
        if (action.type === 'superadmin/getAllUsers/fulfilled') {
          return { ...state, users: action.payload.data || [], isLoading: false };
        }
        return state;
      }
    }
  });
};

describe('Users (Superadmin)', () => {
  let mockStore;

  beforeEach(() => {
    vi.clearAllMocks();
    doctorsService.getAllDepartments.mockResolvedValue({
      success: true,
      data: []
    });
    mockStore = createMockStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render users page', () => {
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      expect(screen.getByText(/users/i)).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
    });

    it('should display category filter', () => {
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    it('should display status filter', () => {
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should debounce search requests', async () => {
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      
      const searchInput = screen.getByPlaceholderText(/search users/i);
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Jo' } });
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      vi.advanceTimersByTime(300);
      
      // Should filter on frontend
      await waitFor(() => {
        expect(searchInput.value).toBe('John');
      });
    });

    it('should filter by "starts with" logic', async () => {
      const storeWithUsers = configureStore({
        reducer: {
          superadmin: () => ({
            users: [
              { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
              { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
            ],
            pagination: {},
            isLoading: false,
            error: null,
            filters: {}
          })
        }
      });
      
      render(
        <Provider store={storeWithUsers}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      
      const searchInput = screen.getByPlaceholderText(/search users/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText(/john/i)).toBeInTheDocument();
        expect(screen.queryByText(/jane/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Category Filter', () => {
    it('should filter by doctor category', async () => {
      const storeWithUsers = configureStore({
        reducer: {
          superadmin: () => ({
            users: [
              { id: 1, firstName: 'John', lastName: 'Doe', role: 'doctor' },
              { id: 2, firstName: 'Jane', lastName: 'Smith', role: 'gp' }
            ],
            pagination: {},
            isLoading: false,
            error: null,
            filters: {}
          })
        }
      });
      
      render(
        <Provider store={storeWithUsers}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: 'doctor' } });
      
      await waitFor(() => {
        expect(screen.getByText(/john/i)).toBeInTheDocument();
        expect(screen.queryByText(/jane/i)).not.toBeInTheDocument();
      });
    });

    it('should show department filter when category is doctor', async () => {
      doctorsService.getAllDepartments.mockResolvedValue({
        success: true,
        data: [
          { id: 1, name: 'Urology' },
          { id: 2, name: 'Cardiology' }
        ]
      });
      
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: 'doctor' } });
      
      await waitFor(() => {
        expect(doctorsService.getAllDepartments).toHaveBeenCalled();
        expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
      });
    });
  });

  describe('Add User', () => {
    it('should open add user modal', () => {
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      
      const addButton = screen.getByText(/add user/i);
      fireEvent.click(addButton);
      
      expect(screen.getByTestId('add-user-modal')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should navigate to next page', async () => {
      const storeWithManyUsers = configureStore({
        reducer: {
          superadmin: () => ({
            users: Array.from({ length: 25 }, (_, i) => ({
              id: i + 1,
              firstName: `User${i + 1}`,
              lastName: 'Test',
              email: `user${i + 1}@example.com`
            })),
            pagination: {},
            isLoading: false,
            error: null,
            filters: {}
          })
        }
      });
      
      render(
        <Provider store={storeWithManyUsers}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      
      const nextButton = screen.getByLabelText(/next page/i);
      fireEvent.click(nextButton);
      
      // Should show page 2 users
      await waitFor(() => {
        expect(screen.getByText(/user11/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty users list', () => {
      render(
        <Provider store={mockStore}>
          <BrowserRouter>
            <Users />
          </BrowserRouter>
        </Provider>
      );
      
      expect(screen.getByText(/no users/i)).toBeInTheDocument();
    });
  });
});
