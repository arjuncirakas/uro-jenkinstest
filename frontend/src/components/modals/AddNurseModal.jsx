import React from 'react';
import { Stethoscope, Building2 } from 'lucide-react';
import { nursesService } from '../../services/nursesService';
import BaseUserModal from './BaseUserModal';
import PropTypes from 'prop-types';

/**
 * AddNurseModal - Modal for adding a new nurse
 * Uses BaseUserModal to reduce code duplication
 */
const AddNurseModal = ({ isOpen, onClose, onSuccess }) => {
  const initialFormData = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: ''
  };

  const renderExtraFields = ({ formData, handleInputChange }) => (
    <div>
      <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
        Organization
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Building2 className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          id="organization"
          name="organization"
          value={formData.organization}
          onChange={handleInputChange}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          placeholder="Enter organization (optional)"
        />
      </div>
    </div>
  );

  const handleSubmit = async (formData) => {
    return await nursesService.createNurse(formData);
  };

  return (
    <BaseUserModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      title="Add New Nurse"
      icon={Stethoscope}
      submitService={handleSubmit}
      initialFormData={initialFormData}
      renderExtraFields={renderExtraFields}
      successTitle="Nurse Added Successfully"
      successMessage="The nurse has been added to the users table. A password setup email has been sent."
      errorTitle="Error Adding Nurse"
      submitButtonText="Add Nurse"
      skipValidationFields={['organization']}
    />
  );
};

AddNurseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func
};

export default AddNurseModal;
