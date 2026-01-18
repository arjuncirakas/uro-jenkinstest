import React, { useState, useEffect } from 'react';
import { IoCalendar, IoTime, IoPerson, IoDocument, IoChevronDown } from 'react-icons/io5';
import { FiCalendar, FiClock, FiUser, FiEdit2 } from 'react-icons/fi';
import BookInvestigationModal from './BookInvestigationModal';
import AddScheduleModal from './AddScheduleModal';
import UpdateAppointmentModal from './UpdateAppointmentModal';
import { bookingService } from '../services/bookingService';

const AppointmentBookingSection = ({ 
  patient, 
  onAppointmentBooked,
  onRefresh,
  // Props for showing "Other Test Results & Reports" when appointment date has passed
  showTestResults,
  testResultsContent,
  // Test results data to check if results exist
  otherTestResults = [],
  investigationRequests = []
}) => {
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
  const [isUrologistModalOpen, setIsUrologistModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [appointmentType, setAppointmentType] = useState(null); // 'investigation' or 'urologist'
  const [appointmentDetails, setAppointmentDetails] = useState(null);

  // Check if patient has investigation or urologist appointment
  useEffect(() => {
    if (!patient) {
      setAppointmentType(null);
      setAppointmentDetails(null);
      return;
    }

    // Check for next appointment from patient object
    // Try both snake_case and camelCase variants
    const nextAppointmentDate = patient.next_appointment_date || patient.nextAppointmentDate;
    const nextAppointmentType = patient.next_appointment_type || patient.nextAppointmentType;
    const nextAppointmentTime = patient.next_appointment_time || patient.nextAppointmentTime;
    const nextAppointmentUrologist = patient.next_appointment_urologist || patient.nextAppointmentUrologist || patient.next_appointment_urologist_name || patient.nextAppointmentUrologistName;
    const nextAppointmentId = patient.next_appointment_id || patient.nextAppointmentId;

    // Only check for investigation or urologist appointments (not surgery appointments)
    if (nextAppointmentDate && (nextAppointmentType === 'investigation' || nextAppointmentType === 'urologist')) {
      setAppointmentType(nextAppointmentType);
      setAppointmentDetails({
        date: nextAppointmentDate,
        time: nextAppointmentTime,
        urologist: nextAppointmentUrologist,
        id: nextAppointmentId
      });
    } else {
      setAppointmentType(null);
      setAppointmentDetails(null);
    }
  }, [patient]);

  // Check if appointment date has passed
  const isAppointmentDatePassed = () => {
    if (!appointmentDetails?.date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointmentDate = new Date(appointmentDetails.date);
    appointmentDate.setHours(0, 0, 0, 0);
    
    return appointmentDate < today;
  };

  // Check if test results exist (uploaded from investigation management or anywhere)
  const hasTestResults = () => {
    // Check if there are any test results
    if (otherTestResults && otherTestResults.length > 0) {
      return true;
    }
    
    // Check if there are investigation requests with results
    if (investigationRequests && investigationRequests.length > 0) {
      // Check if any investigation request has results uploaded
      return investigationRequests.some(request => {
        const investigationName = (request.investigationName || request.investigation_name || '').trim().toUpperCase();
        return otherTestResults && otherTestResults.some(result => {
          const resultName = (result.testName || result.test_name || '').trim().toUpperCase();
          const resultType = (result.testType || result.test_type || '').trim().toUpperCase();
          return resultName === investigationName || resultType === investigationName;
        });
      });
    }
    
    return false;
  };

  const handleInvestigationBooked = (data) => {
    setIsInvestigationModalOpen(false);
    if (onAppointmentBooked) {
      onAppointmentBooked(data);
    }
    if (onRefresh) {
      // Add small delay to ensure backend has processed the appointment
      setTimeout(() => {
        onRefresh();
      }, 500);
    }
  };

  const handleUrologistBooked = (data) => {
    setIsUrologistModalOpen(false);
    if (onAppointmentBooked) {
      onAppointmentBooked(data);
    }
    if (onRefresh) {
      // Add small delay to ensure backend has processed the appointment
      setTimeout(() => {
        onRefresh();
      }, 500);
    }
  };

  const handleUpdateSuccess = (data) => {
    setIsUpdateModalOpen(false);
    if (onAppointmentBooked) {
      onAppointmentBooked(data);
    }
    if (onRefresh) {
      // Add small delay to ensure backend has processed the appointment
      setTimeout(() => {
        onRefresh();
      }, 500);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    // Handle both "HH:MM:SS" and "HH:MM" formats
    const time = timeString.split(':');
    if (time.length >= 2) {
      return `${time[0]}:${time[1]}`;
    }
    return timeString;
  };

  // If appointment is booked AND (appointment date has passed OR test results exist), show test results
  if (appointmentType && showTestResults && (isAppointmentDatePassed() || hasTestResults())) {
    return testResultsContent;
  }

  // If no appointment booked, show booking options
  if (!appointmentType) {
    return (
      <>
        <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <IoCalendar className="mr-2 text-teal-600" />
              Book Appointment
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Schedule an investigation or urologist appointment to proceed
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Investigation Appointment Booking */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900 mb-1 flex items-center">
                      <IoDocument className="mr-2 text-teal-600" />
                      Investigation Appointment
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Book an appointment for investigations such as MRI, TRUS, or Biopsy
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInvestigationModalOpen(true)}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <FiCalendar className="w-4 h-4" />
                  <span>Book Investigation</span>
                </button>
              </div>

              {/* Urologist Appointment Booking */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900 mb-1 flex items-center">
                      <IoPerson className="mr-2 text-teal-600" />
                      Urologist Consultation
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Book a consultation appointment with a urologist
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUrologistModalOpen(true)}
                  className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <FiCalendar className="w-4 h-4" />
                  <span>Book Urologist Appointment</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Investigation Booking Modal */}
        <BookInvestigationModal
          isOpen={isInvestigationModalOpen}
          onClose={() => setIsInvestigationModalOpen(false)}
          patient={patient}
          onSuccess={handleInvestigationBooked}
        />

        {/* Urologist Booking Modal */}
        <AddScheduleModal
          isOpen={isUrologistModalOpen}
          onClose={() => setIsUrologistModalOpen(false)}
          patient={patient}
          onSuccess={handleUrologistBooked}
        />
      </>
    );
  }

  // If appointment is booked and date hasn't passed, show appointment details with rescheduling
  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <IoCalendar className="mr-2 text-teal-600" />
              Appointment Details
            </h3>
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium flex items-center space-x-1.5"
            >
              <FiEdit2 className="w-4 h-4" />
              <span>Reschedule</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Appointment Type Badge */}
            <div className="flex items-center justify-start">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                appointmentType === 'investigation' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-teal-100 text-teal-700'
              }`}>
                {appointmentType === 'investigation' ? 'Investigation Appointment' : 'Urologist Consultation'}
              </span>
            </div>

            {/* Appointment Details Card */}
            <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-200 rounded-lg p-5">
              <div className="space-y-4">
                {/* Date */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <FiCalendar className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Appointment Date</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(appointmentDetails.date)}
                    </p>
                  </div>
                </div>

                {/* Time */}
                {appointmentDetails.time && (
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <FiClock className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Appointment Time</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatTime(appointmentDetails.time)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Urologist/Doctor */}
                {appointmentDetails.urologist && (
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <FiUser className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        {appointmentType === 'investigation' ? 'Investigation Doctor' : 'Urologist'}
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {appointmentDetails.urologist}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Test results and reports will be available after the appointment date.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Update Appointment Modal */}
      <UpdateAppointmentModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        patient={{
          ...patient,
          nextAppointmentDate: appointmentDetails?.date,
          nextAppointmentTime: appointmentDetails?.time,
          nextAppointmentType: appointmentType,
          nextAppointmentUrologist: appointmentDetails?.urologist,
          nextAppointmentId: appointmentDetails?.id,
          hasAppointment: true
        }}
        onSuccess={handleUpdateSuccess}
        appointmentType={appointmentType}
      />
    </>
  );
};

export default AppointmentBookingSection;
