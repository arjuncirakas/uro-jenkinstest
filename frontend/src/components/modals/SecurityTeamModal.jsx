import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { securityDashboardService } from '../../services/securityDashboardService';

const SecurityTeamModal = ({ isOpen, onClose }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  // Fetch team members when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await securityDashboardService.getSecurityTeamMembers();
      if (response.success) {
        setTeamMembers(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch security team members');
      }
    } catch (err) {
      setError('Failed to fetch security team members');
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

    setIsSubmitting(true);

    try {
      const response = await securityDashboardService.addSecurityTeamMember(
        formData.name.trim(),
        formData.email.trim()
      );

      if (response.success) {
        setSuccess('Security team member added successfully');
        setFormData({ name: '', email: '' });
        await fetchTeamMembers(); // Refresh list
      } else {
        setError(response.error || 'Failed to add security team member');
      }
    } catch (err) {
      setError('Failed to add security team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this security team member?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await securityDashboardService.removeSecurityTeamMember(memberId);

      if (response.success) {
        setSuccess('Security team member removed successfully');
        await fetchTeamMembers(); // Refresh list
      } else {
        setError(response.error || 'Failed to remove security team member');
      }
    } catch (err) {
      setError('Failed to remove security team member');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Security Team</h2>
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

          {/* Add New Member Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Security Team Member</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                    placeholder="Enter name"
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
                    placeholder="Enter email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Team Members List */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Team Members</h3>
            {(() => {
              if (isLoading) {
                return (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                );
              }
              if (teamMembers.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>No security team members added yet.</p>
                  </div>
                );
              }
              return (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={`Remove ${member.name}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
              );
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

SecurityTeamModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default SecurityTeamModal;
