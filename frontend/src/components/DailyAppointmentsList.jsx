import React, { useState } from 'react';
import { FiClock, FiUser, FiCalendar, FiMail, FiPhone, FiMoreVertical } from 'react-icons/fi';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const DailyAppointmentsList = ({ 
  appointments = [], 
  selectedDate,
  onDateChange,
  onAppointmentClick
}) => {
  const [viewMode, setViewMode] = useState('timeline'); // 'list' or 'timeline'

  // Helper function to convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Helper function to format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Sort appointments: upcoming first (confirmed, pending), then completed/missed, then by time
  const sortedAppointments = [...appointments].sort((a, b) => {
    // First sort by status priority: confirmed/pending first, then missed
    const statusPriority = (status) => {
      if (status === 'confirmed' || status === 'pending') return 0;
      if (status === 'missed') return 1;
      return 2;
    };
    
    const statusDiff = statusPriority(a.status) - statusPriority(b.status);
    if (statusDiff !== 0) return statusDiff;
    
    // Then sort by time within each status group
    const timeA = a.time.split(':').map(Number);
    const timeB = b.time.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });

  // Navigate to previous/next day
  const navigateDay = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    onDateChange(newDate);
  };

  // Generate time slots for timeline view
  const timeSlots = [];
  for (let hour = 6; hour <= 21; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    timeSlots.push({
      time: `${displayHour}:00 ${period}`,
      hour24: hour
    });
  };

  // Get appointments for a specific hour
  const getAppointmentsForHour = (hour24) => {
    return sortedAppointments.filter(appointment => {
      const appointmentHour = parseInt(appointment.time.split(':')[0], 10);
      return appointmentHour === hour24;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateDay(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {formatDate(selectedDate)}
              </h2>
              <p className="text-gray-500 text-sm">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
            <button
              onClick={() => navigateDay(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline View
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <FiCalendar className="mx-auto text-gray-400 text-4xl mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments</h3>
            <p className="text-gray-500">No appointments scheduled for this day.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="space-y-3">
            {sortedAppointments.map((appointment) => (
              <div
                key={appointment.id}
                onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {appointment.patientName}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        appointment.status === 'missed'
                          ? 'bg-red-100 text-red-800'
                          : appointment.typeColor === 'teal' 
                            ? 'bg-teal-100 text-teal-800' 
                            : 'bg-purple-100 text-purple-800'
                      }`}>
                        {appointment.type}
                      </span>
                      {appointment.status === 'missed' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Missed
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiClock className="w-4 h-4" />
                      <span>{convertTo12Hour(appointment.time)}</span>
                    </div>
                    
                    {appointment.notes && (
                      <p className="mt-2 text-sm text-gray-600">
                        <strong>Notes:</strong> {appointment.notes}
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick && onAppointmentClick(appointment);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded p-1"
                    title="View details"
                  >
                    <FiMoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Timeline View */
          <div className="w-full">
            {timeSlots.map((slot) => {
              const slotAppointments = getAppointmentsForHour(slot.hour24);
              
              return (
                <div
                  key={slot.hour24}
                  className="flex border-b border-gray-200 hover:bg-gray-50"
                >
                  {/* Time label */}
                  <div className="w-24 p-3 text-sm text-gray-500 font-medium border-r border-gray-200">
                    {slot.time}
                  </div>
                  
                  {/* Appointments */}
                  <div className="flex-1 p-2 min-h-[70px]">
                    {slotAppointments.length > 0 ? (
                      <div className="space-y-2">
                        {slotAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            onClick={() => onAppointmentClick && onAppointmentClick(appointment)}
                            className={`p-3 rounded-lg cursor-pointer group hover:opacity-90 transition-opacity ${
                              appointment.status === 'missed'
                                ? 'bg-red-500 text-white'
                                : appointment.typeColor === 'teal' 
                                  ? 'bg-teal-500 text-white' 
                                  : 'bg-purple-500 text-white'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-sm">
                                  {convertTo12Hour(appointment.time)} - {appointment.patientName}
                                </div>
                                <div className="text-xs opacity-90 mt-1">{appointment.type}</div>
                                {appointment.notes && (
                                  <div className="text-xs opacity-80 mt-1">{appointment.notes}</div>
                                )}
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAppointmentClick && onAppointmentClick(appointment);
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
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyAppointmentsList;
