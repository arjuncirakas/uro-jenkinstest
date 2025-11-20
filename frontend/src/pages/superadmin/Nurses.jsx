import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, User, Search, Filter, Mail, Phone, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { nursesService } from '../../services/nursesService';
import SuccessModal from '../../components/SuccessModal';
import ConfirmModal from '../../components/ConfirmModal';
import { validatePhoneInput, validateNameInput, validateEmail } from '../../utils/inputValidation';

const Nurses = () => {
  const [allNurses, setAllNurses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [frontendPage, setFrontendPage] = useState(1);
  const [frontendPageSize] = useState(10);
  const searchTimeoutRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    is_active: true
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch nurses
  const fetchNurses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { is_active: true };
      
      const nursesResponse = await nursesService.getAllNurses(params);
      
      if (nursesResponse.success) {
        setAllNurses(nursesResponse.data || []);
      } else {
        setError(nursesResponse.error || nursesResponse.message || 'Failed to fetch nurses');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch nurses';
      setError(errorMessage);
      console.error('Error fetching nurses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load - fetch all nurses
  useEffect(() => {
    fetchNurses();
  }, []);

  // Debounced search - update searchValue after 300ms
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchValue(searchTerm);
      setFrontendPage(1); // Reset to page 1 when search changes
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Validate phone number (8-12 digits)
  const validatePhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 8) {
      return 'Phone number must be at least 8 digits';
    }
    if (cleaned.length > 12) {
      return 'Phone number must not exceed 12 digits';
    }
    return '';
  };

  // Validate field
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'first_name':
        if (!value || !value.trim()) {
          error = 'First name is required';
        } else if (!validateNameInput(value)) {
          error = 'First name can only contain letters, spaces, hyphens, apostrophes, and periods';
        }
        break;
      case 'last_name':
        if (!value || !value.trim()) {
          error = 'Last name is required';
        } else if (!validateNameInput(value)) {
          error = 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods';
        }
        break;
      case 'email':
        if (!value || !value.trim()) {
          error = 'Email is required';
        } else if (!validateEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (!value || !value.trim()) {
          error = 'Phone number is required';
        } else if (!validatePhoneInput(value)) {
          error = 'Phone number can only contain digits, spaces, hyphens, parentheses, and plus sign';
        } else {
          error = validatePhone(value);
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  // Handle form input changes with validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Block invalid characters for phone
    if (name === 'phone' && value && !validatePhoneInput(value)) {
      return;
    }
    
    // Block invalid characters for names
    if ((name === 'first_name' || name === 'last_name') && value && !validateNameInput(value)) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate field on change
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Handle field blur with validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Validate entire form
  const validateForm = () => {
    const errors = {};
    
    errors.first_name = validateField('first_name', formData.first_name);
    errors.last_name = validateField('last_name', formData.last_name);
    errors.email = validateField('email', formData.email);
    errors.phone = validateField('phone', formData.phone);
    
    setFormErrors(errors);
    
    // Check if there are any errors
    return !Object.values(errors).some(error => error !== '');
  };

  // Handle add nurse
  const handleAddNurse = async () => {
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    try {
      const response = await nursesService.createNurse(formData);
      
      if (response.success) {
        setSuccessMessage('Nurse added successfully');
        setShowSuccessModal(true);
        setShowAddModal(false);
        resetForm();
        fetchNurses();
      } else {
        setError(response.error || 'Failed to add nurse');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add nurse');
      console.error('Error adding nurse:', err);
    }
  };

  // Handle edit nurse
  const handleEditNurse = async () => {
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    if (!selectedNurse || !selectedNurse.id) {
      setError('Nurse information is missing');
      return;
    }

    try {
      const response = await nursesService.updateNurse(selectedNurse.id, formData);
      if (response.success) {
        setSuccessMessage('Nurse updated successfully');
        setShowSuccessModal(true);
        setShowEditModal(false);
        resetForm();
        setSelectedNurse(null);
        fetchNurses();
      } else {
        setError(response.error || 'Failed to update nurse');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update nurse');
      console.error('Error updating nurse:', err);
    }
  };

  // Handle delete nurse
  const handleDeleteNurse = async () => {
    try {
      const response = await nursesService.deleteNurse(selectedNurse.id);
      if (response.success) {
        setSuccessMessage('Nurse deleted successfully');
        setShowSuccessModal(true);
        setShowDeleteModal(false);
        setSelectedNurse(null);
        fetchNurses();
      } else {
        setError(response.error || 'Failed to delete nurse');
      }
    } catch (err) {
      setError('Failed to delete nurse');
      console.error('Error deleting nurse:', err);
    }
  };

  // Open edit modal
  const openEditModal = (nurse) => {
    setSelectedNurse(nurse);
    
    setFormData({
      first_name: nurse.first_name || '',
      last_name: nurse.last_name || '',
      email: nurse.email || '',
      phone: nurse.phone || '',
      organization: nurse.organization || '',
      is_active: nurse.is_active !== undefined ? nurse.is_active : true
    });
    setFormErrors({});
    setError(null);
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (nurse) => {
    setSelectedNurse(nurse);
    setShowDeleteModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      organization: '',
      is_active: true
    });
    setFormErrors({});
    setSelectedNurse(null);
    setError(null);
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    resetForm();
  };

  // Frontend filtering - only for search
  const filteredNurses = useMemo(() => {
    let filtered = [...allNurses];
    
    // Apply search filter - using "starts with" instead of "includes"
    if (searchValue && searchValue.trim() !== '') {
      const searchLower = searchValue.trim().toLowerCase();
      filtered = filtered.filter(nurse => {
        const firstName = (nurse.first_name || '').toLowerCase();
        const lastName = (nurse.last_name || '').toLowerCase();
        const fullName = `${firstName}${lastName}`.toLowerCase();
        const fullNameWithSpace = `${firstName} ${lastName}`.toLowerCase();
        const organization = (nurse.organization || '').toLowerCase();
        const email = (nurse.email || '').toLowerCase();
        
        return (
          firstName.startsWith(searchLower) ||
          fullName.startsWith(searchLower) ||
          fullNameWithSpace.startsWith(searchLower) ||
          organization.startsWith(searchLower) ||
          email.startsWith(searchLower)
        );
      });
    }
    
    return filtered;
  }, [allNurses, searchValue]);

  // Apply frontend pagination to filtered results
  const paginatedNurses = useMemo(() => {
    const startIndex = (frontendPage - 1) * frontendPageSize;
    const endIndex = startIndex + frontendPageSize;
    return filteredNurses.slice(startIndex, endIndex);
  }, [filteredNurses, frontendPage, frontendPageSize]);

  // Calculate pagination info
  const totalFilteredNurses = filteredNurses.length;
  const totalFrontendPages = Math.ceil(totalFilteredNurses / frontendPageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nurses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage hospital nurses and medical staff
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Nurse
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search nurses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Filter className="h-4 w-4 mr-1" />
            {filteredNurses.length} of {allNurses.length} nurses
          </div>
        </div>
      </div>

      {/* Nurses List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-gray-600">Loading nurses...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-4">Unable to load nurses</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchNurses}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Retry
            </button>
          </div>
        ) : filteredNurses.length > 0 ? (
          <>
            <ul className="divide-y divide-gray-200">
              {paginatedNurses.map((nurse) => (
              <li key={nurse.id}>
                <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
                        <User className="h-5 w-5 text-teal-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {nurse.first_name} {nurse.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {nurse.organization || 'No organization'}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        {nurse.email && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="h-3 w-3 mr-1" />
                            {nurse.email}
                          </div>
                        )}
                        {nurse.phone && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {nurse.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(nurse)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                      title="Edit nurse"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(nurse)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded"
                      title="Delete nurse"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
              ))}
            </ul>
            {/* Pagination Controls */}
            {totalFrontendPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                        {Math.min(frontendPage * frontendPageSize, totalFilteredNurses)}
                      </span>{' '}
                      of <span className="font-medium">{totalFilteredNurses}</span> results
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
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Page {frontendPage} of {totalFrontendPages}
                      </span>
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
          </>
        ) : (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No nurses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new nurse.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Nurse
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Nurse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Nurse</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    required
                    placeholder="Jane"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    required
                    placeholder="Doe"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  placeholder="Hospital Name (Optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  placeholder="jane.doe@hospital.com"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  placeholder="8889876545 (8-12 digits)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    formErrors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNurse}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || Object.values(formErrors).some(error => error !== '')}
              >
                {loading ? 'Adding...' : 'Add Nurse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Nurse Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Nurse</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    required
                    placeholder="Jane"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    required
                    placeholder="Doe"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  placeholder="Hospital Name (Optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  placeholder="jane.doe@hospital.com"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  required
                  placeholder="8889876545 (8-12 digits)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    formErrors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditNurse}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || Object.values(formErrors).some(error => error !== '')}
              >
                {loading ? 'Updating...' : 'Update Nurse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteNurse}
        onCancel={() => setShowDeleteModal(false)}
        title="Delete Nurse"
        message={`Are you sure you want to delete "${selectedNurse?.first_name} ${selectedNurse?.last_name}"? This action cannot be undone.`}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          // Refresh data when modal closes as backup
          fetchNurses();
        }}
        title="Success"
        message={successMessage}
      />
    </div>
  );
};

export default Nurses;

