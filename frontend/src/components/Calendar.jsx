import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiMoreVertical } from 'react-icons/fi';
import { bookingService } from '../services/bookingService';
import RescheduleConfirmationModal from './RescheduleConfirmationModal';
import AppointmentDetailsModal from './AppointmentDetailsModal';
import SuccessErrorModal from './SuccessErrorModal';

const Calendar = ({
  appointments = null,
  showAllPatients = false,
  onTogglePatients = null,
  onDayClick = null,
  loadingAppointments: externalLoading = false,
  appointmentsError: externalError = null,
  onRefresh = null,
  onMonthChange = null,
  currentMonth = null
}) => {
  const [currentDate, setCurrentDate] = useState(currentMonth || new Date());
  const [view, setView] = useState('month'); // 'day', 'week', 'month'
  const [draggedAppointment, setDraggedAppointment] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, appointment: null, newDate: null, newTime: null });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, appointment: null });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render
  const dragRef = useRef(null);
  const previousMonthRef = useRef({ month: new Date().getMonth(), year: new Date().getFullYear() });

  // State for appointments data
  const [allAppointments, setAllAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);

  // Fetch appointments data
  const fetchAppointments = async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);

    try {
      // Calculate date range for the current view
      const startDate = new Date(currentDate);
      const endDate = new Date(currentDate);

      if (view === 'month') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      } else if (view === 'week') {
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate.setDate(startDate.getDate() + 6);
      } else { // day view
        // No change needed for day view
      }

      const filters = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      const result = await bookingService.getAllAppointments(filters);

      if (result.success) {
        setAllAppointments(result.data.appointments || []);
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

  // Sync currentDate with currentMonth prop when it changes
  useEffect(() => {
    if (currentMonth) {
      setCurrentDate(new Date(currentMonth));
    }
  }, [currentMonth]);

  // Load appointments when component mounts or view changes (only if no external appointments provided)
  useEffect(() => {
    if (!appointments) {
      fetchAppointments();
    }
  }, [currentDate, view, appointments]);

  // Notify parent when month changes
  useEffect(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const previousMonth = previousMonthRef.current;

    // Check if month/year has changed
    if (onMonthChange && (currentMonth !== previousMonth.month || currentYear !== previousMonth.year)) {
      onMonthChange(currentDate);
    }

    // Update the ref
    previousMonthRef.current = { month: currentMonth, year: currentYear };
  }, [currentDate, onMonthChange]);

  // Use provided appointments if available, otherwise use fetched data
  // Use useMemo to ensure it updates when appointments or allAppointments change
  const appointmentsToUse = useMemo(() => {
    return appointments || allAppointments;
  }, [appointments, allAppointments]);

  // Force re-render when appointments prop changes (for external appointments)
  useEffect(() => {
    // When external appointments change, force a re-render
    setRefreshKey(prev => prev + 1);
  }, [appointments, allAppointments]);

  // Debug logging
  console.log('Calendar Debug - appointments:', appointments);
  console.log('Calendar Debug - allAppointments:', allAppointments);
  console.log('Calendar Debug - appointmentsToUse:', appointmentsToUse);
  console.log('Calendar Debug - appointmentsToUse length:', appointmentsToUse?.length);

  // Use external loading/error states if provided, otherwise use internal states
  const isLoading = externalLoading || loadingAppointments;
  const hasError = externalError || appointmentsError;
  const refreshFunction = onRefresh || fetchAppointments;

  // Get month name and year
  const getMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get week date range
  const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Get day date string
  const getDayString = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Get week days
  const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const today = new Date();
      days.push({
        date: day.getDate(),
        fullDate: day,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: day.toLocaleDateString('en-US', { month: 'short' }),
        isToday: day.toDateString() === today.toDateString()
      });
    }
    return days;
  };

  // Generate time slots (6 AM to 9 PM)
  const timeSlots = [];
  for (let hour = 6; hour <= 21; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    timeSlots.push(`${displayHour}:00 ${period}`);
  };

  // Helper function to convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Helper function to check if appointment time matches slot time
  const isTimeInSlot = (appointmentTime, slotTime) => {
    const convertedTime = convertTo12Hour(appointmentTime);
    // Check if the converted time starts with the slot hour (e.g., "9:00 AM" matches "9:15 AM", "9:30 AM", etc.)
    const slotHour = slotTime.split(':')[0];
    const slotPeriod = slotTime.split(' ')[1];
    const convertedHour = convertedTime.split(':')[0];
    const convertedPeriod = convertedTime.split(' ')[1];

    return slotHour === convertedHour && slotPeriod === convertedPeriod;
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({
        date: prevMonthDay.getDate(),
        fullDate: prevMonthDay,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = new Date(year, month, day);
      const today = new Date();
      days.push({
        date: day,
        fullDate: fullDate,
        isCurrentMonth: true,
        isToday: fullDate.toDateString() === today.toDateString()
      });
    }

    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonthDay = new Date(year, month + 1, i);
      days.push({
        date: nextMonthDay.getDate(),
        fullDate: nextMonthDay,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  };

  // Format date for comparison
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get appointments for a specific date
  const getAppointmentsByDate = (date, appointments = null) => {
    const data = appointments || appointmentsToUse;
    // Format the date string to match appointment date format (YYYY-MM-DD)
    const dateString = typeof date === 'string' ? date : formatDate(date);
    console.log(`Calendar Debug - getAppointmentsByDate for ${dateString}:`, data);
    const filtered = data.filter(appointment => {
      // Handle both 'date' and 'appointment_date' fields
      const aptDate = appointment.date || appointment.appointment_date;
      return aptDate === dateString;
    });
    console.log(`Calendar Debug - filtered appointments for ${dateString}:`, filtered);
    return filtered;
  };

  // Helper function to check if an appointment is a recurring followup or auto-booked appointment
  const isRecurringFollowup = (appointment) => {
    // Check typeColor first (set by backend for automatic appointments)
    if (appointment.typeColor === 'blue') {
      return true;
    }

    // Check appointment_type or type fields (raw database values)
    if (appointment.appointment_type === 'automatic' ||
      appointment.type === 'automatic' ||
      appointment.appointmentType === 'automatic') {
      return true;
    }

    // Check type label (backend sets this to 'Follow-up Appointment' for automatic)
    const typeLabel = (appointment.type || '').toLowerCase();
    if (typeLabel === 'follow-up appointment' ||
      typeLabel === 'followup appointment' ||
      typeLabel.includes('follow-up')) {
      return true;
    }

    // Check if notes contain auto-booked or recurring followup patterns
    const notes = appointment.notes || '';
    const lowerNotes = notes.toLowerCase();

    // Check for auto-booked patterns
    if (lowerNotes.includes('auto-booked') ||
      lowerNotes.includes('auto booked') ||
      lowerNotes.includes('automatic appointment')) {
      return true;
    }

    // Check for recurring followup patterns
    if (lowerNotes.includes('recurring follow-up') ||
      lowerNotes.includes('recurring followup') ||
      lowerNotes.includes('recurring follow up')) {
      return true;
    }

    return false;
  };

  // Helper function to get appointment color, preserving original typeColor
  // This ensures that investigation appointments (purple) and urologist consultations (teal)
  // maintain their colors when rescheduled
  const getAppointmentColor = (appointment) => {
    // If status is missed, always show red
    if (appointment.status === 'missed' || appointment.status === 'no_show' || appointment.status === 'no-show') {
      return 'red';
    }

    // Check for investigation appointments first (purple) - should take priority over automatic classification
    const typeLabel = (appointment.type || '').toLowerCase();
    if (appointment.typeColor === 'purple' || typeLabel.includes('investigation')) {
      return 'purple';
    }

    // Check for automatic/follow-up appointments (blue)
    if (isRecurringFollowup(appointment) ||
      appointment.typeColor === 'blue' ||
      appointment.appointment_type === 'automatic' ||
      appointment.type === 'automatic') {
      return 'blue';
    }

    // Preserve original typeColor if it exists
    // This ensures urologist consultation (teal), surgery (orange), and MDT (green) colors are maintained
    if (appointment.typeColor === 'teal') {
      return 'teal';
    }

    if (appointment.typeColor === 'orange') {
      return 'orange';
    }

    if (appointment.typeColor === 'green') {
      return 'green';
    }

    // Fallback: determine color from appointment type if typeColor is not set
    if (typeLabel.includes('surgery') || typeLabel.includes('surgical')) {
      return 'orange';
    }

    if (typeLabel.includes('mdt')) {
      return 'green';
    }

    // Default to teal for urologist consultations
    return 'teal';
  };

  // Separate automatic appointments and appointments without time slots from regular appointments
  // Automatic category includes:
  // 1. Recurring follow-ups (automatic appointment type)
  // 2. Any appointments without a time slot (including investigations)
  const separateAppointments = (appointments) => {
    const regular = [];
    const automatic = [];

    appointments.forEach(apt => {
      // Check if appointment has no time slot
      const hasNoTimeSlot = !apt.time && !apt.appointment_time;

      // Use the isRecurringFollowup helper to catch all automatic appointments
      // This includes appointments with typeColor='blue', type='automatic', 
      // appointment_type='automatic', or notes containing auto-booked/recurring patterns
      const isAutomatic = isRecurringFollowup(apt);

      // Categorize: appointments without time slots OR automatic appointments go to 'automatic' array
      if (hasNoTimeSlot || isAutomatic) {
        automatic.push(apt);
      } else {
        regular.push(apt);
      }
    });

    return { regular, automatic };
  };

  // Navigate months/weeks/days
  const navigate = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (view === 'month') {
        newDate.setMonth(prev.getMonth() + direction);
      } else if (view === 'week') {
        newDate.setDate(prev.getDate() + (direction * 7));
      } else if (view === 'day') {
        newDate.setDate(prev.getDate() + direction);
      }
      return newDate;
    });
  };

  // Handle drag start
  const handleDragStart = (e, appointment) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e, targetDate) => {
    e.preventDefault();

    if (draggedAppointment) {
      // Validate that target date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      const targetDateOnly = new Date(targetDate);
      targetDateOnly.setHours(0, 0, 0, 0);

      if (targetDateOnly < today) {
        setErrorModal({
          isOpen: true,
          message: 'Cannot reschedule appointments to a past date. Please select today or a future date.'
        });
        setDraggedAppointment(null);
        return;
      }

      // Get the date components directly from the target date
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
      const day = targetDate.getDate();

      // Create the date string in YYYY-MM-DD format directly
      const newDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const newTime = draggedAppointment.time; // Keep same time for now

      console.log('=== CALENDAR DEBUG ===');
      console.log('Target date object:', targetDate);
      console.log('Year:', year, 'Month:', month, 'Day:', day);
      console.log('Formatted newDate being passed:', newDate);
      console.log('=== END CALENDAR DEBUG ===');

      // Store the dragged appointment before clearing it
      const appointmentToReschedule = draggedAppointment;
      setDraggedAppointment(null);

      setRescheduleModal({
        isOpen: true,
        appointment: appointmentToReschedule,
        newDate: newDate,
        newTime: newTime
      });
    } else {
      setDraggedAppointment(null);
    }
  };

  // Handle reschedule confirmation
  // NOTE: The RescheduleConfirmationModal already calls the API, so this function
  // only needs to handle the refresh logic after successful reschedule
  const handleRescheduleConfirm = async (appointmentId, newDate, newTime, selectedDoctor) => {
    console.log('=== CONFIRMATION DEBUG ===');
    console.log('Appointment ID:', appointmentId);
    console.log('New Date:', newDate);
    console.log('New Time:', newTime);
    console.log('Selected Doctor:', selectedDoctor);

    // The API call was already made by RescheduleConfirmationModal
    // We just need to refresh the appointments and close the modal

    // Close modal first
    setRescheduleModal({ isOpen: false, appointment: null, newDate: null, newTime: null });

    // Refresh appointments data - prioritize onRefresh if available (for external appointments)
    if (onRefresh) {
      console.log('Calling onRefresh callback...');
      await onRefresh();
      console.log('onRefresh callback completed');
    } else {
      // If no external refresh callback, use internal fetch
      console.log('Calling fetchAppointments...');
      await fetchAppointments();
      console.log('fetchAppointments completed');
    }

    // Force re-render to show updated appointments - do this after refresh
    console.log('Forcing calendar re-render...');
    setRefreshKey(prev => prev + 1);

    // Small delay to ensure state updates propagate
    setTimeout(() => {
      setRefreshKey(prev => prev + 1);
    }, 100);

    console.log('=== END CONFIRMATION DEBUG ===');
  };

  // Handle reschedule cancel
  const handleRescheduleCancel = () => {
    setRescheduleModal({ isOpen: false, appointment: null, newDate: null, newTime: null });
  };

  // Handle appointment details
  const handleAppointmentClick = (appointment) => {
    setDetailsModal({ isOpen: true, appointment: appointment });
  };

  // Handle details modal close
  const handleDetailsClose = () => {
    setDetailsModal({ isOpen: false, appointment: null });
  };

  // Handle day click
  const handleDayClick = (day) => {
    if (onDayClick) {
      onDayClick(day.fullDate);
    } else {
      // Default behavior: switch to day view
      setCurrentDate(day.fullDate);
      setView('day');
    }
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">
            {view === 'month' && getMonthYear(currentDate)}
            {view === 'week' && getWeekRange(currentDate)}
            {view === 'day' && getDayString(currentDate)}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {['day', 'week', 'month'].map((viewType) => (
            <button
              key={viewType}
              onClick={() => setView(viewType)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${view === viewType
                ? 'bg-teal-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {viewType}
            </button>
          ))}
        </div>
      </div>

      {/* Legend and Patient Filter */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-500 rounded"></div>
            <span className="text-sm text-gray-600">Urologist Appointments</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600">Investigation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-sm text-gray-600">Surgery</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">MDT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Follow-up</span>
          </div>
        </div>

        {/* Patient Filter Toggle */}
        {onTogglePatients && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Display:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onTogglePatients(false)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${!showAllPatients
                  ? 'bg-white text-teal-600 shadow-sm border border-teal-200'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${!showAllPatients ? 'bg-teal-500' : 'bg-gray-400'}`}></div>
                  My Patients Only
                </span>
              </button>
              <button
                onClick={() => onTogglePatients(true)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${showAllPatients
                  ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${showAllPatients ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                  All Patients
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
              <span className="text-gray-600 text-sm">Loading appointments...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-600 text-sm mb-2">{hasError}</div>
              <button
                onClick={refreshFunction}
                className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Month View */}
        {!isLoading && !hasError && view === 'month' && (
          <>
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div key={`calendar-grid-${refreshKey}-${appointmentsToUse.length}`} className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const dayAppointments = getAppointmentsByDate(formatDate(day.fullDate), appointmentsToUse);
                const { regular, automatic } = separateAppointments(dayAppointments);

                // Sort regular appointments: upcoming first (confirmed, pending), then completed/missed
                const sortedRegularAppointments = [...regular].sort((a, b) => {
                  // First sort by status priority: confirmed/pending first, then missed
                  const statusPriority = (status) => {
                    if (status === 'confirmed' || status === 'pending') return 0;
                    if (status === 'missed') return 1;
                    return 2;
                  };

                  const statusDiff = statusPriority(a.status) - statusPriority(b.status);
                  if (statusDiff !== 0) return statusDiff;

                  // Then sort by time within each status group
                  const timeA = a.time ? a.time.split(':').map(Number) : [0, 0];
                  const timeB = b.time ? b.time.split(':').map(Number) : [0, 0];
                  return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                });

                // Sort automatic appointments (no time-based sorting needed)
                const sortedAutomaticAppointments = [...automatic].sort((a, b) => {
                  const statusPriority = (status) => {
                    if (status === 'confirmed' || status === 'pending') return 0;
                    if (status === 'missed') return 1;
                    return 2;
                  };
                  return statusPriority(a.status) - statusPriority(b.status);
                });

                const hasAppointments = sortedRegularAppointments.length > 0 || sortedAutomaticAppointments.length > 0;

                return (
                  <div
                    key={index}
                    className={`min-h-[120px] border border-gray-200 rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${day.isToday ? 'ring-2 ring-teal-500' : ''
                      } ${hasAppointments ? 'bg-teal-50' : ''
                      }`}
                    onClick={() => handleDayClick(day)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day.fullDate)}
                  >
                    {/* Date number */}
                    <div className={`text-sm font-medium mb-1 ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                      {day.date}
                    </div>

                    {/* Regular Appointments */}
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {sortedRegularAppointments.length > 0 ? (
                        sortedRegularAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, appointment)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(appointment);
                            }}
                            className={`p-1 rounded text-xs cursor-pointer group hover:opacity-90 transition-opacity ${getAppointmentColor(appointment) === 'red'
                              ? 'bg-red-500 text-white'
                              : getAppointmentColor(appointment) === 'blue'
                                ? 'bg-blue-500 text-white'
                                : getAppointmentColor(appointment) === 'teal'
                                  ? 'bg-teal-500 text-white'
                                  : getAppointmentColor(appointment) === 'purple'
                                    ? 'bg-purple-500 text-white'
                                    : getAppointmentColor(appointment) === 'orange'
                                      ? 'bg-orange-500 text-white'
                                      : getAppointmentColor(appointment) === 'green'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-500 text-white'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {appointment.time ? convertTo12Hour(appointment.time) + ' ' : ''}{appointment.patientName}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAppointmentClick(appointment);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-white/20 rounded p-0.5"
                                title="View details"
                              >
                                <FiMoreVertical className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : null}

                      {/* Automatic Appointments (shown separately without time) */}
                      {sortedAutomaticAppointments.length > 0 ? (
                        sortedAutomaticAppointments.map((appointment) => {
                          const color = getAppointmentColor(appointment);
                          const colorClasses = color === 'purple'
                            ? 'bg-purple-500 text-white border-purple-600'
                            : color === 'blue'
                              ? 'bg-blue-500 text-white border-blue-600'
                              : color === 'teal'
                                ? 'bg-teal-500 text-white border-teal-600'
                                : color === 'orange'
                                  ? 'bg-orange-500 text-white border-orange-600'
                                  : color === 'green'
                                    ? 'bg-green-500 text-white border-green-600'
                                    : color === 'red'
                                      ? 'bg-red-500 text-white border-red-600'
                                      : 'bg-gray-500 text-white border-gray-600';

                          return (
                            <div
                              key={appointment.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, appointment)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAppointmentClick(appointment);
                              }}
                              className={`p-1 rounded text-xs cursor-pointer group hover:opacity-90 transition-opacity ${colorClasses}`}
                              title={`${appointment.type || 'Appointment'} (No time slot)`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {appointment.patientName}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAppointmentClick(appointment);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-white/20 rounded p-0.5"
                                  title="View details"
                                >
                                  <FiMoreVertical className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : null}

                      {sortedRegularAppointments.length === 0 && sortedAutomaticAppointments.length === 0 && (
                        <div className="text-xs text-gray-400">No appointments</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Week View */}
        {!isLoading && !hasError && view === 'week' && (
          <div key={refreshKey} className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Week header */}
              <div className="grid grid-cols-8 gap-px bg-gray-200 border-b border-gray-200">
                <div className="bg-white p-2 text-sm font-medium text-gray-500"></div>
                {getWeekDays(currentDate).map((day, index) => (
                  <div
                    key={index}
                    className={`bg-white p-2 text-center ${day.isToday ? 'bg-teal-50' : ''
                      }`}
                  >
                    <div className="text-xs text-gray-500">{day.dayName}</div>
                    <div className={`text-lg font-semibold ${day.isToday ? 'text-teal-600' : 'text-gray-900'
                      }`}>
                      {day.date}
                    </div>
                    <div className="text-xs text-gray-500">{day.monthName}</div>
                  </div>
                ))}
              </div>

              {/* Time slots grid */}
              <div className="grid grid-cols-8 gap-px bg-gray-200">
                {timeSlots.map((time, timeIndex) => (
                  <React.Fragment key={timeIndex}>
                    {/* Time label */}
                    <div className="bg-white p-2 text-xs text-gray-500 font-medium border-r border-gray-200">
                      {time}
                    </div>

                    {/* Day columns */}
                    {getWeekDays(currentDate).map((day, dayIndex) => {
                      const dayAppointments = getAppointmentsByDate(formatDate(day.fullDate), appointmentsToUse);
                      const { regular, automatic } = separateAppointments(dayAppointments);

                      // Sort regular appointments: upcoming first (confirmed, pending), then completed/missed
                      const sortedRegularAppointments = [...regular].sort((a, b) => {
                        const statusPriority = (status) => {
                          if (status === 'confirmed' || status === 'pending') return 0;
                          if (status === 'missed') return 1;
                          return 2;
                        };

                        const statusDiff = statusPriority(a.status) - statusPriority(b.status);
                        if (statusDiff !== 0) return statusDiff;

                        const timeA = a.time ? a.time.split(':').map(Number) : [0, 0];
                        const timeB = b.time ? b.time.split(':').map(Number) : [0, 0];
                        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
                      });

                      // Filter regular appointments by time slot
                      // Note: Automatic appointments with time slots will be shown in their time slot AND in the automatic section below
                      const timeAppointments = sortedRegularAppointments.filter(apt => apt.time && isTimeInSlot(apt.time, time));

                      // Also include automatic appointments that have a time slot in this time slot
                      const automaticWithTime = automatic.filter(apt => apt.time && isTimeInSlot(apt.time, time));
                      const allTimeAppointments = [...timeAppointments, ...automaticWithTime];

                      return (
                        <div
                          key={dayIndex}
                          className={`bg-white p-1 min-h-[60px] relative ${day.isToday ? 'bg-teal-50' : ''
                            }`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day.fullDate)}
                        >
                          {allTimeAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, appointment)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAppointmentClick(appointment);
                              }}
                              className={`p-2 rounded text-xs cursor-pointer group hover:opacity-90 transition-opacity mb-1 ${getAppointmentColor(appointment) === 'red'
                                ? 'bg-red-500 text-white'
                                : getAppointmentColor(appointment) === 'blue'
                                  ? 'bg-blue-500 text-white'
                                  : getAppointmentColor(appointment) === 'teal'
                                    ? 'bg-teal-500 text-white'
                                    : getAppointmentColor(appointment) === 'purple'
                                      ? 'bg-purple-500 text-white'
                                      : getAppointmentColor(appointment) === 'orange'
                                        ? 'bg-orange-500 text-white'
                                        : getAppointmentColor(appointment) === 'green'
                                          ? 'bg-green-500 text-white'
                                          : 'bg-gray-500 text-white'
                                }`}
                            >
                              <div className="font-medium">{convertTo12Hour(appointment.time)}</div>
                              <div className="text-[10px] opacity-90">{appointment.patientName}</div>
                              <div className="text-[10px] opacity-80">{appointment.type}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Automatic Appointments Section (Week View) */}
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="mb-2 px-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Appointments Without Time Slots
                  </h3>
                </div>
                <div className="grid grid-cols-8 gap-px bg-gray-200">
                  <div className="bg-white p-2 text-xs text-gray-500 font-medium border-r border-gray-200"></div>
                  {getWeekDays(currentDate).map((day, dayIndex) => {
                    const dayAppointments = getAppointmentsByDate(formatDate(day.fullDate), appointmentsToUse);
                    const { automatic } = separateAppointments(dayAppointments);

                    // Show ALL automatic appointments (both with and without time slots)
                    const sortedAutomaticAppointments = [...automatic].sort((a, b) => {
                      const statusPriority = (status) => {
                        if (status === 'confirmed' || status === 'pending') return 0;
                        if (status === 'missed') return 1;
                        return 2;
                      };
                      return statusPriority(a.status) - statusPriority(b.status);
                    });

                    return (
                      <div
                        key={dayIndex}
                        className={`bg-white p-2 min-h-[60px] ${day.isToday ? 'bg-blue-50' : ''
                          }`}
                      >
                        {sortedAutomaticAppointments.length > 0 ? (
                          <div className="space-y-1">
                            {sortedAutomaticAppointments.map((appointment) => {
                              const color = getAppointmentColor(appointment);
                              const colorClasses = color === 'purple'
                                ? 'bg-purple-500 text-white border-purple-600'
                                : color === 'blue'
                                  ? 'bg-blue-500 text-white border-blue-600'
                                  : color === 'teal'
                                    ? 'bg-teal-500 text-white border-teal-600'
                                    : color === 'orange'
                                      ? 'bg-orange-500 text-white border-orange-600'
                                      : color === 'green'
                                        ? 'bg-green-500 text-white border-green-600'
                                        : color === 'red'
                                          ? 'bg-red-500 text-white border-red-600'
                                          : 'bg-gray-500 text-white border-gray-600';

                              return (
                                <div
                                  key={appointment.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAppointmentClick(appointment);
                                  }}
                                  className={`p-1.5 rounded text-xs cursor-pointer ${colorClasses} hover:opacity-90 transition-opacity`}
                                  title={appointment.time ? `${appointment.type || 'Appointment'} at ${convertTo12Hour(appointment.time)}` : `${appointment.type || 'Appointment'} (No time slot)`}
                                >
                                  <div className="font-medium truncate">
                                    {appointment.time ? `${convertTo12Hour(appointment.time)} - ` : ''}{appointment.patientName}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">None</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Day View */}
        {!isLoading && !hasError && view === 'day' && (
          <div key={refreshKey} className="w-full">
            {/* Regular Appointments with Time Slots */}
            {timeSlots.map((time, timeIndex) => {
              const dayAppointments = getAppointmentsByDate(formatDate(currentDate), appointmentsToUse);
              const { regular } = separateAppointments(dayAppointments);

              // Sort regular appointments: upcoming first (confirmed, pending), then completed/missed
              const sortedRegularAppointments = [...regular].sort((a, b) => {
                const statusPriority = (status) => {
                  if (status === 'confirmed' || status === 'pending') return 0;
                  if (status === 'missed') return 1;
                  return 2;
                };

                const statusDiff = statusPriority(a.status) - statusPriority(b.status);
                if (statusDiff !== 0) return statusDiff;

                const timeA = a.time ? a.time.split(':').map(Number) : [0, 0];
                const timeB = b.time ? b.time.split(':').map(Number) : [0, 0];
                return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
              });
              const timeAppointments = sortedRegularAppointments.filter(apt => apt.time && isTimeInSlot(apt.time, time));

              return (
                <div
                  key={timeIndex}
                  className="flex border-b border-gray-200 hover:bg-gray-50"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, currentDate)}
                >
                  {/* Time label */}
                  <div className="w-24 p-3 text-sm text-gray-500 font-medium border-r border-gray-200">
                    {time}
                  </div>

                  {/* Appointments */}
                  <div className="flex-1 p-2 min-h-[70px]">
                    {timeAppointments.length > 0 ? (
                      <div className="space-y-2">
                        {timeAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, appointment)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(appointment);
                            }}
                            className={`p-3 rounded-lg cursor-pointer group hover:opacity-90 transition-opacity ${getAppointmentColor(appointment) === 'red'
                              ? 'bg-red-500 text-white'
                              : getAppointmentColor(appointment) === 'blue'
                                ? 'bg-blue-500 text-white'
                                : getAppointmentColor(appointment) === 'teal'
                                  ? 'bg-teal-500 text-white'
                                  : getAppointmentColor(appointment) === 'purple'
                                    ? 'bg-purple-500 text-white'
                                    : getAppointmentColor(appointment) === 'orange'
                                      ? 'bg-orange-500 text-white'
                                      : getAppointmentColor(appointment) === 'green'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-500 text-white'
                              }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-sm">
                                  {appointment.time ? convertTo12Hour(appointment.time) + ' - ' : ''}
                                  {appointment.patientName}
                                </div>
                                <div className="text-xs opacity-90 mt-1">{appointment.type}</div>
                                {appointment.notes && (
                                  <div className="text-xs opacity-80 mt-1">{appointment.notes}</div>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAppointmentClick(appointment);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded p-1"
                                title="View details"
                              >
                                <FiMoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">No appointments</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Automatic Appointments Section (Day View) */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Appointments Without Time Slots
                </h3>
                <p className="text-xs text-gray-500 mt-1">These appointments don't require specific time slots</p>
              </div>
              <div className="space-y-2">
                {(() => {
                  const dayAppointments = getAppointmentsByDate(formatDate(currentDate), appointmentsToUse);
                  const { automatic } = separateAppointments(dayAppointments);

                  const sortedAutomaticAppointments = [...automatic].sort((a, b) => {
                    const statusPriority = (status) => {
                      if (status === 'confirmed' || status === 'pending') return 0;
                      if (status === 'missed') return 1;
                      return 2;
                    };
                    return statusPriority(a.status) - statusPriority(b.status);
                  });

                  if (sortedAutomaticAppointments.length === 0) {
                    return (
                      <div className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded-lg">
                        No automatic appointments for this day
                      </div>
                    );
                  }

                  return sortedAutomaticAppointments.map((appointment) => {
                    const color = getAppointmentColor(appointment);
                    const colorClasses = color === 'purple'
                      ? 'bg-purple-500 text-white border-purple-600'
                      : color === 'blue'
                        ? 'bg-blue-500 text-white border-blue-600'
                        : color === 'teal'
                          ? 'bg-teal-500 text-white border-teal-600'
                          : color === 'orange'
                            ? 'bg-orange-500 text-white border-orange-600'
                            : color === 'green'
                              ? 'bg-green-500 text-white border-green-600'
                              : color === 'red'
                                ? 'bg-red-500 text-white border-red-600'
                                : 'bg-gray-500 text-white border-gray-600';

                    return (
                      <div
                        key={appointment.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAppointmentClick(appointment);
                        }}
                        className={`p-4 rounded-lg cursor-pointer ${colorClasses} hover:opacity-90 transition-opacity`}
                        title={`${appointment.type || 'Appointment'} (No specific time slot)`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-base">
                              {appointment.patientName}
                            </div>
                            <div className="text-xs opacity-90 mt-1">{appointment.type || 'Automatic Appointment'}</div>
                            {appointment.notes && (
                              <div className="text-xs opacity-80 mt-1">{appointment.notes}</div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAppointmentClick(appointment);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded p-1"
                            title="View details"
                          >
                            <FiMoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reschedule Confirmation Modal */}
      <RescheduleConfirmationModal
        isOpen={rescheduleModal.isOpen}
        appointment={rescheduleModal.appointment}
        newDate={rescheduleModal.newDate}
        newTime={rescheduleModal.newTime}
        onConfirm={handleRescheduleConfirm}
        onCancel={handleRescheduleCancel}
      />

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        isOpen={detailsModal.isOpen}
        appointment={detailsModal.appointment}
        onClose={handleDetailsClose}
        onReschedule={() => {
          // Refresh appointments after reschedule
          if (onRefresh) {
            onRefresh();
          } else {
            fetchAppointments();
          }
          setDetailsModal({ isOpen: false, appointment: null });
        }}
      />

      {/* Error Modal */}
      <SuccessErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
        type="error"
      />
    </div>
  );
};

export default Calendar;
