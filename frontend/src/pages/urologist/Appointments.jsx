import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FiSearch, FiCalendar, FiList, FiArrowLeft } from 'react-icons/fi';
import { IoNotificationsOutline } from 'react-icons/io5';
import NotificationModal from '../../components/NotificationModal';
import Calendar from '../../components/Calendar';
import MissedAppointmentsList from '../../components/MissedAppointmentsList';
import DailyAppointmentsList from '../../components/DailyAppointmentsList';
import AppointmentDetailsModal from '../../components/AppointmentDetailsModal';
import { bookingService } from '../../services/bookingService';
import tokenService from '../../services/tokenService';

const Appointments = () => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [currentView, setCurrentView] = useState('calendar'); // 'calendar', 'daily', or 'missed'
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, appointment: null });
  const [allAppointments, setAllAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get current urologist ID from authentication
  const currentUrologistId = tokenService.getUserId();
  
  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);
    
    try {
      const result = await bookingService.getAllAppointments({
        urologistId: showAllPatients ? null : currentUrologistId,
        search: searchQuery
      });
      
      if (result.success) {
        // Create a new array reference to ensure React detects the change
        const newAppointments = result.data.appointments || [];
        console.log('Urologist Appointments - Fetched appointments:', newAppointments.length);
        setAllAppointments(newAppointments);
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
  }, [showAllPatients, currentUrologistId, searchQuery]);

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchAppointments();
    }, searchQuery ? 300 : 0); // 300ms delay when searching, immediate when clearing
    
    return () => clearTimeout(timeoutId);
  }, [fetchAppointments, searchQuery]);

  // Filter appointments based on toggle state
  // NOTE: Search is now handled server-side, so we just use the appointments as-is
  // NOTE: Include all appointments including 'missed'/'no_show' so they appear in the calendar
  const filteredAppointments = useMemo(() => {
    return allAppointments; // Show all appointments including missed/no-show
  }, [allAppointments]);

  // Filter missed appointments based on toggle state
  const filteredMissedAppointments = useMemo(() => {
    return allAppointments.filter(apt => apt.status === 'missed');
  }, [allAppointments]);

  // Get appointments for selected date (including both regular and missed appointments)
  const dailyAppointments = useMemo(() => {
    if (!selectedDate) return [];
    
    // Format date as YYYY-MM-DD to match the data format
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Filter appointments for the selected date
    // Note: Search is handled server-side, so appointments are already filtered
    const dayAppointments = allAppointments.filter(apt => {
      const aptDate = apt.date || apt.appointment_date;
      return aptDate === dateString;
    });
    
    // Sort by time
    return dayAppointments.sort((a, b) => {
      const timeA = (a.time || a.appointment_time).split(':').map(Number);
      const timeB = (b.time || b.appointment_time).split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
  }, [selectedDate, allAppointments]);

  // Handle day click from calendar
  const handleDayClick = (date) => {
    setSelectedDate(date);
    setCurrentView('daily');
  };

  // Handle back to calendar
  const handleBackToCalendar = () => {
    setCurrentView('calendar');
    setSelectedDate(null);
  };

  // Handle appointment click
  const handleAppointmentClick = (appointment) => {
    setDetailsModal({ isOpen: true, appointment: appointment });
  };

  // Handle details modal close
  const handleDetailsClose = () => {
    setDetailsModal({ isOpen: false, appointment: null });
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="pl-12 lg:pl-0">
            <div className="flex items-center gap-4">
              {currentView === 'daily' && (
                <button
                  onClick={handleBackToCalendar}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Appointments</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {currentView === 'daily' 
                    ? `Appointments for ${selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
                    : currentView === 'missed'
                    ? 'View and manage missed appointments'
                    : 'Manage your appointments'
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Search Bar, Filters and Notification */}
          {currentView !== 'daily' && (
            <div className="w-full lg:w-auto flex flex-col lg:flex-row items-start lg:items-center gap-3">
              {/* View Filter */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCurrentView('calendar')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                      currentView === 'calendar'
                        ? 'bg-white text-teal-600 shadow-sm border border-teal-200'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentView === 'calendar' ? 'bg-teal-500' : 'bg-gray-400'}`}></div>
                      Calendar
                    </span>
                  </button>
                  <button
                    onClick={() => setCurrentView('missed')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                      currentView === 'missed'
                        ? 'bg-white text-red-600 shadow-sm border border-red-200'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${currentView === 'missed' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                      Missed Only
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
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
          )}
        </div>

        {/* Content Section */}
        <div className="mt-6">
          {currentView === 'daily' ? (
            <DailyAppointmentsList 
              appointments={dailyAppointments}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onAppointmentClick={handleAppointmentClick}
            />
          ) : currentView === 'missed' ? (
            <MissedAppointmentsList 
              missedAppointments={filteredMissedAppointments}
              showAllPatients={showAllPatients}
              onTogglePatients={setShowAllPatients}
              onRefresh={fetchAppointments}
            />
          ) : (
            <Calendar 
              appointments={filteredAppointments}
              loadingAppointments={loadingAppointments}
              appointmentsError={appointmentsError}
              showAllPatients={showAllPatients}
              onTogglePatients={setShowAllPatients}
              onDayClick={handleDayClick}
              onRefresh={fetchAppointments}
            />
          )}
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onPatientClick={(patientName) => {
          console.log('Appointments page: Notification clicked for patient:', patientName);
          // Could implement patient details view here if needed
          setIsNotificationOpen(false);
        }}
        onNotificationCountChange={(count) => setNotificationCount(count)}
      />

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        isOpen={detailsModal.isOpen}
        appointment={detailsModal.appointment}
        onClose={handleDetailsClose}
        onReschedule={() => {
          // Refresh appointments after reschedule
          fetchAppointments();
          handleDetailsClose();
        }}
      />
    </div>
  );
};

export default Appointments;

