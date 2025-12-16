import React, { useState, useEffect } from 'react';
import { IoClose, IoPersonOutline, IoMailOutline, IoCallOutline } from 'react-icons/io5';
import authService from '../services/authService';

const ProfileModal = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    } else {
      // Reset state when modal closes
      setProfile(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.getProfile();
      if (result.success && result.data?.user) {
        setProfile(result.data.user);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Helper function to get name fields (handle both camelCase and snake_case)
  const getFirstName = () => {
    return profile?.firstName || profile?.first_name || '';
  };

  const getLastName = () => {
    return profile?.lastName || profile?.last_name || '';
  };

  const getFullName = () => {
    const firstName = getFirstName();
    const lastName = getLastName();
    return `${firstName} ${lastName}`.trim() || 'User';
  };

  const getInitials = () => {
    const firstName = getFirstName();
    const lastName = getLastName();
    const firstInitial = firstName?.[0]?.toUpperCase() || '';
    const lastInitial = lastName?.[0]?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || 'U';
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'urologist': 'Urologist',
      'doctor': 'Doctor',
      'gp': 'General Practitioner',
      'urology_nurse': 'Urology Nurse',
      'superadmin': 'Super Admin',
      'department_admin': 'Department Admin'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <IoPersonOutline className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">My Profile</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <IoClose className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-teal-600 border-t-transparent mb-4"></div>
                <p className="text-gray-600 text-sm">Loading profile...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="text-red-500 text-2xl mb-3">⚠️</div>
                <p className="text-gray-900 font-medium mb-2">Error loading profile</p>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchProfile}
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="text-center pb-6 border-b border-gray-200">
                <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">
                  {getInitials()}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {getFullName()}
                </h2>
                <p className="text-teal-600 font-medium">
                  {getRoleDisplayName(profile.role)}
                </p>
                {profile.organization && (
                  <p className="text-gray-600 text-sm mt-1">
                    {profile.organization}
                  </p>
                )}
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <IoMailOutline className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Email Address
                      </label>
                      <p className="text-gray-900 font-medium break-all">{profile.email || 'N/A'}</p>
                    </div>
                  </div>
                  {profile.phone && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <IoCallOutline className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                          Phone Number
                        </label>
                        <p className="text-gray-900 font-medium">{profile.phone}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <IoPersonOutline className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        Full Name
                      </label>
                      <p className="text-gray-900 font-medium">
                        {getFirstName() && getLastName() 
                          ? `${getFirstName()} ${getLastName()}`
                          : getFirstName() || getLastName() || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 rounded-b-xl">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

