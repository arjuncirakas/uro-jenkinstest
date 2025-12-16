import React, { useState, useEffect } from 'react';
import { IoClose, IoPersonOutline, IoMailOutline, IoCallOutline, IoBusinessOutline, IoShieldCheckmarkOutline } from 'react-icons/io5';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700 flex-shrink-0 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <IoPersonOutline className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">My Profile</h3>
              <p className="text-teal-50 text-sm mt-0.5">View your account information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <IoClose className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
                <p className="text-gray-600">Loading profile...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-2">⚠️</div>
                <p className="text-gray-900 font-medium mb-2">Error loading profile</p>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchProfile}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-6 border border-teal-200">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {profile.first_name?.[0]?.toUpperCase() || ''}
                    {profile.last_name?.[0]?.toUpperCase() || ''}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {profile.first_name} {profile.last_name}
                    </h2>
                    <p className="text-teal-700 font-medium mt-1">
                      {getRoleDisplayName(profile.role)}
                    </p>
                    {profile.organization && (
                      <p className="text-gray-600 text-sm mt-1">
                        {profile.organization}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <IoPersonOutline className="mr-2 text-teal-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">First Name</label>
                    <p className="text-gray-900">{profile.first_name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">Last Name</label>
                    <p className="text-gray-900">{profile.last_name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <IoMailOutline className="text-gray-400" />
                      Email Address
                    </label>
                    <p className="text-gray-900">{profile.email || 'N/A'}</p>
                  </div>
                  {profile.phone && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <IoCallOutline className="text-gray-400" />
                        Phone Number
                      </label>
                      <p className="text-gray-900">{profile.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <IoBusinessOutline className="mr-2 text-teal-600" />
                  Professional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    <p className="text-gray-900">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                        {getRoleDisplayName(profile.role)}
                      </span>
                    </p>
                  </div>
                  {profile.organization && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-600">Organization</label>
                      <p className="text-gray-900">{profile.organization}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">Account Status</label>
                    <p className="text-gray-900">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        profile.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <IoShieldCheckmarkOutline className="text-gray-400" />
                      Verification Status
                    </label>
                    <p className="text-gray-900">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        profile.is_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {profile.is_verified ? 'Verified' : 'Not Verified'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600">User ID</label>
                    <p className="text-gray-900 font-mono text-sm">{profile.id}</p>
                  </div>
                  {profile.created_at && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-600">Member Since</label>
                      <p className="text-gray-900">{formatDate(profile.created_at)}</p>
                    </div>
                  )}
                  {profile.last_login_at && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-600">Last Login</label>
                      <p className="text-gray-900">{formatDate(profile.last_login_at)}</p>
                    </div>
                  )}
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
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
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

