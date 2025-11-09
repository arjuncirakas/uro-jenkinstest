import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Search, Filter } from 'lucide-react';
import { doctorsService } from '../../services/doctorsService';
import SuccessModal from '../../components/SuccessModal';
import ConfirmModal from '../../components/ConfirmModal';

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    description: ''
  });
  const [touched, setTouched] = useState({
    name: false,
    description: false
  });

  // Fetch departments
  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await doctorsService.getAllDepartments({ is_active: true });
      if (response.success) {
        setDepartments(response.data);
      } else {
        setError('Failed to fetch departments');
      }
    } catch (err) {
      setError('Failed to fetch departments');
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Validation functions
  const validateName = (name) => {
    if (!name || !name.trim()) {
      return 'Department name is required';
    }
    if (name.trim().length < 2) {
      return 'Department name must be at least 2 characters';
    }
    if (name.trim().length > 100) {
      return 'Department name must not exceed 100 characters';
    }
    // Check for special characters (allow letters, numbers, spaces, hyphens, and apostrophes)
    const nameRegex = /^[a-zA-Z0-9\s\-']+$/;
    if (!nameRegex.test(name.trim())) {
      return 'Department name can only contain letters, numbers, spaces, hyphens, and apostrophes';
    }
    return '';
  };

  const validateDescription = (description) => {
    if (description && description.length > 500) {
      return 'Description must not exceed 500 characters';
    }
    return '';
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {
      name: validateName(formData.name),
      description: validateDescription(formData.description)
    };
    setErrors(newErrors);
    return !newErrors.name && !newErrors.description;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate on change if field has been touched
    if (touched[name]) {
      if (name === 'name') {
        setErrors(prev => ({
          ...prev,
          name: validateName(value)
        }));
      } else if (name === 'description') {
        setErrors(prev => ({
          ...prev,
          description: validateDescription(value)
        }));
      }
    }
  };

  // Handle field blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate on blur
    if (name === 'name') {
      setErrors(prev => ({
        ...prev,
        name: validateName(value)
      }));
    } else if (name === 'description') {
      setErrors(prev => ({
        ...prev,
        description: validateDescription(value)
      }));
    }
  };

  // Handle add department
  const handleAddDepartment = async () => {
    // Mark all fields as touched
    setTouched({
      name: true,
      description: true
    });

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setError(null);

    try {
      const response = await doctorsService.createDepartment(formData);
      if (response.success) {
        setSuccessMessage('Department created successfully');
        setShowSuccessModal(true);
        setShowAddModal(false);
        setFormData({ name: '', description: '' });
        setErrors({ name: '', description: '' });
        setTouched({ name: false, description: false });
        setError(null);
        fetchDepartments();
      } else {
        setError(response.error || response.message || 'Failed to create department');
      }
    } catch (err) {
      // Handle error response from API
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to create department';
      setError(errorMessage);
      console.error('Error creating department:', err);
    }
  };

  // Handle edit department
  const handleEditDepartment = async () => {
    // Mark all fields as touched
    setTouched({
      name: true,
      description: true
    });

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    setError(null);

    try {
      const response = await doctorsService.updateDepartment(selectedDepartment.id, formData);
      if (response.success) {
        setSuccessMessage('Department updated successfully');
        setShowSuccessModal(true);
        setShowEditModal(false);
        setFormData({ name: '', description: '' });
        setErrors({ name: '', description: '' });
        setTouched({ name: false, description: false });
        setSelectedDepartment(null);
        fetchDepartments();
      } else {
        setError(response.error || 'Failed to update department');
      }
    } catch (err) {
      setError('Failed to update department');
      console.error('Error updating department:', err);
    }
  };

  // Handle delete department
  const handleDeleteDepartment = async () => {
    try {
      const response = await doctorsService.deleteDepartment(selectedDepartment.id);
      if (response.success) {
        setSuccessMessage('Department deleted successfully');
        setShowSuccessModal(true);
        setShowDeleteModal(false);
        setSelectedDepartment(null);
        fetchDepartments();
      } else {
        setError(response.error || 'Failed to delete department');
      }
    } catch (err) {
      setError('Failed to delete department');
      console.error('Error deleting department:', err);
    }
  };

  // Open edit modal
  const openEditModal = (department) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || ''
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (department) => {
    setSelectedDepartment(department);
    setShowDeleteModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setErrors({ name: '', description: '' });
    setTouched({ name: false, description: false });
    setSelectedDepartment(null);
    setError(null);
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setError(null);
    resetForm();
  };

  // Filter departments based on search term - using "starts with" instead of "includes"
  const filteredDepartments = departments.filter(dept => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.trim().toLowerCase();
    const name = (dept.name || '').toLowerCase();
    const description = (dept.description || '').toLowerCase();
    
    // Match if name or description starts with search term
    return name.startsWith(searchLower) || description.startsWith(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage hospital departments and specializations
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Department
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
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Filter className="h-4 w-4 mr-1" />
            {filteredDepartments.length} of {departments.length} departments
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <button
                  onClick={() => setError(null)}
                  className="bg-red-100 px-2 py-1 rounded text-sm text-red-800 hover:bg-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Departments List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        ) : filteredDepartments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredDepartments.map((department) => (
              <li key={department.id}>
                <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-teal-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {department.name}
                      </div>
                      {department.description && (
                        <div className="text-sm text-gray-500">
                          {department.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(department)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                      title="Edit department"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(department)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded"
                      title="Delete department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No departments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new department.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => {
            setError(null);
            setShowAddModal(true);
          }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Department</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="add-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  id="add-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="e.g., Cardiology"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    touched.name && errors.name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-teal-500 focus:border-transparent'
                  }`}
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
                {touched.name && !errors.name && formData.name && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.name.trim().length}/100 characters
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="add-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="add-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Brief description of the department..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    touched.description && errors.description
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-teal-500 focus:border-transparent'
                  }`}
                />
                {touched.description && errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
                {touched.description && !errors.description && formData.description && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length}/500 characters
                  </p>
                )}
              </div>
              
              {/* Error Message Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {error}
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDepartment}
                disabled={touched.name && errors.name ? true : false}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${
                  touched.name && errors.name
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                Add Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Department</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="e.g., Cardiology"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    touched.name && errors.name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-teal-500 focus:border-transparent'
                  }`}
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
                {touched.name && !errors.name && formData.name && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.name.trim().length}/100 characters
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  placeholder="Brief description of the department..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    touched.description && errors.description
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-teal-500 focus:border-transparent'
                  }`}
                />
                {touched.description && errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
                {touched.description && !errors.description && formData.description && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length}/500 characters
                  </p>
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
                onClick={handleEditDepartment}
                disabled={touched.name && errors.name ? true : false}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md ${
                  touched.name && errors.name
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                Update Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteDepartment}
        onCancel={() => setShowDeleteModal(false)}
        title="Delete Department"
        message={`Are you sure you want to delete "${selectedDepartment?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        showSaveButton={false}
        isDeleteModal={true}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        message={successMessage}
      />
    </div>
  );
};

export default Departments;
