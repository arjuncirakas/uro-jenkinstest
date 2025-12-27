/**
 * Tests for authSlice.js
 * Ensures 100% coverage including all reducers, thunks, and edge cases
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import authReducer, { loginUser, logoutUser, getProfile, clearError, setUser, clearAuth } from '../slices/authSlice';
import authService from '../../services/authService';

// Mock authService
vi.mock('../../services/authService', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn()
  }
}));

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialState', () => {
    it('should have correct initial state', () => {
      const state = authReducer(undefined, { type: 'unknown' });
      expect(state).toEqual(initialState);
    });
  });

  describe('reducers', () => {
    describe('clearError', () => {
      it('should clear error from state', () => {
        const state = authReducer(
          { ...initialState, error: 'Some error' },
          clearError()
        );
        expect(state.error).toBeNull();
      });

      it('should handle clearError when error is already null', () => {
        const state = authReducer(initialState, clearError());
        expect(state.error).toBeNull();
      });
    });

    describe('setUser', () => {
      it('should set user and mark as authenticated', () => {
        const user = { id: 1, email: 'test@example.com', name: 'Test User' };
        const state = authReducer(initialState, setUser(user));
        
        expect(state.user).toEqual(user);
        expect(state.isAuthenticated).toBe(true);
      });

      it('should handle null user', () => {
        const state = authReducer(initialState, setUser(null));
        
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });

      it('should handle undefined user', () => {
        const state = authReducer(initialState, setUser(undefined));
        
        expect(state.user).toBeUndefined();
        expect(state.isAuthenticated).toBe(false);
      });

      it('should handle empty object user', () => {
        const state = authReducer(initialState, setUser({}));
        
        expect(state.user).toEqual({});
        expect(state.isAuthenticated).toBe(true);
      });
    });

    describe('clearAuth', () => {
      it('should clear all auth state', () => {
        const state = authReducer(
          {
            user: { id: 1, name: 'Test' },
            isAuthenticated: true,
            isLoading: true,
            error: 'Some error'
          },
          clearAuth()
        );
        
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBeNull();
      });

      it('should handle clearAuth on already cleared state', () => {
        const state = authReducer(initialState, clearAuth());
        
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBeNull();
      });
    });
  });

  describe('loginUser thunk', () => {
    describe('pending', () => {
      it('should set loading to true and clear error', () => {
        const state = authReducer(
          { ...initialState, error: 'Previous error' },
          loginUser.pending()
        );
        
        expect(state.isLoading).toBe(true);
        expect(state.error).toBeNull();
      });
    });

    describe('fulfilled', () => {
      it('should set user and mark as authenticated when payload has data.user', () => {
        const user = { id: 1, email: 'test@example.com', name: 'Test User' };
        const action = {
          type: loginUser.fulfilled.type,
          payload: {
            success: true,
            data: { user }
          }
        };
        
        const state = authReducer(initialState, action);
        
        expect(state.isLoading).toBe(false);
        expect(state.user).toEqual(user);
        expect(state.isAuthenticated).toBe(true);
      });

      it('should handle fulfilled without data property', () => {
        const action = {
          type: loginUser.fulfilled.type,
          payload: { success: true }
        };
        
        const state = authReducer(initialState, action);
        
        expect(state.isLoading).toBe(false);
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });

      it('should handle fulfilled with null data', () => {
        const action = {
          type: loginUser.fulfilled.type,
          payload: { success: true, data: null }
        };
        
        const state = authReducer(initialState, action);
        
        expect(state.isLoading).toBe(false);
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });

      it('should handle fulfilled with data but no user', () => {
        const action = {
          type: loginUser.fulfilled.type,
          payload: { success: true, data: {} }
        };
        
        const state = authReducer(initialState, action);
        
        expect(state.isLoading).toBe(false);
        // When data exists but no user, state.user remains null (from initialState)
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
      });
    });

    describe('rejected', () => {
      it('should set error and stop loading', () => {
        const errorMessage = 'Login failed';
        const action = {
          type: loginUser.rejected.type,
          payload: errorMessage
        };
        
        const state = authReducer(
          { ...initialState, isLoading: true },
          action
        );
        
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe(errorMessage);
      });

      it('should handle rejected with null payload', () => {
        const action = {
          type: loginUser.rejected.type,
          payload: null
        };
        
        const state = authReducer(initialState, action);
        
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });
    });

    describe('async thunk execution', () => {
      it('should call authService.login with correct parameters and return response', async () => {
        const email = 'test@example.com';
        const password = 'password123';
        const mockResponse = {
          success: true,
          data: { user: { id: 1, email } }
        };
        
        authService.login.mockResolvedValue(mockResponse);
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = loginUser({ email, password });
        const result = await thunk(dispatch, getState, extra);
        
        expect(authService.login).toHaveBeenCalledWith(email, password);
        expect(result.type).toBe(loginUser.fulfilled.type);
        expect(result.payload).toEqual(mockResponse);
      });

      it('should handle login error', async () => {
        const error = new Error('Invalid credentials');
        authService.login.mockRejectedValue(error);
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = loginUser({ email: 'test@example.com', password: 'wrong' });
        const result = await thunk(dispatch, getState, extra);
        
        expect(result.type).toBe(loginUser.rejected.type);
        expect(result.payload).toBe('Invalid credentials');
      });

      it('should handle login error without message', async () => {
        const error = new Error();
        authService.login.mockRejectedValue(error);
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = loginUser({ email: 'test@example.com', password: 'wrong' });
        const result = await thunk(dispatch, getState, extra);
        
        expect(result.type).toBe(loginUser.rejected.type);
        expect(result.payload).toBe('Login failed');
      });
    });
  });

  describe('logoutUser thunk', () => {
    describe('fulfilled', () => {
      it('should clear user and authentication state', () => {
        const action = {
          type: logoutUser.fulfilled.type,
          payload: true
        };
        
        const state = authReducer(
          {
            user: { id: 1, name: 'Test' },
            isAuthenticated: true,
            isLoading: false,
            error: 'Some error'
          },
          action
        );
        
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.error).toBeNull();
      });
    });

    describe('async thunk execution', () => {
      it('should call authService.logout and return true', async () => {
        authService.logout.mockResolvedValue({});
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = logoutUser();
        const result = await thunk(dispatch, getState, extra);
        
        expect(authService.logout).toHaveBeenCalled();
        expect(result.type).toBe(logoutUser.fulfilled.type);
        expect(result.payload).toBe(true);
      });

      it('should handle logout error', async () => {
        const error = new Error('Logout failed');
        authService.logout.mockRejectedValue(error);
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = logoutUser();
        const result = await thunk(dispatch, getState, extra);
        
        expect(result.type).toBe(logoutUser.rejected.type);
        expect(result.payload).toBe('Logout failed');
      });

      it('should handle logout error without message', async () => {
        const error = new Error();
        authService.logout.mockRejectedValue(error);
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = logoutUser();
        const result = await thunk(dispatch, getState, extra);
        
        expect(result.type).toBe(logoutUser.rejected.type);
        // Error without message returns empty string, not undefined
        expect(result.payload).toBe('');
      });
    });
  });

  describe('getProfile thunk', () => {
    describe('pending', () => {
      it('should set loading to true', () => {
        const state = authReducer(initialState, getProfile.pending());
        
        expect(state.isLoading).toBe(true);
      });
    });

    describe('fulfilled', () => {
      it('should set user and mark as authenticated', () => {
        const user = { id: 1, email: 'test@example.com', name: 'Test User' };
        const action = {
          type: getProfile.fulfilled.type,
          payload: user
        };
        
        const state = authReducer(initialState, action);
        
        expect(state.isLoading).toBe(false);
        expect(state.user).toEqual(user);
        expect(state.isAuthenticated).toBe(true);
      });

      it('should handle null user', () => {
        const action = {
          type: getProfile.fulfilled.type,
          payload: null
        };
        
        const state = authReducer(initialState, action);
        
        expect(state.isLoading).toBe(false);
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(true);
      });
    });

    describe('rejected', () => {
      it('should set error and stop loading', () => {
        const errorMessage = 'Failed to get profile';
        const action = {
          type: getProfile.rejected.type,
          payload: errorMessage
        };
        
        const state = authReducer(
          { ...initialState, isLoading: true },
          action
        );
        
        expect(state.isLoading).toBe(false);
        expect(state.error).toBe(errorMessage);
      });
    });

    describe('async thunk execution', () => {
      it('should call authService.getProfile and return user', async () => {
        const user = { id: 1, email: 'test@example.com', name: 'Test User' };
        authService.getProfile.mockResolvedValue({ data: { user } });
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = getProfile();
        const result = await thunk(dispatch, getState, extra);
        
        expect(authService.getProfile).toHaveBeenCalled();
        expect(result.type).toBe(getProfile.fulfilled.type);
        expect(result.payload).toEqual(user);
      });

      it('should handle getProfile error', async () => {
        const error = new Error('Unauthorized');
        authService.getProfile.mockRejectedValue(error);
        
        const dispatch = vi.fn();
        const getState = vi.fn();
        const extra = {};
        const thunk = getProfile();
        const result = await thunk(dispatch, getState, extra);
        
        expect(result.type).toBe(getProfile.rejected.type);
        expect(result.payload).toBe('Unauthorized');
      });
    });
  });

  describe('action creators', () => {
    it('should export clearError action creator', () => {
      const action = clearError();
      expect(action.type).toBe('auth/clearError');
    });

    it('should export setUser action creator', () => {
      const user = { id: 1 };
      const action = setUser(user);
      expect(action.type).toBe('auth/setUser');
      expect(action.payload).toEqual(user);
    });

    it('should export clearAuth action creator', () => {
      const action = clearAuth();
      expect(action.type).toBe('auth/clearAuth');
    });
  });
});


