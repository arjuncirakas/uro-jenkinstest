import React from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';

const ViewUserModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'inactive':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGeneralRole = (role) => {
    const roleMap = {
      'urologist': 'Urologist',
      'doctor': 'Doctor',
      'urology_nurse': 'Urology Nurse',
      'gp': 'General Practitioner',
      'department_admin': 'Department Admin',
      'superadmin': 'Super Admin'
    };
    return roleMap[role] || role;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const status = user.is_verified
    ? (user.is_active ? 'active' : 'inactive')
    : 'pending';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[130] animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-teal-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-900">
                User Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View complete user information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* User Name and Status */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {user.first_name} {user.last_name}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {getGeneralRole(user.role)}
                </p>
              </div>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                <span className="ml-2 capitalize">{status}</span>
              </div>
            </div>
          </div>

          {/* User Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <Mail className="h-5 w-5 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Email</label>
              </div>
              <p className="text-sm text-gray-900 break-all">{user.email || 'N/A'}</p>
            </div>

            {/* Phone */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <Phone className="h-5 w-5 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Phone</label>
              </div>
              <p className="text-sm text-gray-900">{user.phone || 'N/A'}</p>
            </div>

            {/* Organization */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <Building2 className="h-5 w-5 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Organization</label>
              </div>
              <p className="text-sm text-gray-900">{user.organization || 'N/A'}</p>
            </div>

            {/* Role */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Role</label>
              </div>
              <p className="text-sm text-gray-900">{getGeneralRole(user.role)}</p>
            </div>

            {/* Department (if applicable) */}
            {user.department_name && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center mb-2">
                  <Building2 className="h-5 w-5 text-gray-600 mr-2" />
                  <label className="text-sm font-medium text-gray-700">Department</label>
                </div>
                <p className="text-sm text-gray-900">{user.department_name}</p>
              </div>
            )}

            {/* User ID */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <User className="h-5 w-5 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">User ID</label>
              </div>
              <p className="text-sm text-gray-900 font-mono">#{user.id}</p>
            </div>
          </div>

          {/* Account Status Details */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Account Status
            </h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Active Status</label>
                <div className="mt-1">
                  {user.is_active ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">Verification Status</label>
                <div className="mt-1">
                  {user.is_verified ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Created At */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Created At</label>
              </div>
              <p className="text-sm text-gray-900">{formatDate(user.created_at)}</p>
            </div>

            {/* Last Login */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-gray-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">Last Login</label>
              </div>
              <p className="text-sm text-gray-900">{formatDate(user.last_login_at)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewUserModal;
