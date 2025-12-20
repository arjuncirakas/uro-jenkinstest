import React, { useState, useEffect, useRef } from 'react';
import { IoPersonOutline, IoMailOutline, IoCallOutline, IoClose } from 'react-icons/io5';
import authService from '../services/authService';

const ProfileDropdown = ({ isOpen, onClose, buttonRef }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      // Close dropdown when clicking outside
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          buttonRef?.current &&
          !buttonRef.current.contains(event.target)
        ) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    } else {
      // Reset state when dropdown closes
      setProfile(null);
      setError(null);
    }
  }, [isOpen, onClose, buttonRef]);

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
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
      style={{ minWidth: '320px' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <IoPersonOutline className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">My Profile</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <IoClose className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mb-2"></div>
              <p className="text-gray-600 text-xs">Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <button
              onClick={fetchProfile}
              className="text-teal-600 text-xs hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Profile Header */}
            <div className="text-center pb-4 border-b border-gray-200">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2 shadow-md">
                {getInitials()}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-0.5">
                {getFullName()}
              </h3>
              <p className="text-teal-600 text-sm font-medium">
                {getRoleDisplayName(profile.role)}
              </p>
              {profile.organization && (
                <p className="text-gray-500 text-xs mt-1">
                  {profile.organization}
                </p>
              )}
            </div>

            {/* Contact Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <IoMailOutline className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-0.5">Email</p>
                  <p className="text-sm font-medium text-gray-900 break-all">{profile.email || 'N/A'}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                  <IoCallOutline className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{profile.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ProfileDropdown;






