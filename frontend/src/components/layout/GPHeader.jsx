import React, { useState } from 'react';
import { IoNotificationsOutline } from 'react-icons/io5';
import NotificationModal from '../NotificationModal';
import GlobalPatientSearch from '../GlobalPatientSearch';
import GPPatientDetailsModal from '../GPPatientDetailsModal';

const GPHeader = ({ title, subtitle, searchPlaceholder = "Search patients by name, UPI, or status" }) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const handlePatientSelect = (patient) => {
    console.log('Selected patient:', patient);
    setSelectedPatient(patient);
    setIsPatientDetailsModalOpen(true);
  };

  const handlePatientClickFromNotification = (patientName, patientId, metadata) => {
    console.log('GPHeader: Notification clicked for patient:', patientName);
    setSelectedPatient(patientName);
    setIsPatientDetailsModalOpen(true);
    setIsNotificationOpen(false);
  };

  const handleNotificationCountChange = (count) => {
    setNotificationCount(count);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>
        {/* Search Bar and Notification */}
        <div className="w-full lg:w-96 flex items-center gap-3">
          <GlobalPatientSearch 
            placeholder={searchPlaceholder}
            onPatientSelect={handlePatientSelect}
          />
          {/* Notification Icon */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onPatientClick={handlePatientClickFromNotification}
        onNotificationCountChange={handleNotificationCountChange}
      />

      {/* Patient Details Modal */}
      <GPPatientDetailsModal
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

export default GPHeader;


