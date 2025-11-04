import React, { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { IoNotificationsOutline } from 'react-icons/io5';
import NotificationModal from '../../components/NotificationModal';
import Calendar from '../../components/Calendar';
import { bookingService } from '../../services/bookingService';
import notificationService from '../../services/notificationService';

const Appointments = () => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch appointments data
  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);
    
    try {
      const result = await bookingService.getAllAppointments();
      
      if (result.success) {
        setAppointments(result.data.appointments || []);
      } else {
        setAppointmentsError(result.error || 'Failed to fetch appointments');
        console.error('Error fetching appointments:', result.error);
      }
    } catch (error) {
      setAppointmentsError('Failed to fetch appointments');
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setNotificationCount(count);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  // Load appointments and notification count on component mount
  useEffect(() => {
    fetchAppointments();
    fetchNotificationCount();
  }, []);

  // Handle notification count update
  const handleNotificationCountChange = (count) => {
    setNotificationCount(count);
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-500 text-sm mt-1">Schedule and manage patient appointments</p>
          </div>
          {/* Search Bar and Notification */}
          <div className="w-full lg:w-96 flex items-center gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
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

        {/* Calendar Section */}
        <div className="mt-6">
          <Calendar 
            appointments={appointments}
            loadingAppointments={loadingAppointments}
            appointmentsError={appointmentsError}
            onRefresh={fetchAppointments}
          />
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNotificationCountChange={handleNotificationCountChange}
      />
    </div>
  );
};

export default Appointments;
