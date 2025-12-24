import React, { useState, useEffect } from 'react';
import { Users, Building2 } from 'lucide-react';
import { doctorsService } from '../../services/doctorsService';
import BaseUserModal from './BaseUserModal';
import PropTypes from 'prop-types';

/**
 * AddUrologistModal - Modal for adding a new urologist
 * Uses BaseUserModal to reduce code duplication
 */
const AddUrologistModal = ({ isOpen, onClose, onSuccess }) => {
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [initialFormData, setInitialFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await doctorsService.getAllDepartments({ is_active: true });
      if (response.success) {
        setDepartments(response.data);
        // Find urology department and pre-select
        const urologyDept = response.data.find(dept =>
          dept.name && dept.name.toLowerCase().trim() === 'urology'
        );
        if (urologyDept) {
          setInitialFormData(prev => ({ ...prev, department_id: urologyDept.id.toString() }));
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const renderExtraFields = ({ formData, errors, handleInputChange, handleBlur }) => (
    <div>
      <label htmlFor="department_id" className="block text-sm font-medium text-gray-700 mb-1">
        Department <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Building2 className="h-5 w-5 text-gray-400" />
        </div>
        <select
          id="department_id"
          name="department_id"
          value={formData.department_id}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 ${errors.department_id ? 'border-red-500' : 'border-gray-300'
            }`}
          disabled={loadingDepartments}
        >
          <option value="">Select department</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
      {errors.department_id && (
        <p className="mt-1 text-sm text-red-600">{errors.department_id}</p>
      )}
      {loadingDepartments && (
        <p className="mt-1 text-sm text-gray-500">Loading departments...</p>
      )}
    </div>
  );

  const handleSubmit = async (formData) => {
    const doctorData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      department_id: parseInt(formData.department_id)
    };
    return await doctorsService.createDoctor(doctorData);
  };

  return (
    <BaseUserModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Add New Urologist"
      icon={Users}
      submitService={handleSubmit}
      initialFormData={initialFormData}
      renderExtraFields={renderExtraFields}
      successTitle="Urologist Added Successfully"
      successMessage="The urologist has been added to the doctors table. A password setup email has been sent."
      errorTitle="Error Adding Urologist"
      submitButtonText="Add Urologist"
    />
  );
};

AddUrologistModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};

export default AddUrologistModal;
