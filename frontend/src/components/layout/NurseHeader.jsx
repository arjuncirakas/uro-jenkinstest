import React, { useState, useRef, useCallback } from 'react';
import { IoNotificationsOutline, IoPersonCircleOutline } from 'react-icons/io5';
import { FiSearch } from 'react-icons/fi';
import NotificationModal from '../NotificationModal';
import ProfileDropdown from '../ProfileDropdown';
import GlobalPatientSearch from '../GlobalPatientSearch';
import NursePatientDetailsModal from '../NursePatientDetailsModal';
import DigitalClock from '../DigitalClock';

const NurseHeader = ({ 
  title, 
  subtitle, 
  searchPlaceholder = "Search patients by name, UPI, or status",
  onSearch = null, // If provided, uses local search instead of global search
  useLocalSearch = false, // Flag to indicate if this page uses local filtering
  hideSearch = false // If true, hides the search bar completely
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = useRef(null);
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Memoized callback to close profile dropdown
  const handleProfileClose = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  const handlePatientSelect = (patient) => {
    console.log('Selected patient:', patient);
    setSelectedPatient(patient);
    setIsPatientDetailsModalOpen(true);
  };

  const handlePatientClickFromNotification = (patientName, patientId, metadata) => {
    console.log('NurseHeader: Notification clicked for patient:', patientName);
    setSelectedPatient(patientName);
    setIsPatientDetailsModalOpen(true);
    setIsNotificationOpen(false);
  };

  const handleNotificationCountChange = (count) => {
    setNotificationCount(count);
  };

  // Determine if we should use local search or global search
  const shouldUseLocalSearch = onSearch !== null || useLocalSearch;

  return (
    <>
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>
        {/* Search Bar and Notification */}
        {!hideSearch && (
          <div className="w-full lg:w-96 flex items-center gap-3">
            {shouldUseLocalSearch && onSearch ? (
              // Local search input - filters the current page's patient list
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  onChange={(e) => onSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
            ) : (
              // Global search - searches all patients across all pathways
              <GlobalPatientSearch 
                placeholder={searchPlaceholder}
                onPatientSelect={handlePatientSelect}
              />
            )}
            {/* Digital Clock */}
            <DigitalClock />
            {/* Notification Icon */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <IoNotificationsOutline className="text-2xl" />
                {/* Notification Badge */}
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>
            {/* Profile Icon */}
            <div className="relative">
              <button
                ref={profileButtonRef}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Profile"
              >
                <IoPersonCircleOutline className="text-2xl" />
              </button>
              {isProfileOpen && (
                <ProfileDropdown
                  isOpen={isProfileOpen}
                  onClose={handleProfileClose}
                  buttonRef={profileButtonRef}
                />
              )}
            </div>
          </div>
        )}
        {/* Notification and Profile Icons when search is hidden */}
        {hideSearch && (
          <div className="flex items-center gap-3">
            {/* Digital Clock */}
            <DigitalClock />
            {/* Notification Icon */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Notifications"
              >
                <IoNotificationsOutline className="text-2xl" />
                {/* Notification Badge */}
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>
            {/* Profile Icon */}
            <div className="relative">
              <button
                ref={profileButtonRef}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Profile"
              >
                <IoPersonCircleOutline className="text-2xl" />
              </button>
              {isProfileOpen && (
                <ProfileDropdown
                  isOpen={isProfileOpen}
                  onClose={handleProfileClose}
                  buttonRef={profileButtonRef}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onPatientClick={handlePatientClickFromNotification}
        onNotificationCountChange={handleNotificationCountChange}
      />

      {/* Patient Details Modal */}
      <NursePatientDetailsModal
        isOpen={isPatientDetailsModalOpen}
        onClose={() => {
          setIsPatientDetailsModalOpen(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
      />
    </>
  );
};

export default NurseHeader;
