import React, { useState, useRef, useEffect } from 'react';
import { FiEye, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { IoChevronForward } from 'react-icons/io5';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import BookInvestigationModal from '../../components/BookInvestigationModal';
import AddScheduleModal from '../../components/AddScheduleModal';
import NoShowPatientModal from '../../components/NoShowPatientModal';
import NurseHeader from '../../components/layout/NurseHeader';
import { patientService } from '../../services/patientService';
import { bookingService } from '../../services/bookingService';

const OPDManagement = () => {
  // State for tracking active tabs
  const [activeAppointmentTab, setActiveAppointmentTab] = useState('investigation');
  // State for search query
  const [searchQuery, setSearchQuery] = useState('');
  // State for modals
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedNoShowPatient, setSelectedNoShowPatient] = useState(null);
  const [selectedNoShowAppointmentId, setSelectedNoShowAppointmentId] = useState(null);
  const [selectedNoShowAppointmentType, setSelectedNoShowAppointmentType] = useState(null);
  
  // State for new patients
  const [newPatients, setNewPatients] = useState([]);
  const [loadingNewPatients, setLoadingNewPatients] = useState(false);
  const [newPatientsError, setNewPatientsError] = useState(null);

  // Fetch new patients from API
  const fetchNewPatients = async () => {
    setLoadingNewPatients(true);
    setNewPatientsError(null);
    
    try {
      const result = await patientService.getNewPatients({ limit: 20 });
      
      if (result.success) {
        // Extract patients array from result.data
        const patients = Array.isArray(result.data?.patients) ? result.data.patients : (Array.isArray(result.data) ? result.data : []);
        setNewPatients(patients);
      } else {
        setNewPatientsError(result.error || 'Failed to fetch new patients');
        console.error('Error fetching new patients:', result.error);
      }
    } catch (error) {
      setNewPatientsError('Failed to fetch new patients');
      console.error('Error fetching new patients:', error);
    } finally {
      setLoadingNewPatients(false);
    }
  };

  // Fetch today's appointments
  const fetchTodaysAppointments = async (type = null) => {
    setLoadingAppointments(true);
    setAppointmentsError(null);
    
    try {
      const result = await bookingService.getTodaysAppointments(type);
      
      if (result.success) {
        console.log('✅ OPDManagement: Raw appointments data:', result.data.appointments);
        const appointments = result.data.appointments || [];
        
        // Log the structure of the first appointment if available
        if (appointments.length > 0) {
          console.log('✅ OPDManagement: First appointment structure:', appointments[0]);
          console.log('✅ OPDManagement: First appointment keys:', Object.keys(appointments[0]));
        }
        
        setAppointments(appointments);
        
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

  // Fetch no-show patients
  const fetchNoShowPatients = async (type = null) => {
    setLoadingNoShow(true);
    setNoShowError(null);
    
    try {
      const result = await bookingService.getNoShowPatients(type);
      
      if (result.success) {
        setNoShowPatients(result.data.noShowPatients || []);
      } else {
        setNoShowError(result.error || 'Failed to fetch no-show patients');
        console.error('Error fetching no-show patients:', result.error);
      }
    } catch (error) {
      setNoShowError('Failed to fetch no-show patients');
      console.error('Error fetching no-show patients:', error);
    } finally {
      setLoadingNoShow(false);
    }
  };


  // State for appointments data
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);

  // State for no-show patients data
  const [noShowPatients, setNoShowPatients] = useState([]);
  const [loadingNoShow, setLoadingNoShow] = useState(false);
  const [noShowError, setNoShowError] = useState(null);


  // Load data on component mount
  useEffect(() => {
    fetchNewPatients();
    fetchTodaysAppointments();
    fetchNoShowPatients();
  }, []);


  // Listen for patient added event to refresh new patients list
  useEffect(() => {
    const handlePatientAdded = (event) => {
      console.log('Patient added event received:', event.detail);
      // Refresh new patients list to show the newly added patient
      fetchNewPatients();
    };

    window.addEventListener('patientAdded', handlePatientAdded);
    
    return () => {
      window.removeEventListener('patientAdded', handlePatientAdded);
    };
  }, []);

  // Listen for test result added events to refresh appointments data
  useEffect(() => {
    const handleTestResultAdded = (event) => {
      console.log('Test result added event received in OPD Management:', event.detail);
      // Show brief loading indicator and refresh appointments data to show updated test status
      setLoadingAppointments(true);
      fetchTodaysAppointments(activeAppointmentTab);
    };

    window.addEventListener('testResultAdded', handleTestResultAdded);
    
    return () => {
      window.removeEventListener('testResultAdded', handleTestResultAdded);
    };
  }, [activeAppointmentTab]);

  // Fetch appointments when tab changes
  useEffect(() => {
    fetchTodaysAppointments(activeAppointmentTab);
  }, [activeAppointmentTab]);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get PSA color based on threshold
  const getPSAColor = (psaValue) => {
    const psa = parseFloat(psaValue);
    if (isNaN(psa)) return { dotColor: 'bg-gray-400', textColor: 'text-gray-900' };
    
    if (psa > 4) {
      return { dotColor: 'bg-red-500', textColor: 'text-gray-900' };
    } else {
      return { dotColor: 'bg-green-500', textColor: 'text-gray-900' };
    }
  };

  // Format date for display (DD/MM/YYYY format)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle different date formats
      let date;
      if (typeof dateString === 'string') {
        // If it's already in YYYY-MM-DD format, parse it directly
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-');
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return dateString;
      }
      
      // Format as DD/MM/YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Date formatting error:', error, 'Input:', dateString);
      return dateString;
    }
  };

  // Format time for display (HH:MM AM/PM format)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      // If timeString is already in HH:MM format, convert to 12-hour format
      if (timeString.match(/^\d{2}:\d{2}$/)) {
        const [hours, minutes] = timeString.split(':');
        const hour24 = parseInt(hours, 10);
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes} ${ampm}`;
      }
      // If it's a full datetime string, extract time part
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        console.error('Invalid time:', timeString);
        return timeString;
      }
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Time formatting error:', error, 'Input:', timeString);
      return timeString;
    }
  };

  // Get pathway status styling
  const getPathwayStatusStyle = (status) => {
    switch (status) {
      case 'Surgical':
        return 'bg-blue-100 text-blue-800';
      case 'Postop Followup':
        return 'bg-green-100 text-green-800';
      case 'Investigation':
        return 'bg-purple-100 text-purple-800';
      case 'Urology':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get appointment type styling
  const getAppointmentTypeStyle = (type) => {
    switch (type) {
      case 'investigation':
        return 'bg-purple-100 text-purple-800';
      case 'urologist':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon for investigation procedures
  const getStatusIcon = (testType, appointment) => {
    // Use the test result status from the appointment data (from backend)
    const testStatus = appointment[testType];
    
    if (testStatus === 'completed') {
      return (
        <div className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-xs text-gray-500 font-medium">N/A</span>
        </div>
      );
    }
  };

  // Handle patient actions
  const handleViewEdit = async (patientOrAppointment) => {
    console.log('🔍 OPDManagement: handleViewEdit called with:', patientOrAppointment);
    console.log('🔍 OPDManagement: Object keys:', Object.keys(patientOrAppointment));
    
    let patientData = null;
    
    // Check if this is an appointment object (has appointment-specific fields)
    const isAppointment = patientOrAppointment.patientName || patientOrAppointment.appointmentDate || patientOrAppointment.appointmentTime;
    
    if (isAppointment) {
      // This is an appointment object - we need to fetch the patient details
      let patientId = patientOrAppointment.patient_id || patientOrAppointment.patientId || patientOrAppointment.patientID;
      
      console.log('🔍 OPDManagement: This is an appointment object, patient ID:', patientId);
      
      // If no patient ID, try to find the patient by UPI
      if (!patientId && patientOrAppointment.upi) {
        try {
          console.log('🔍 OPDManagement: No patient ID, searching by UPI:', patientOrAppointment.upi);
          const searchResult = await patientService.getPatients({ search: patientOrAppointment.upi });
          
          if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
            // Find exact match by UPI
            const matchedPatient = searchResult.data.find(p => p.upi === patientOrAppointment.upi);
            if (matchedPatient && matchedPatient.id) {
              patientId = matchedPatient.id;
              console.log('✅ OPDManagement: Found patient by UPI, ID:', patientId);
            }
          }
        } catch (error) {
          console.error('❌ OPDManagement: Error searching by UPI:', error);
        }
      }
      
      if (patientId) {
        try {
          // Fetch patient details from API
          console.log('🔍 OPDManagement: Fetching patient details for ID:', patientId);
          const result = await patientService.getPatientById(patientId);
          
          if (result.success && result.data) {
            const fullPatientData = result.data;
            console.log('✅ OPDManagement: Fetched patient data:', fullPatientData);
            
            // Merge with appointment data for context
            patientData = {
              ...fullPatientData,
              fullName: fullPatientData.fullName || `${fullPatientData.firstName || fullPatientData.first_name || ''} ${fullPatientData.lastName || fullPatientData.last_name || ''}`.trim(),
              appointmentId: patientOrAppointment.id,
              appointmentDate: patientOrAppointment.appointmentDate,
              appointmentTime: patientOrAppointment.appointmentTime,
              urologist: patientOrAppointment.urologist,
              status: patientOrAppointment.status,
              type: patientOrAppointment.type,
              mri: patientOrAppointment.mri,
              biopsy: patientOrAppointment.biopsy,
              trus: patientOrAppointment.trus
            };
          } else {
            console.error('❌ OPDManagement: Failed to fetch patient:', result.error);
            // Fallback to appointment data
            patientData = {
              id: patientId,
              name: patientOrAppointment.patientName,
              fullName: patientOrAppointment.patientName,
              age: patientOrAppointment.age,
              gender: patientOrAppointment.gender,
              upi: patientOrAppointment.upi,
              psa: patientOrAppointment.psa,
              appointmentId: patientOrAppointment.id,
              appointmentDate: patientOrAppointment.appointmentDate,
              appointmentTime: patientOrAppointment.appointmentTime,
              urologist: patientOrAppointment.urologist,
              status: patientOrAppointment.status,
              type: patientOrAppointment.type
            };
          }
        } catch (error) {
          console.error('❌ OPDManagement: Error fetching patient:', error);
          // Fallback to appointment data
          patientData = {
            id: patientId,
            name: patientOrAppointment.patientName,
            fullName: patientOrAppointment.patientName,
            age: patientOrAppointment.age,
            gender: patientOrAppointment.gender,
            upi: patientOrAppointment.upi,
            psa: patientOrAppointment.psa,
            appointmentId: patientOrAppointment.id,
            appointmentDate: patientOrAppointment.appointmentDate,
            appointmentTime: patientOrAppointment.appointmentTime,
            urologist: patientOrAppointment.urologist,
            status: patientOrAppointment.status,
            type: patientOrAppointment.type
          };
        }
      } else {
        console.error('❌ OPDManagement: No patient ID found in appointment!');
        console.error('Available fields:', Object.keys(patientOrAppointment));
        // Fallback: create a minimal patient object from appointment data
        patientData = {
          name: patientOrAppointment.patientName,
          fullName: patientOrAppointment.patientName,
          age: patientOrAppointment.age,
          gender: patientOrAppointment.gender,
          upi: patientOrAppointment.upi,
          psa: patientOrAppointment.psa,
          appointmentId: patientOrAppointment.id,
          appointmentDate: patientOrAppointment.appointmentDate,
          appointmentTime: patientOrAppointment.appointmentTime,
          urologist: patientOrAppointment.urologist,
          status: patientOrAppointment.status,
          type: patientOrAppointment.type
        };
      }
    } else {
      // This is already a patient object from the new patients list
      console.log('✅ OPDManagement: This is a patient object');
      patientData = patientOrAppointment;
    }
    
    if (patientData) {
      console.log('✅ OPDManagement: Final patient data:', patientData);
      console.log('✅ OPDManagement: Patient ID:', patientData.id);
      setSelectedPatient(patientData);
      setIsPatientDetailsModalOpen(true);
    } else {
      console.error('❌ OPDManagement: Could not prepare patient data!');
    }
  };

  const handleBookInvestigation = (patient) => {
    setSelectedPatient(patient);
    setIsInvestigationModalOpen(true);
  };

  const handleBookUrologist = (patient) => {
    setSelectedPatient(patient);
    setIsScheduleModalOpen(true);
  };

  const handleNoShowClick = (patient, appointmentId, appointmentType) => {
    setSelectedNoShowPatient(patient);
    setSelectedNoShowAppointmentId(appointmentId);
    setSelectedNoShowAppointmentType(appointmentType);
    setIsNoShowModalOpen(true);
  };

  const handleNoShowReschedule = async (patientId, rescheduleData) => {
    console.log('Rescheduling no-show patient:', patientId, rescheduleData);
    
    try {
      // The API call is already made in the RescheduleConfirmationModal
      // Here we just need to refresh the data to reflect the changes
      await refreshAllData();
      
      // Show success message
      console.log('Patient rescheduled successfully:', rescheduleData);
      
    } catch (error) {
      console.error('Error handling reschedule:', error);
    }
  };

  const handleAddTimelineEntry = (patientId, entry) => {
    console.log('Adding timeline entry for patient:', patientId, entry);
    // In a real app, this would make an API call to save the timeline entry
    // For now, we'll just log it
  };

  // Refresh new patients list
  const refreshNewPatients = () => {
    fetchNewPatients();
  };

  // Refresh all appointment data
  const refreshAllData = () => {
    fetchTodaysAppointments(activeAppointmentTab);
    fetchNoShowPatients();
    fetchNewPatients();
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <NurseHeader 
          title="OPD Management"
          subtitle="Track patients in OPD queue and manage consultation flow"
          onSearch={setSearchQuery}
          searchPlaceholder="Search patients by name, UPI, or status"
        />

        {/* Main Layout Grid - 3 columns like urologist dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Takes 2/3 width */}
          <div className="xl:col-span-2 space-y-4 lg:space-y-6">
            {/* Today's Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today's Appointments</h2>
                  <div className="flex items-center space-x-3">
                    {/* Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveAppointmentTab('investigation')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        activeAppointmentTab === 'investigation'
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Investigation
                    </button>
                    <button
                      onClick={() => setActiveAppointmentTab('urologist')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        activeAppointmentTab === 'urologist'
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Urologist
                    </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {activeAppointmentTab === 'investigation' ? (
                        <>
                          <th className="text-left py-3 px-3 font-medium text-gray-600 text-xs w-[22%]">PATIENT</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600 text-xs w-[12%]">DATE</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600 text-xs w-[14%]">UROLOGIST</th>
                          <th className="text-center py-3 px-1 font-medium text-gray-600 text-xs w-[7%]">
                            <div className="flex justify-center items-center">MRI</div>
                          </th>
                          <th className="text-center py-3 px-1 font-medium text-gray-600 text-xs w-[7%]">
                            <div className="flex justify-center items-center">BIOPSY</div>
                          </th>
                          <th className="text-center py-3 px-1 font-medium text-gray-600 text-xs w-[7%]">
                            <div className="flex justify-center items-center">TRUS</div>
                          </th>
                          <th className="text-center py-3 px-1 font-medium text-gray-600 text-xs w-[23%]">ACTIONS</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-3 px-3 font-medium text-gray-600 text-xs w-[22%]">PATIENT</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600 text-xs w-[20%]">DATE OF APPOINTMENT</th>
                          <th className="text-left py-3 px-2 font-medium text-gray-600 text-xs w-[20%]">UROLOGIST</th>
                          <th className="text-center py-3 px-1 font-medium text-gray-600 text-xs w-[26%]">ACTIONS</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAppointments ? (
                      <tr>
                        <td colSpan={activeAppointmentTab === 'investigation' ? "7" : "4"} className="text-center py-8">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                            <span className="text-gray-600 text-sm">Loading appointments...</span>
                          </div>
                        </td>
                      </tr>
                    ) : appointmentsError ? (
                      <tr>
                        <td colSpan={activeAppointmentTab === 'investigation' ? "7" : "4"} className="text-center py-8">
                          <div className="text-red-600 text-sm mb-2">{appointmentsError}</div>
                          <button
                            onClick={() => fetchTodaysAppointments(activeAppointmentTab)}
                            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    ) : appointments.filter(apt => apt.type === activeAppointmentTab && apt.status !== 'no_show').length === 0 ? (
                      <tr>
                        <td colSpan={activeAppointmentTab === 'investigation' ? "7" : "4"} className="text-center py-8 text-gray-500 text-sm">
                          No {activeAppointmentTab} appointments found
                        </td>
                      </tr>
                    ) : (
                      appointments.filter(apt => apt.type === activeAppointmentTab && apt.status !== 'no_show').map((appointment) => (
                        <tr key={appointment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                {getInitials(appointment.patientName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 text-xs truncate">{appointment.patientName}</div>
                                <div className="text-xs text-gray-600 truncate">
                                  {appointment.age} • {appointment.gender}
                                </div>
                                <div className="flex items-center mt-0.5">
                                  <div className={`w-1 h-1 ${getPSAColor(appointment.psa).dotColor} rounded-full mr-1 flex-shrink-0`}></div>
                                  <span className={`text-xs ${getPSAColor(appointment.psa).textColor}`}>PSA: {appointment.psa}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-700 text-xs">
                            <div className="font-medium truncate">{formatDate(appointment.appointmentDate)}</div>
                            <div className="text-xs text-gray-500 truncate">{formatTime(appointment.appointmentTime)}</div>
                          </td>
                          {activeAppointmentTab === 'investigation' ? (
                            <>
                              <td className="py-3 px-2 text-gray-700 text-xs">
                                <div className="truncate">{appointment.urologist}</div>
                              </td>
                              <td className="py-3 px-1">
                                <div className="flex justify-center items-center">
                                  {getStatusIcon('mri', appointment)}
                                </div>
                              </td>
                              <td className="py-3 px-1">
                                <div className="flex justify-center items-center">
                                  {getStatusIcon('biopsy', appointment)}
                                </div>
                              </td>
                              <td className="py-3 px-1">
                                <div className="flex justify-center items-center">
                                  {getStatusIcon('trus', appointment)}
                                </div>
                              </td>
                            </>
                          ) : (
                            <td className="py-3 px-2 text-gray-700 text-xs">
                              <div className="truncate">{appointment.urologist}</div>
                            </td>
                          )}
                          <td className="py-2 px-1 text-center">
                            <div className="flex flex-row gap-0.5 justify-center items-center">
                              <button
                                onClick={() => handleViewEdit(appointment)}
                                className="px-1.5 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 transition-colors flex items-center space-x-0.5"
                                title="View/Edit"
                              >
                                <FiEye className="w-3 h-3" />
                                <span className="text-xs">View/Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* No Show Patients - Side by Side under appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Investigation No Show */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Investigation No Show</h2>
                </div>
                <div className="p-4">
                  {loadingNoShow ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading no-show patients...</span>
                      </div>
                    </div>
                  ) : noShowError ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="text-red-600 text-sm mb-2">{noShowError}</div>
                        <button
                          onClick={() => fetchNoShowPatients('investigation')}
                          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : noShowPatients.filter(patient => patient.appointmentType === 'investigation').length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No investigation no-show patients
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {noShowPatients.filter(patient => patient.appointmentType === 'investigation').map((patient) => (
                        <div 
                          key={patient.id} 
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 hover:shadow-md transition-all duration-200 cursor-pointer group" 
                          onClick={() => handleNoShowClick(patient, patient.id, patient.appointmentType)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 font-semibold text-xs transition-colors">
                              {getInitials(patient.name)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm group-hover:text-gray-800 transition-colors">{patient.name}</div>
                              <div className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">
                                {formatDate(patient.scheduledDate)} at {formatTime(patient.scheduledTime)}
                              </div>
                            </div>
                          </div>
                          <div className="text-teal-600 group-hover:text-teal-700 transition-colors">
                            <IoChevronForward className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Urologist No Show */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Urologist No Show</h2>
                </div>
                <div className="p-4">
                  {loadingNoShow ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading no-show patients...</span>
                      </div>
                    </div>
                  ) : noShowError ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="text-red-600 text-sm mb-2">{noShowError}</div>
                        <button
                          onClick={() => fetchNoShowPatients('urologist')}
                          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : noShowPatients.filter(patient => patient.appointmentType === 'urologist').length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No urologist no-show patients
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                      {noShowPatients.filter(patient => patient.appointmentType === 'urologist').map((patient) => (
                        <div 
                          key={patient.id} 
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 hover:shadow-md transition-all duration-200 cursor-pointer group" 
                          onClick={() => handleNoShowClick(patient, patient.id, patient.appointmentType)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-full flex items-center justify-center text-red-600 font-semibold text-xs transition-colors">
                              {getInitials(patient.name)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm group-hover:text-gray-800 transition-colors">{patient.name}</div>
                              <div className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">
                                {formatDate(patient.scheduledDate)} at {formatTime(patient.scheduledTime)}
                              </div>
                            </div>
                          </div>
                          <div className="text-teal-600 group-hover:text-teal-700 transition-colors">
                            <IoChevronForward className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Takes 1/3 width - New Patients */}
          <div className="xl:col-span-1 space-y-4 lg:space-y-6">
            {/* New Patients */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">New Patients</h2>
              </div>
              <div className="p-4">
                <div className="space-y-4 max-h-[58vh] overflow-y-auto">
                  {loadingNewPatients ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading new patients...</span>
                      </div>
                    </div>
                  ) : newPatientsError ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="text-red-600 text-sm mb-2">{newPatientsError}</div>
                        <button
                          onClick={fetchNewPatients}
                          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  ) : newPatients.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="text-gray-500 text-sm mb-2">No new patients found</div>
                        <div className="text-gray-400 text-xs">New patients will appear here when added to the system</div>
                      </div>
                    </div>
                  ) : (
                    newPatients.map((patient) => (
                      <div key={patient.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {getInitials(patient.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium text-gray-900 text-sm">{patient.name}</div>
                              {patient.referredByGP && (
                                <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs rounded-full font-medium">
                                  GP Referral
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 mb-1">
                              UPI: {patient.upi} • Age: {patient.age} • {patient.gender}
                            </div>
                            {patient.referredByGP && (
                              <div className="text-xs text-teal-600 mb-1">
                                Referred by: {patient.referredByGP}
                              </div>
                            )}
                            {patient.assignedUrologist && (
                              <div className="text-xs text-gray-600 mb-1">
                                Urologist: {patient.assignedUrologist}
                              </div>
                            )}
                            <div className="flex items-center mb-1">
                              <div className={`w-2 h-2 ${getPSAColor(patient.psa).dotColor} rounded-full mr-2 flex-shrink-0`}></div>
                              <span className={`text-xs ${getPSAColor(patient.psa).textColor}`}>PSA: {patient.psa} ng/mL</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Entry: {patient.dateOfEntry}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1 ml-3 flex-shrink-0">
                          <button
                            onClick={() => handleViewEdit(patient)}
                            className="px-3 py-1.5 bg-white text-teal-600 text-xs rounded-md border border-teal-600 hover:bg-teal-50 transition-colors whitespace-nowrap"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleBookInvestigation(patient)}
                            className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors whitespace-nowrap"
                          >
                            Book Investigation
                          </button>
                          <button
                            onClick={() => handleBookUrologist(patient)}
                            className="px-3 py-1.5 bg-teal-50 text-teal-600 text-xs rounded-md border border-teal-200 hover:bg-teal-100 transition-colors whitespace-nowrap"
                          >
                            Book Urologist
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Nurse Patient Details Modal */}
      <NursePatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
      />

      {/* Book Investigation Modal */}
      <BookInvestigationModal 
        isOpen={isInvestigationModalOpen}
        onClose={() => setIsInvestigationModalOpen(false)}
        patient={selectedPatient}
        onSuccess={(data) => {
          console.log('Investigation booked:', data);
          setIsInvestigationModalOpen(false);
          // Refresh all appointment data to show the new booking
          refreshAllData();
        }}
      />

      {/* Schedule Modal */}
      <AddScheduleModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        patient={selectedPatient}
        onSuccess={(data) => {
          console.log('Urologist appointment booked:', data);
          setIsScheduleModalOpen(false);
          // Refresh all appointment data to show the new booking
          refreshAllData();
        }}
      />

      {/* No Show Patient Modal */}
      <NoShowPatientModal 
        isOpen={isNoShowModalOpen}
        onClose={() => {
          setIsNoShowModalOpen(false);
          setSelectedNoShowPatient(null);
          setSelectedNoShowAppointmentId(null);
          setSelectedNoShowAppointmentType(null);
        }}
        patient={selectedNoShowPatient}
        appointmentId={selectedNoShowAppointmentId}
        appointmentType={selectedNoShowAppointmentType}
        onReschedule={handleNoShowReschedule}
        onAddTimelineEntry={handleAddTimelineEntry}
        onSuccess={refreshAllData}
      />
    </div>
  );
};

export default OPDManagement;