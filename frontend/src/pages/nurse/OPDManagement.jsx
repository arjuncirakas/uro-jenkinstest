import React, { useState, useRef, useEffect } from 'react';
import { IoChevronForward } from 'react-icons/io5';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import BookInvestigationModal from '../../components/BookInvestigationModal';
import AddScheduleModal from '../../components/AddScheduleModal';
import NoShowPatientModal from '../../components/NoShowPatientModal';
import NurseHeader from '../../components/layout/NurseHeader';
import { patientService } from '../../services/patientService';
import { bookingService } from '../../services/bookingService';
import { getPSAStatusByAge } from '../../utils/psaStatusByAge';

const OPDManagement = () => {
  // State for tracking active tabs
  const [activeAppointmentTab, setActiveAppointmentTab] = useState('investigation');
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

  // Helper function to filter appointments by tab type
  const filterAppointmentsByTab = (appointments, tabType) => {
    return appointments.filter(apt => {
      if (apt.status === 'no_show') return false;

      const isFollowUp = apt.type === 'automatic' || apt.appointment_type === 'automatic';

      if (tabType === 'investigation') {
        // Show investigation appointments and follow-up appointments
        return apt.type === 'investigation' || isFollowUp;
      } else if (tabType === 'urologist') {
        // Show urologist appointments and follow-up appointments
        return apt.type === 'urologist' || isFollowUp;
      }
      return false;
    });
  };

  // Fetch today's appointments
  const fetchTodaysAppointments = async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);

    try {
      // Fetch all appointments, filtering will be done on frontend
      const result = await bookingService.getTodaysAppointments(null);

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

  // State for upcoming appointments - MUST be declared before useEffect
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState(null);
  const [upcomingLimit, setUpcomingLimit] = useState(3); // Start with 3 items
  const [upcomingOffset, setUpcomingOffset] = useState(0);
  const [hasMoreUpcoming, setHasMoreUpcoming] = useState(true);
  const upcomingScrollRef = useRef(null);
  const observerRef = useRef(null);
  const lastItemRef = useRef(null);

  // Use refs to track state to avoid dependency issues
  const isLoadingRef = useRef(false);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  // Fetch upcoming appointments
  const fetchUpcomingAppointments = async (reset = false) => {
    // Don't load if already loading
    if (isLoadingRef.current) return;

    if (reset) {
      offsetRef.current = 0;
      setUpcomingOffset(0);
      setUpcomingAppointments([]);
      hasMoreRef.current = true;
      setHasMoreUpcoming(true);
      setInitialLoading(true);
    }

    isLoadingRef.current = true;
    setLoadingUpcoming(true);
    setUpcomingError(null);

    try {
      const currentOffset = reset ? 0 : offsetRef.current;
      const limit = reset ? 3 : 10; // First load: 3 items, subsequent: 10 items

      const result = await bookingService.getUpcomingAppointments({
        limit: limit,
        offset: currentOffset,
        // Show all appointment types (not just follow-ups) for the next 3 weeks
        days: 21
      });

      if (result.success) {
        const newAppointments = result.data.appointments || [];

        if (reset) {
          setUpcomingAppointments(newAppointments);
        } else {
          setUpcomingAppointments(prev => [...prev, ...newAppointments]);
        }

        hasMoreRef.current = result.data.hasMore || false;
        setHasMoreUpcoming(hasMoreRef.current);

        if (hasMoreRef.current) {
          offsetRef.current = currentOffset + limit;
          setUpcomingOffset(offsetRef.current);
        }
      } else {
        setUpcomingError(result.error || 'Failed to fetch upcoming appointments');
      }
    } catch (error) {
      setUpcomingError('Failed to fetch upcoming appointments');
      console.error('Error fetching upcoming appointments:', error);
    } finally {
      isLoadingRef.current = false;
      setLoadingUpcoming(false);
      setInitialLoading(false);
    }
  };

  // Setup Intersection Observer for lazy loading
  useEffect(() => {
    // Store the function reference to avoid closure issues
    const loadMore = () => {
      if (hasMoreRef.current && !isLoadingRef.current) {
        fetchUpcomingAppointments(false);
      }
    };

    if (!lastItemRef.current || !hasMoreRef.current || isLoadingRef.current) return;

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting) {
          loadMore();
        }
      },
      {
        root: upcomingScrollRef.current,
        rootMargin: '100px', // Start loading 100px before reaching the bottom
        threshold: 0.1
      }
    );

    // Observe the last item
    if (lastItemRef.current) {
      observerRef.current.observe(lastItemRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [upcomingAppointments.length]);


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
    fetchUpcomingAppointments(true);
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

  // Listen for appointment booking events to refresh new patients list
  // When an appointment is booked, the patient should be removed from new patients list
  // Listen for appointment booking events to refresh new patients list
  // When an appointment is booked, the patient should be removed from new patients list
  useEffect(() => {
    const handleAppointmentBooked = (event) => {
      console.log('Appointment booked event received in OPD Management:', event.detail);
      // Refresh new patients list to remove patients who now have appointments
      // Refresh appointments to show the new booking
          // Add a delay to ensure backend has processed the appointment
          setTimeout(() => {
            fetchNewPatients();
            fetchTodaysAppointments();
          }, 800);
    };

    window.addEventListener('appointment:updated', handleAppointmentBooked);
    window.addEventListener('appointment:booked', handleAppointmentBooked);
    window.addEventListener('investigationBooked', handleAppointmentBooked);

    return () => {
      window.removeEventListener('appointment:updated', handleAppointmentBooked);
      window.removeEventListener('appointment:booked', handleAppointmentBooked);
      window.removeEventListener('investigationBooked', handleAppointmentBooked);
    };
  }, [activeAppointmentTab]);

  // Listen for test result added events to refresh appointments data
  useEffect(() => {
    const handleTestResultAdded = (event) => {
      console.log('Test result added event received in OPD Management:', event.detail);
      // Show brief loading indicator and refresh appointments data to show updated test status
      setLoadingAppointments(true);
      fetchTodaysAppointments();
    };

    window.addEventListener('testResultAdded', handleTestResultAdded);

    return () => {
      window.removeEventListener('testResultAdded', handleTestResultAdded);
    };
  }, [activeAppointmentTab]);

  // Note: No need to refetch when tab changes since we filter on frontend

  // Listen for patient update events to refresh all data
  useEffect(() => {
    const handlePatientUpdated = (event) => {
      console.log('Patient updated event received, refreshing all data:', event.detail);
      // Refresh all data to show updated patient information
      refreshAllData();
    };

    window.addEventListener('patient:updated', handlePatientUpdated);

    return () => {
      window.removeEventListener('patient:updated', handlePatientUpdated);
    };
  }, []);

  // Listen for patient deletion events to refresh all data
  useEffect(() => {
    const handlePatientDeleted = (event) => {
      console.log('Patient deleted event received, refreshing all data:', event.detail);
      // Refresh all data to remove deleted patient from all lists
      refreshAllData();

      // Close modals if the deleted patient was selected
      if (selectedPatient && selectedPatient.id === event.detail.patientId) {
        setIsPatientDetailsModalOpen(false);
        setIsInvestigationModalOpen(false);
        setIsScheduleModalOpen(false);
        setIsNoShowModalOpen(false);
        setSelectedPatient(null);
        setSelectedNoShowPatient(null);
        setSelectedNoShowAppointmentId(null);
        setSelectedNoShowAppointmentType(null);
      }
    };

    window.addEventListener('patientDeleted', handlePatientDeleted);

    return () => {
      window.removeEventListener('patientDeleted', handlePatientDeleted);
    };
  }, [selectedPatient]);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get PSA color based on age-adjusted threshold
  const getPSAColor = (psaValue, patientAge) => {
    const psa = parseFloat(psaValue);
    if (isNaN(psa)) return { dotColor: 'bg-gray-400', textColor: 'text-gray-900' };

    // Use age-based status determination
    const statusResult = getPSAStatusByAge(psa, patientAge);
    const status = statusResult.status;
    
    // Determine color based on status
    if (status === 'High') {
      return { dotColor: 'bg-red-500', textColor: 'text-gray-900' };
    } else if (status === 'Elevated') {
      return { dotColor: 'bg-orange-500', textColor: 'text-gray-900' };
    } else if (status === 'Low') {
      return { dotColor: 'bg-yellow-500', textColor: 'text-gray-900' };
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
              trus: patientOrAppointment.trus,
              // Ensure all triage and exam data is included
              triageSymptoms: fullPatientData.triageSymptoms || null,
              dreDone: fullPatientData.dreDone || false,
              dreFindings: fullPatientData.dreFindings || null,
              priorBiopsy: fullPatientData.priorBiopsy || 'no',
              priorBiopsyDate: fullPatientData.priorBiopsyDate || null,
              gleasonScore: fullPatientData.gleasonScore || null,
              comorbidities: fullPatientData.comorbidities || []
            };
          } else {
            console.error('❌ OPDManagement: Failed to fetch patient:', result.error);
            // Fallback to appointment data
            patientData = {
              id: patientId,
              name: patientOrAppointment.patientName,
              fullName: patientOrAppointment.patientName,
              age: patientOrAppointment.age,
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
      refreshAllData();

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
    fetchTodaysAppointments();
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
          hideSearch={true}
        />

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Takes 2/3 width */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Today's Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[32rem]">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today's Appointments</h2>
                  {/* Tabs */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveAppointmentTab('investigation')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeAppointmentTab === 'investigation'
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Investigation
                    </button>
                    <button
                      onClick={() => setActiveAppointmentTab('urologist')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeAppointmentTab === 'urologist'
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Urologist
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="overflow-x-auto h-full">
                  <table className="w-full min-w-[640px]">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="border-b border-gray-200">
                        {activeAppointmentTab === 'investigation' ? (
                          <>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">PATIENT</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">DATE</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">UROLOGIST</th>
                            <th className="text-center py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">MRI</th>
                            <th className="text-center py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">BIOPSY</th>
                            <th className="text-center py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">TRUS</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">ACTIONS</th>
                          </>
                        ) : (
                          <>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">PATIENT</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">DATE OF APPOINTMENT</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">UROLOGIST</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">ACTIONS</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        if (loadingAppointments) {
                          return (
                            <tr>
                              <td colSpan={activeAppointmentTab === 'investigation' ? "7" : "4"} className="text-center py-8">
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                                  <span className="text-gray-600 text-sm">Loading appointments...</span>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        if (appointmentsError) {
                          return (
                            <tr>
                              <td colSpan={activeAppointmentTab === 'investigation' ? "7" : "4"} className="text-center py-8">
                                <div className="text-red-600 text-sm mb-2">{appointmentsError}</div>
                                <button
                                  onClick={() => fetchTodaysAppointments()}
                                  className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                                >
                                  Retry
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        const filteredAppointments = filterAppointmentsByTab(appointments, activeAppointmentTab);

                        if (filteredAppointments.length === 0) {
                          return (
                            <tr>
                              <td colSpan={activeAppointmentTab === 'investigation' ? "7" : "4"} className="text-center py-8 text-gray-500 text-sm">
                                No {activeAppointmentTab} appointments found
                              </td>
                            </tr>
                          );
                        }

                        return filteredAppointments
                          .sort((a, b) => {
                            if (a.appointmentTime && !b.appointmentTime) return -1;
                            if (!a.appointmentTime && b.appointmentTime) return 1;
                            if (a.appointmentTime && b.appointmentTime) return a.appointmentTime.localeCompare(b.appointmentTime);
                            return 0;
                          })
                          .map((appointment, index, array) => {
                            const showSeparator = !appointment.appointmentTime && (index === 0 || array[index - 1].appointmentTime);
                            return (
                              <React.Fragment key={appointment.id}>
                                {showSeparator && (
                                  <tr>
                                    <td colSpan={activeAppointmentTab === 'investigation' ? "7" : "4"} className="bg-slate-100 py-3 px-6 font-bold text-sm text-slate-700 border-y border-slate-200">
                                      <div className="flex items-center">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 mr-2"></div>
                                        Appointments Without Time Slots
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!appointment.appointmentTime ? 'bg-slate-50/50' : ''}`}>
                                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-7 h-7 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                        {getInitials(appointment.patientName)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">{appointment.patientName}</div>
                                        <div className="text-xs text-gray-600 truncate">
                                          {appointment.age} years old
                                        </div>
                                        <div className="flex items-center mt-0.5">
                                          <div className={`w-1 h-1 ${getPSAColor(appointment.psa, appointment.age).dotColor} rounded-full mr-1 flex-shrink-0`}></div>
                                          <span className={`text-xs ${getPSAColor(appointment.psa, appointment.age).textColor}`}>PSA: {appointment.psa}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">
                                    <div className="font-medium truncate">{formatDate(appointment.appointmentDate)}</div>
                                    <div className="text-xs text-gray-500 truncate">{formatTime(appointment.appointmentTime)}</div>
                                  </td>
                                  {activeAppointmentTab === 'investigation' ? (
                                    <>
                                      <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">
                                        <div className="truncate">{appointment.urologist}</div>
                                      </td>
                                      <td className="py-3 sm:py-4 px-3 sm:px-6">
                                        <div className="flex justify-center items-center">
                                          {getStatusIcon('mri', appointment)}
                                        </div>
                                      </td>
                                      <td className="py-3 sm:py-4 px-3 sm:px-6">
                                        <div className="flex justify-center items-center">
                                          {getStatusIcon('biopsy', appointment)}
                                        </div>
                                      </td>
                                      <td className="py-3 sm:py-4 px-3 sm:px-6">
                                        <div className="flex justify-center items-center">
                                          {getStatusIcon('trus', appointment)}
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">
                                      <div className="truncate">{appointment.urologist}</div>
                                    </td>
                                  )}
                                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                                    <button
                                      onClick={() => handleViewEdit(appointment)}
                                      className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors"
                                      aria-label={`View details for ${appointment.patientName}`}
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                </div>
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

          {/* Right Column - Takes 1/3 width */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-6">
            {/* New Patients */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">New Patients</h2>
              </div>
              <div className="p-4 flex-1 overflow-hidden">
                <div className="space-y-4 h-full overflow-y-auto">
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
                      <div key={patient.id} className="relative flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-h-[140px]">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {getInitials(patient.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm mb-1">{patient.name}</div>
                            <div className="text-xs text-gray-600 mb-1">
                              UPI: {patient.upi} • {patient.age} years old
                            </div>
                            {patient.referredByGP && (
                              <div className="text-xs text-teal-600 mb-1">
                                Referred by: {patient.referredByGP}
                              </div>
                            )}
                            {/* Only show GP Referral tag if patient was created by a GP */}
                            {patient.createdByRole === 'gp' && (
                              <div className="text-xs text-teal-600 mb-1">
                                Created by GP
                              </div>
                            )}
                            {patient.assignedUrologist && (
                              <div className="text-xs text-gray-600 mb-1">
                                Urologist: {patient.assignedUrologist}
                              </div>
                            )}
                            <div className="flex items-center mb-1">
                              <div className={`w-2 h-2 ${getPSAColor(patient.psa, patient.age).dotColor} rounded-full mr-2 flex-shrink-0`}></div>
                              <span className={`text-xs ${getPSAColor(patient.psa, patient.age).textColor}`}>PSA: {patient.psa} ng/mL</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Entry: {patient.dateOfEntry}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col ml-3 flex-shrink-0">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handleViewEdit(patient)}
                              className="px-3 py-1.5 bg-white text-teal-600 text-xs rounded-md border border-teal-600 hover:bg-teal-50 transition-colors whitespace-nowrap w-full"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleBookInvestigation(patient)}
                              className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors whitespace-nowrap w-full"
                            >
                              Book Investigation
                            </button>
                            <button
                              onClick={() => handleBookUrologist(patient)}
                              className="px-3 py-1.5 bg-teal-50 text-teal-600 text-xs rounded-md border border-teal-200 hover:bg-teal-100 transition-colors whitespace-nowrap w-full"
                            >
                              Book Urologist
                            </button>
                          </div>
                          {/* Only show GP Referral tag if patient was created by a GP */}
                          {patient.createdByRole === 'gp' && (
                            <div className="absolute bottom-3 right-3 px-2 py-1 bg-green-50 text-green-700 text-xs rounded font-medium text-center whitespace-nowrap">
                              GP Referral
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[32rem]">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
                <p className="text-xs text-gray-500 mt-1">Future appointments (excluding today)</p>
              </div>
              <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
                {/* Appointments List */}
                <div
                  className="space-y-3 flex-1 overflow-y-auto"
                  ref={upcomingScrollRef}
                >
                  {initialLoading ? (
                    // Skeleton Loader
                    <div className="space-y-3">
                      {[...Array(5)].map((_, index) => (
                        <div
                          key={index}
                          className="bg-white border border-gray-200 rounded-lg p-3 animate-pulse"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                              </div>
                              <div className="h-3 bg-gray-200 rounded w-32 mb-2"></div>
                            </div>
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="h-4 bg-gray-200 rounded w-40"></div>
                            <div className="flex items-center justify-between">
                              <div className="h-3 bg-gray-200 rounded w-32"></div>
                              <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : upcomingError ? (
                    <div className="text-center py-8 text-red-500 text-sm">
                      Error: {upcomingError}
                      <button
                        onClick={() => fetchUpcomingAppointments(true)}
                        className="mt-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : upcomingAppointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No upcoming appointments
                    </div>
                  ) : (
                    <>
                      {upcomingAppointments.map((appointment, index) => {
                        const isLastItem = index === upcomingAppointments.length - 1;
                        const isFollowUp = appointment.type === 'automatic' || appointment.typeLabel === 'Follow-up Appointment';

                        return (
                          <div
                            key={appointment.id}
                            ref={isLastItem ? lastItemRef : null}
                            onClick={() => handleViewEdit(appointment)}
                            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-teal-300 transition-all cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatDate(appointment.appointmentDate)}
                                  </span>
                                  {appointment.appointmentTime && (
                                    <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                                      {formatTime(appointment.appointmentTime)}
                                    </span>
                                  )}
                                  {isFollowUp && !appointment.appointmentTime && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                      Follow-up
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {appointment.urologist}
                                </div>
                              </div>
                              <IoChevronForward className="text-gray-400 text-sm flex-shrink-0" />
                            </div>

                            <div className="space-y-1">
                              <div className="font-medium text-gray-900 text-sm">
                                {appointment.patientName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {appointment.age ? `${appointment.age} years old` : 'N/A'}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {loadingUpcoming && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                            <span>Loading more...</span>
                          </div>
                        </div>
                      )}
                    </>
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
          // Add small delay to ensure backend has processed the appointment
          setTimeout(() => {
            refreshAllData();
          }, 800);
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
          // Add small delay to ensure backend has processed the appointment
          setTimeout(() => {
            refreshAllData();
          }, 800);
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