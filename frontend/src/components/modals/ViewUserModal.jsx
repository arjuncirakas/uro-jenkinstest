import React from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
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
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
              <div className="w-12 h-12 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg flex items-center justify-center shadow-md">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-900">
                User Details
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                View complete user information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* User Header Card */}
          <div className="bg-gradient-to-r from-teal-50 via-blue-50 to-teal-50 rounded-lg p-5 border border-teal-200 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h4>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  {getGeneralRole(user.role)}
                </p>
              </div>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                <span className="ml-1.5 capitalize">{status}</span>
              </div>
            </div>
          </div>

          {/* User Information */}
          <div className="space-y-4">
            <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Contact Information</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-teal-300 transition-colors shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                    <Mail className="h-4 w-4 text-teal-600" />
                  </div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                </div>
                <p className="text-sm font-medium text-gray-900 break-all ml-11">{user.email || 'N/A'}</p>
              </div>

              {/* Phone */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-teal-300 transition-colors shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                    <Phone className="h-4 w-4 text-teal-600" />
                  </div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                </div>
                <p className="text-sm font-medium text-gray-900 ml-11">{user.phone || 'N/A'}</p>
              </div>
            </div>

            <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mt-6 mb-4">Organization Details</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Organization */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-teal-300 transition-colors shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                    <Building2 className="h-4 w-4 text-teal-600" />
                  </div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Organization</label>
                </div>
                <p className="text-sm font-medium text-gray-900 ml-11">{user.organization || 'N/A'}</p>
              </div>

              {/* Role */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-teal-300 transition-colors shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                    <Shield className="h-4 w-4 text-teal-600" />
                  </div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</label>
                </div>
                <p className="text-sm font-medium text-gray-900 ml-11">{getGeneralRole(user.role)}</p>
              </div>

              {/* Department (if applicable) */}
              {user.department_name && (
                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-teal-300 transition-colors shadow-sm">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                      <Building2 className="h-4 w-4 text-teal-600" />
                    </div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
                  </div>
                  <p className="text-sm font-medium text-gray-900 ml-11">{user.department_name}</p>
                </div>
              )}
            </div>

            {/* Account Status */}
            <div className="mt-6">
              <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Account Status</h5>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Active Status</label>
                    <div>
                      {user.is_active ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Verification Status</label>
                    <div>
                      {user.is_verified ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2.5 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105 duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewUserModal;
