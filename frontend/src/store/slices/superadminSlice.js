import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import superadminService from '../../services/superadminService';

// Async thunks
export const getDashboardStats = createAsyncThunk(
  'superadmin/getDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await superadminService.getDashboardStats();
      return response; // Service already returns response.data from axios
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load dashboard stats');
    }
  }
);

export const getAllUsers = createAsyncThunk(
  'superadmin/getAllUsers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await superadminService.getAllUsers(params);
      return response; // Service already returns response.data from axios
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createUser = createAsyncThunk(
  'superadmin/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await superadminService.createUser(userData);
      return response; // Service already returns response.data from axios
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateUser = createAsyncThunk(
  'superadmin/updateUser',
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await superadminService.updateUser(id, userData);
      return response; // Service already returns response.data from axios
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'superadmin/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await superadminService.deleteUser(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const resendPasswordSetup = createAsyncThunk(
  'superadmin/resendPasswordSetup',
  async (id, { rejectWithValue }) => {
    try {
      const response = await superadminService.resendPasswordSetup(id);
      return response; // Service already returns response.data from axios
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  // Dashboard stats
  stats: {
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    recentUsers: []
  },
  
  // Users management
  users: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10
  },
  
  // UI state
  isLoading: false,
  error: null,
  
  // Filters
  filters: {
    search: '',
    role: '',
    status: '',
    department_id: ''
  }
};

const superadminSlice = createSlice({
  name: 'superadmin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        role: '',
        status: '',
        department_id: ''
      };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Dashboard Stats
      .addCase(getDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        const data = action.payload.data || action.payload;
        // Transform snake_case to camelCase for recent users
        if (data.recentUsers) {
          data.recentUsers = data.recentUsers.map(user => ({
            ...user,
            createdAt: user.createdAt || user.created_at
          }));
        }
        state.stats = data;
      })
      .addCase(getDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Get All Users
      .addCase(getAllUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload.data || action.payload;
        // Transform snake_case to camelCase
        state.users = payload.users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          organization: user.organization,
          role: user.role,
          isActive: user.is_active,
          isVerified: user.is_verified,
          status: user.is_verified ? (user.is_active ? 'active' : 'inactive') : 'pending',
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        }));
        state.pagination = payload.pagination;
      })
      .addCase(getAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Create User
      .addCase(createUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // Only add user if the API call was successful
        if (action.payload.success && action.payload.data) {
          const newUser = {
            id: action.payload.data.userId,
            firstName: action.payload.data.firstName,
            lastName: action.payload.data.lastName,
            email: action.payload.data.email,
            role: action.payload.data.role,
            status: 'pending',
            is_verified: false
          };
          state.users.unshift(newUser);
          state.stats.totalUsers += 1;
          state.stats.pendingUsers += 1;
        }
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload.data || action.payload;
        const index = state.users.findIndex(user => user.id === payload.id);
        if (index !== -1) {
          state.users[index] = payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.filter(user => user.id !== action.payload);
        state.stats.totalUsers -= 1;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Resend Password Setup
      // Note: We don't set isLoading here to avoid showing full-page loader
      // Loading state is handled locally in the component with resendingUserId
      .addCase(resendPasswordSetup.pending, (state) => {
        state.error = null;
      })
      .addCase(resendPasswordSetup.fulfilled, (state) => {
        // No state changes needed - component handles success locally
      })
      .addCase(resendPasswordSetup.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearError, setFilters, clearFilters, setPagination } = superadminSlice.actions;
export default superadminSlice.reducer;
