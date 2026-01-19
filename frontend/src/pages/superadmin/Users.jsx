import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  UserPlus,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getAllUsers, deleteUser, resendPasswordSetup, setFilters, clearFilters, clearError } from '../../store/slices/superadminSlice';
import { doctorsService } from '../../services/doctorsService';
import ErrorModal from '../../components/modals/ErrorModal';
import SuccessModal from '../../components/modals/SuccessModal';
import AddUserModal from '../../components/modals/AddUserModal';
import ViewUserModal from '../../components/modals/ViewUserModal';
import { Building2 } from 'lucide-react';

const Users = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { users: allUsers, pagination, isLoading, error, filters } = useAppSelector((state) => state.superadmin);

  // State declarations - must be before useMemo
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resendingUserId, setResendingUserId] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const searchTimeoutRef = useRef(null);
  const [frontendPage, setFrontendPage] = useState(1);
  const [frontendPageSize] = useState(10);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(filters.department_id || '');
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showViewUserModal, setShowViewUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Fetch departments when category is doctor
  useEffect(() => {
    if (filters.category === 'doctor') {
      const fetchDepartments = async () => {
        setLoadingDepartments(true);
        try {
          const response = await doctorsService.getAllDepartments({ is_active: true });
          if (response.success) {
            setDepartments(response.data);
          }
        } catch (err) {
          console.error('Error fetching departments:', err);
        } finally {
          setLoadingDepartments(false);
        }
      };
      fetchDepartments();
    } else {
      // Clear department selection when category is not doctor
      setSelectedDepartment('');
      dispatch(setFilters({ department_id: '' }));
    }
  }, [filters.category, dispatch]);

  // Frontend filtering as fallback - ALWAYS applied to ensure correct filtering
  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers];

    // Apply status filter on frontend as fallback
    if (filters.status && filters.status.trim() !== '' && filters.status.trim() !== 'all') {
      const statusFilter = filters.status.trim().toLowerCase();
      filtered = filtered.filter(user => {
        const userStatus = user.isVerified ? (user.isActive ? 'active' : 'inactive') : 'pending';
        return userStatus === statusFilter;
      });
    } else {
      // When no status filter is set, exclude inactive users by default
      // This ensures soft-deleted users (is_active = false) don't appear in the list
      filtered = filtered.filter(user => {
        // Include pending users (not verified) and active users (verified and active)
        // Exclude inactive users (verified but not active) - these are soft-deleted
        if (!user.isVerified) {
          return true; // Include pending users
        }
        return user.isActive === true; // Only include active users, exclude inactive (soft-deleted)
      });
    }

    // Apply category filter on frontend as fallback
    if (filters.category && filters.category.trim() !== '') {
      const categoryFilter = filters.category.trim().toLowerCase();
      filtered = filtered.filter(user => {
        // Map user role to category
        const userCategory = user.role === 'doctor' || user.role === 'urologist' ? 'doctor' :
          user.role === 'urology_nurse' ? 'nurse' :
            user.role === 'gp' ? 'gp' : null;
        return userCategory === categoryFilter;
      });
    }

    // Apply department filter when category is doctor
    if (filters.category === 'doctor' && selectedDepartment && selectedDepartment.trim() !== '') {
      filtered = filtered.filter(user => {
        // Filter by department_id if available in user data
        // The backend should now include department_name, but we filter by department_id from Redux
        // For now, we'll rely on backend filtering, but this is a fallback
        return true; // Backend handles the filtering
      });
    }

    // Apply search filter on frontend - ALWAYS use "starts with" (NOT includes)
    if (searchValue && searchValue.trim() !== '') {
      const searchLower = searchValue.trim().toLowerCase();
      const beforeCount = filtered.length;
      filtered = filtered.filter(user => {
        const email = (user.email || '').toLowerCase();
        const firstName = (user.firstName || '').toLowerCase().trim();
        const lastName = (user.lastName || '').toLowerCase().trim();
        // Merge first name and last name together and check if it starts with search term
        const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
        // Also check without space (in case user types "peterparker")
        const fullNameNoSpace = `${firstName}${lastName}`.toLowerCase();

        // STRICT "starts with" logic - check merged first+last name, first name, and email
        // Priority: 
        // 1. Full name (first + last merged) starts with search term
        // 2. First name starts with search term
        // 3. Email starts with search term
        const matchesFullName = fullName.startsWith(searchLower);
        const matchesFullNameNoSpace = fullNameNoSpace.startsWith(searchLower);
        const matchesFirstName = firstName.startsWith(searchLower);
        const matchesEmail = email.startsWith(searchLower);

        const matches = matchesFullName || matchesFullNameNoSpace || matchesFirstName || matchesEmail;
        return matches;
      });
    }

    return filtered;
  }, [allUsers, filters.status, filters.category, searchValue, selectedDepartment]);

  // Apply frontend pagination to filtered results
  const paginatedUsers = useMemo(() => {
    const startIndex = (frontendPage - 1) * frontendPageSize;
    const endIndex = startIndex + frontendPageSize;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, frontendPage, frontendPageSize]);

  // Calculate pagination info
  const totalFilteredUsers = filteredUsers.length;
  const totalFrontendPages = Math.ceil(totalFilteredUsers / frontendPageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setFrontendPage(1);
  }, [filters.status, filters.category, searchValue, selectedDepartment]);

  // Sync searchValue with filters when filters change externally (e.g., clear filters)
  useEffect(() => {
    if (filters.search === '' && searchValue !== '') {
      setSearchValue('');
    }
  }, [filters.search]);

  // Load ALL users on component mount for frontend filtering (don't rely on backend search)
  useEffect(() => {
    setIsInitialLoad(true);

    // Load ALL users without search filter - we'll do filtering on frontend
    const initialFilters = {
      page: 1,
      limit: 10000 // Load a very large number to get all users
    };

    // Only add category and status filters (not search - we filter that on frontend)
    if (filters.category && filters.category.trim() !== '') {
      initialFilters.category = filters.category.trim();
    }
    if (filters.status && filters.status.trim() !== '' && filters.status.trim() !== 'all') {
      initialFilters.status = filters.status.trim().toLowerCase();
    }
    if (filters.department_id && filters.department_id.trim() !== '') {
      initialFilters.department_id = filters.department_id.trim();
      setSelectedDepartment(filters.department_id.trim());
    }

    setSearchValue(filters.search || '');
    dispatch(getAllUsers(initialFilters)).finally(() => {
      setIsInitialLoad(false);
    });
  }, [dispatch]);

  // Handle error modal
  useEffect(() => {
    if (error) {
      const message = typeof error === 'string' ? error : (error?.message || 'An error occurred. Please try again.');
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  }, [error]);

  // Get general role term for the column - properly distinguish between doctor and urologist
  const getGeneralRole = (role) => {
    const roleMap = {
      'urologist': 'Urologist',
      'doctor': 'Doctor',
      'gp': 'General Practitioner',
      'urology_nurse': 'Urology Nurse'
    };
    return roleMap[role] || role;
  };

  // Get specific role name for the tag (only for doctors)
  const getSpecificRoleName = (role) => {
    const roleMap = {
      'urologist': 'Urologist',
      'doctor': 'Doctor'
    };
    return roleMap[role] || role;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return CheckCircle;
      case 'inactive':
        return XCircle;
      case 'pending':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewUserModal(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      const userName = `${userToDelete.firstName} ${userToDelete.lastName}`;
      setShowDeleteModal(false);

      try {
        // Use the unified deleteUser endpoint which handles both users and doctors
        // The backend automatically detects if it's a doctor (ID > 1000000) or regular user
        const deleteResult = await dispatch(deleteUser(userToDelete.id));

        if (deleteResult.type.endsWith('/fulfilled')) {
          // Success - reload users with current filters and wait for completion
          const currentFilters = {
            page: 1,
            limit: 10000
          };
          if (filters.category && filters.category.trim() !== '') {
            currentFilters.category = filters.category.trim();
          }
          if (filters.status && filters.status.trim() !== '' && filters.status.trim() !== 'all') {
            currentFilters.status = filters.status.trim().toLowerCase();
          }
          if (filters.department_id && filters.department_id.trim() !== '') {
            currentFilters.department_id = filters.department_id.trim();
          }

          // Wait for the reload to complete before showing success
          try {
            const reloadResult = await dispatch(getAllUsers(currentFilters));

            // Check if reload was successful
            if (reloadResult.type.endsWith('/fulfilled')) {
              // Show success modal after reload completes
              setSuccessMessage(`User ${userName} has been deleted successfully.`);
              setShowSuccessModal(true);
              setUserToDelete(null);
            } else {
              // Reload failed but deletion succeeded
              console.error('Error reloading users after deletion:', reloadResult);
              setSuccessMessage(`User ${userName} has been deleted successfully.`);
              setShowSuccessModal(true);
              setUserToDelete(null);

              // Try to reload again
              dispatch(getAllUsers(currentFilters));
            }
          } catch (reloadError) {
            // Even if reload fails, show success (deletion was successful)
            console.error('Error reloading users after deletion:', reloadError);
            setSuccessMessage(`User ${userName} has been deleted successfully.`);
            setShowSuccessModal(true);
            setUserToDelete(null);

            // Try to reload again silently
            dispatch(getAllUsers(currentFilters));
          }
        } else {
          // Failure - show error modal
          const deleteError = deleteResult.payload || deleteResult.error || 'Failed to delete user. Please try again.';
          const message = typeof deleteError === 'string' ? deleteError : (deleteError?.message || 'Failed to delete user. Please try again.');
          setErrorMessage(message);
          setShowErrorModal(true);
          setUserToDelete(null);
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        const message = error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          error?.toString() ||
          'An unexpected error occurred while deleting the user. Please try again.';
        setErrorMessage(message);
        setShowErrorModal(true);
        setUserToDelete(null);
      }
    }
  };

  const handleResendPasswordSetup = async (user) => {
    setResendingUserId(user.id);

    try {
      const result = await dispatch(resendPasswordSetup(user.id));

      if (result.type.endsWith('/fulfilled')) {
        setSuccessMessage(`Password setup email has been resent successfully to ${user.email}`);
        setShowSuccessModal(true);
      } else {
        const resendError = result.payload || result.error || 'Failed to resend password setup email. Please try again.';
        const message = typeof resendError === 'string' ? resendError : (resendError?.message || 'Failed to resend password setup email. Please try again.');
        setErrorMessage(message);
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error resending password setup:', error);
      const message = error?.message || error?.toString() || 'An unexpected error occurred while resending the password setup email. Please try again.';
      setErrorMessage(message);
      setShowErrorModal(true);
    } finally {
      setResendingUserId(null);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  // Frontend-only search - no backend calls for search, just update filter state
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only update filter state - frontend filtering will handle the rest
    if (!isInitialLoad) {
      searchTimeoutRef.current = setTimeout(() => {
        dispatch(setFilters({ search: searchValue }));
      }, 300); // 300ms debounce for faster response
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue, isInitialLoad, dispatch]);

  const handleFilterChange = useCallback((filterType, value) => {
    const cleanValue = value ? String(value).trim() : '';

    // For search, update local state only - frontend filtering handles the rest
    if (filterType === 'search') {
      setSearchValue(cleanValue);
      dispatch(setFilters({ [filterType]: cleanValue }));
      return;
    }

    // If category changes, clear department filter if not doctor
    if (filterType === 'category' && cleanValue !== 'doctor') {
      setSelectedDepartment('');
      dispatch(setFilters({ department_id: '' }));
    }

    // For category and status, reload users from backend (but load all, frontend will filter)
    const newFilters = {
      page: 1,
      limit: 10000 // Load all users, frontend will filter
    };

    // Add category filter
    if (filterType === 'category') {
      if (cleanValue) newFilters.category = cleanValue;
    } else if (filters.category && filters.category.trim() !== '') {
      newFilters.category = filters.category.trim();
    }

    // Add department filter when category is doctor
    if (filterType === 'department_id') {
      if (cleanValue) {
        newFilters.department_id = cleanValue;
        setSelectedDepartment(cleanValue);
      } else {
        setSelectedDepartment('');
      }
    } else if (filters.category === 'doctor' && selectedDepartment) {
      newFilters.department_id = selectedDepartment;
    }

    // Add status filter - CRITICAL: Use the new value directly, not from Redux state
    if (filterType === 'status') {
      if (cleanValue && cleanValue !== 'all') {
        newFilters.status = cleanValue.toLowerCase();
      }
    } else if (filters.status && filters.status.trim() !== '' && filters.status.trim() !== 'all') {
      newFilters.status = filters.status.trim().toLowerCase();
    }

    // Don't add search to backend filters - frontend handles search
    // searchValue is handled separately by frontend filtering

    // Update the filter in the Redux store
    if (filterType === 'department_id') {
      dispatch(setFilters({ department_id: cleanValue }));
    } else {
      dispatch(setFilters({ [filterType]: cleanValue }));
    }

    // Refetch users with new filters (without showing full-page loader)
    dispatch(getAllUsers(newFilters));
  }, [dispatch, filters, selectedDepartment]);

  const handleClearFilters = useCallback(() => {
    dispatch(clearFilters());
    setSearchValue('');
    setSelectedDepartment('');
    // Reload all users (frontend will handle filtering)
    dispatch(getAllUsers({
      page: 1,
      limit: 10000,
      category: '',
      status: ''
      // Don't send search - frontend handles it
    }));
  }, [dispatch]);

  // Only show full-page loader on initial load
  if (isLoading && isInitialLoad) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-2 sm:p-3 lg:p-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-gray-600">Loading users...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto w-full">
      {/* Main Content Area - Full Width */}
      <div className="w-full p-2 sm:p-3 lg:p-4">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-500 text-sm mt-1">Manage all system users and their accounts</p>
              </div>
            </div>
          </div>

          {/* Add User Button */}
          <div className="w-full lg:w-auto">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="w-full lg:w-auto inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add New User
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 text-teal-600 mr-2" />
              Filters
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${filters.category === 'doctor' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    placeholder="Search users..."
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Categories</option>
                  <option value="gp">General Practitioner</option>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Urologist</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Users ({totalFilteredUsers})
            </h3>
            {isLoading && !isInitialLoad && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Filtering...</span>
              </div>
            )}
          </div>

          {paginatedUsers.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUsers.map((user) => {
                    const StatusIcon = getStatusIcon(user.status);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <UserPlus className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                {/* Department Tag (for doctors and urologists) */}
                                {null}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {getGeneralRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewUser(user)}
                              className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View User Details"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              <span className="text-xs font-medium">View</span>
                            </button>
                            <button
                              onClick={() => handleResendPasswordSetup(user)}
                              disabled={resendingUserId === user.id}
                              className="inline-flex items-center px-3 py-1.5 text-teal-600 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Resend Password Setup Email"
                            >
                              {resendingUserId === user.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                  <span className="text-xs font-medium">Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Mail className="h-4 w-4 mr-1.5" />
                                  <span className="text-xs font-medium">Resend Mail</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4 mr-1.5" />
                              <span className="text-xs font-medium">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Frontend Pagination Controls */}
          {totalFrontendPages > 1 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setFrontendPage(prev => Math.max(1, prev - 1))}
                  disabled={frontendPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFrontendPage(prev => Math.min(totalFrontendPages, prev + 1))}
                  disabled={frontendPage === totalFrontendPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(frontendPage - 1) * frontendPageSize + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(frontendPage * frontendPageSize, totalFilteredUsers)}
                    </span>{' '}
                    of <span className="font-medium">{totalFilteredUsers}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setFrontendPage(prev => Math.max(1, prev - 1))}
                      disabled={frontendPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {Array.from({ length: totalFrontendPages }, (_, i) => i + 1).map((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        pageNum === 1 ||
                        pageNum === totalFrontendPages ||
                        (pageNum >= frontendPage - 1 && pageNum <= frontendPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setFrontendPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${frontendPage === pageNum
                              ? 'z-10 bg-teal-50 border-teal-500 text-teal-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (pageNum === frontendPage - 2 || pageNum === frontendPage + 2) {
                        return (
                          <span
                            key={pageNum}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => setFrontendPage(prev => Math.min(totalFrontendPages, prev + 1))}
                      disabled={frontendPage === totalFrontendPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete User
                  </h3>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                Are you sure you want to delete <strong>{userToDelete.firstName} {userToDelete.lastName}</strong>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        title="Success!"
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage('');
          dispatch(clearError());
        }}
        message={errorMessage || (typeof error === 'string' ? error : error?.message) || 'An error occurred. Please try again.'}
        title="Error"
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={() => {
          // Reload users with current filters
          const currentFilters = {
            page: 1,
            limit: 10000
          };
          if (filters.category && filters.category.trim() !== '') {
            currentFilters.category = filters.category.trim();
          }
          if (filters.status && filters.status.trim() !== '' && filters.status.trim() !== 'all') {
            currentFilters.status = filters.status.trim().toLowerCase();
          }
          if (filters.department_id && filters.department_id.trim() !== '') {
            currentFilters.department_id = filters.department_id.trim();
          }
          dispatch(getAllUsers(currentFilters));
        }}
      />

      {/* View User Modal */}
      <ViewUserModal
        isOpen={showViewUserModal}
        onClose={() => {
          setShowViewUserModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div>
  );
};

export default Users;