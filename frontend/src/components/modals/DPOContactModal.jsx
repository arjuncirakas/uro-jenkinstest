import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Save, Loader2 } from 'lucide-react';
import { securityDashboardService } from '../../services/securityDashboardService';

const DPOContactModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: ''
  });

  // Fetch existing DPO info when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDPOInfo();
    }
  }, [isOpen]);

  const fetchDPOInfo = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await securityDashboardService.getDPOContactInfo();
      if (response.success && response.data) {
        setFormData({
          name: response.data.name || '',
          email: response.data.email || '',
          contact_number: response.data.contact_number || ''
        });
      } else {
        // No DPO info exists yet, reset form
        setFormData({
          name: '',
          email: '',
          contact_number: ''
        });
      }
    } catch (err) {
      setError('Failed to fetch DPO contact information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateContactNumber = (contactNumber) => {
    const contactRegex = /^[\d\s\-+()]+$/;
    return contactRegex.test(contactNumber) && contactNumber.trim().length >= 5;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Invalid email format');
      return;
    }

    if (!formData.contact_number.trim()) {
      setError('Contact number is required');
      return;
    }

    if (!validateContactNumber(formData.contact_number)) {
      setError('Invalid contact number format');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await securityDashboardService.setDPOContactInfo(
        formData.name.trim(),
        formData.email.trim(),
        formData.contact_number.trim()
      );

      if (response.success) {
        setSuccess(response.message || 'DPO contact information saved successfully');
        // Optionally close modal after a delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(response.error || 'Failed to save DPO contact information');
      }
    } catch (err) {
      setError('Failed to save DPO contact information');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Data Protection Officer Contact Information</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Form */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter DPO name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter DPO email"
                  />
                </div>

                <div>
                  <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="contact_number"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter contact number"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

DPOContactModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default DPOContactModal;
