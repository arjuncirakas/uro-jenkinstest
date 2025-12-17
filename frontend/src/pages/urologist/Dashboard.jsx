import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { IoChevronForward, IoNotificationsOutline, IoPersonCircleOutline } from 'react-icons/io5';
import { BsCalendar3 } from 'react-icons/bs';
import NotificationModal from '../../components/NotificationModal';
import PatientsDueForReviewModal from '../../components/PatientsDueForReviewModal';
import PatientDetailsModalWrapper from '../../components/PatientDetailsModalWrapper';
import MDTScheduleDetailsModal from '../../components/MDTScheduleDetailsModal';
import MDTNotesModal from '../../components/MDTNotesModal';
import ProfileDropdown from '../../components/ProfileDropdown';
import GlobalPatientSearch from '../../components/GlobalPatientSearch';
import { bookingService } from '../../services/bookingService';
import { patientService } from '../../services/patientService';
import { mdtService } from '../../services/mdtService';
import authService from '../../services/authService';

const UrologistDashboard = () => {
  // State for tracking active tab
  const [activeTab, setActiveTab] = useState('appointments');
  // State for notification modal
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  // State for profile dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Ref for profile button
  const profileButtonRef = useRef(null);
  // Memoized callback to close profile dropdown
  const handleProfileClose = useCallback(() => {
    setIsProfileOpen(false);
  }, []);
  // State for patients due for review modal
  const [isPatientsReviewOpen, setIsPatientsReviewOpen] = useState(false);
  // Ref for patient details modal wrapper
  const patientModalRef = useRef();
  // State for MDT schedule view (day/week/month)
  const [mdtView, setMdtView] = useState('week');
  // State for notification count
  const [notificationCount, setNotificationCount] = useState(0);
  // State for MDT schedule details modal
  const [isMdtDetailsOpen, setIsMdtDetailsOpen] = useState(false);
  // State for selected MDT schedule
  const [selectedMdtSchedule, setSelectedMdtSchedule] = useState(null);
  // State for MDT notes modal
  const [isMdtNotesOpen, setIsMdtNotesOpen] = useState(false);
  // State for selected MDT outcome
  const [selectedMdtOutcome, setSelectedMdtOutcome] = useState(null);
  // State for surgery view (today/week/month)
  const [surgeryView, setSurgeryView] = useState('today');

  // State for appointments data
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);

  // State for surgical queue data
  const [surgicalQueue, setSurgicalQueue] = useState([]);
  const [loadingSurgicalQueue, setLoadingSurgicalQueue] = useState(false);
  const [surgicalQueueError, setSurgicalQueueError] = useState(null);

  // State for MDT outcomes data
  const [mdtOutcomes, setMdtOutcomes] = useState([]);
  const [loadingMdtOutcomes, setLoadingMdtOutcomes] = useState(false);
  const [mdtOutcomesError, setMdtOutcomesError] = useState(null);

  // State for recent patients data
  const [recentPatients, setRecentPatients] = useState([]);
  const [loadingRecentPatients, setLoadingRecentPatients] = useState(false);
  const [recentPatientsError, setRecentPatientsError] = useState(null);
  const [surgeries, setSurgeries] = useState([]);
  const [loadingSurgeries, setLoadingSurgeries] = useState(false);
  const [surgeriesError, setSurgeriesError] = useState(null);

  // State for MDT schedules data
  const [mdtSchedules, setMdtSchedules] = useState([]);
  const [loadingMdtSchedules, setLoadingMdtSchedules] = useState(false);
  const [mdtSchedulesError, setMdtSchedulesError] = useState(null);

  // State for patients due for review data
  const [patientsDueForReview, setPatientsDueForReview] = useState([]);
  const [patientsDueForReviewSummary, setPatientsDueForReviewSummary] = useState({
    total: 0,
    postOpFollowup: 0,
    investigation: 0,
    surgical: 0
  });
  const [loadingPatientsDueForReview, setLoadingPatientsDueForReview] = useState(false);
  const [patientsDueForReviewError, setPatientsDueForReviewError] = useState(null);

  // Fetch today's appointments
  const fetchTodaysAppointments = async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);

    try {
      // Get current urologist info to filter appointments
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        setAppointmentsError('User not found');
        setAppointments([]);
        setLoadingAppointments(false);
        return;
      }

      // Build current urologist's name in multiple formats for matching
      // Response shows urologist as "Will Smith" or "Norah Reyes" (without "Dr." prefix)
      let currentUrologistName = '';

      // Try multiple ways to get the urologist name
      if (currentUser.first_name && currentUser.last_name) {
        currentUrologistName = `${currentUser.first_name} ${currentUser.last_name}`.trim();
      } else if (currentUser.firstName && currentUser.lastName) {
        currentUrologistName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
      } else if (currentUser.name) {
        currentUrologistName = currentUser.name.replace(/^Dr\.\s*/i, '').trim();
      } else if (currentUser.email) {
        // If name is not available, try to fetch from profile
        try {
          const profileResult = await authService.getProfile();
          if (profileResult.success && profileResult.data?.user) {
            const userData = profileResult.data.user;
            if (userData.first_name && userData.last_name) {
              currentUrologistName = `${userData.first_name} ${userData.last_name}`.trim();
            } else if (userData.name) {
              currentUrologistName = userData.name.replace(/^Dr\.\s*/i, '').trim();
            }
          }
        } catch (profileError) {
          console.warn('Could not fetch user profile:', profileError);
        }
      }

      console.log('🔍 Current user object:', {
        id: currentUser.id,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        name: currentUser.name,
        email: currentUser.email,
        computedName: currentUrologistName
      });

      // If we still don't have a name, try to fetch from profile
      if (!currentUrologistName) {
        console.warn('⚠️ Urologist name not found in user object, fetching profile...');
        try {
          const profileResult = await authService.getProfile();
          if (profileResult.success && profileResult.data?.user) {
            const userData = profileResult.data.user;
            if (userData.first_name && userData.last_name) {
              currentUrologistName = `${userData.first_name} ${userData.last_name}`.trim();
            } else if (userData.firstName && userData.lastName) {
              currentUrologistName = `${userData.firstName} ${userData.lastName}`.trim();
            } else if (userData.name) {
              currentUrologistName = userData.name.replace(/^Dr\.\s*/i, '').trim();
            }
            console.log('✅ Got urologist name from profile:', currentUrologistName);
          }
        } catch (profileError) {
          console.error('❌ Could not fetch user profile:', profileError);
        }
      }

      // Normalize current urologist name for comparison (remove "Dr.", lowercase, trim)
      const normalizedCurrentName = currentUrologistName ?
        currentUrologistName.replace(/^Dr\.\s*/i, '').trim().toLowerCase() : '';

      console.log('🔍 Fetching appointments for urologist:', currentUrologistName || 'UNKNOWN');
      console.log('🔍 Normalized name for matching:', normalizedCurrentName || 'N/A');

      // Get all appointments (both urologist and investigation) and filter by urologist name
      const result = await bookingService.getTodaysAppointments();

      if (result.success) {
        console.log('✅ Raw appointments data:', result.data.appointments);
        const allAppointments = result.data.appointments || [];

        console.log(`📊 Total appointments received: ${allAppointments.length}`);

        if (allAppointments.length > 0) {
          console.log('📋 Sample appointment structure:', {
            patientName: allAppointments[0].patientName,
            urologist: allAppointments[0].urologist,
            time: allAppointments[0].time,
            type: allAppointments[0].type
          });
        }

        // Filter appointments to only show those for the logged-in urologist
        // Match against the "urologist" field in the response
        let filteredAppointments;

        if (!normalizedCurrentName) {
          // If we don't have the urologist name, show all appointments as fallback
          console.warn('⚠️ Cannot filter appointments: urologist name not available. Showing all appointments.');
          filteredAppointments = allAppointments;
        } else {
          filteredAppointments = allAppointments.filter(appointment => {
            const appointmentUrologistName = appointment.urologist ||
              appointment.urologist_name ||
              appointment.urologistName ||
              '';

            // If appointment has no urologist name, exclude it
            if (!appointmentUrologistName) {
              return false;
            }

            // Normalize appointment urologist name (remove "Dr." prefix, trim, lowercase)
            const normalizedAppointmentName = appointmentUrologistName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();

            // Check if names match (case-insensitive, ignoring "Dr." prefix)
            const matches = normalizedCurrentName === normalizedAppointmentName;

            if (!matches) {
              console.log(`❌ Filtered out: "${appointmentUrologistName}" (normalized: "${normalizedAppointmentName}") vs "${currentUrologistName}" (normalized: "${normalizedCurrentName}")`);
            } else {
              console.log(`✅ Matched: "${appointmentUrologistName}" with "${currentUrologistName}"`);
            }

            return matches;
          });
        }

        console.log(`✅ Final filtered appointments: ${filteredAppointments.length} out of ${allAppointments.length} for urologist "${currentUrologistName}"`);

        if (filteredAppointments.length === 0 && allAppointments.length > 0) {
          console.warn('⚠️ No appointments matched! Check name matching logic.');
          console.log('Available urologists in appointments:', [...new Set(allAppointments.map(apt => apt.urologist))]);
        }

        setAppointments(filteredAppointments);
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

  // Fetch surgical queue - shows all surgery appointments for this urologist
  const fetchSurgicalQueue = async () => {
    setLoadingSurgicalQueue(true);
    setSurgicalQueueError(null);

    try {
      // Get current urologist ID
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        setSurgicalQueueError('User not found');
        setSurgicalQueue([]);
        return;
      }

      const urologistId = currentUser.id;

      // Fetch all appointments for this urologist
      const result = await bookingService.getAllAppointments({
        urologistId: urologistId
      });

      console.log('Surgical Queue: Fetched appointments for urologist', urologistId, result);

      if (result.success) {
        // Handle different response structures
        const appointments = result.data?.appointments || result.data || [];

        if (!Array.isArray(appointments)) {
          console.error('Invalid appointments data structure:', result.data);
          setSurgicalQueueError('Invalid data format received from server');
          setSurgicalQueue([]);
          return;
        }

        // Filter for surgery appointments that are scheduled or confirmed
        const surgicalAppointments = appointments
          .filter(apt => {
            const aptType = (apt.type || apt.appointmentType || '').toLowerCase();
            const aptStatus = (apt.status || '').toLowerCase();
            const aptNotes = (apt.notes || '').toLowerCase();
            const aptSurgeryType = (apt.surgeryType || apt.surgery_type || '').toLowerCase();

            // Check for surgery in type field
            const isSurgeryType = aptType.includes('surgery') || aptType.includes('surgical');

            // Check for surgery keywords in notes
            const hasSurgeryInNotes = aptNotes.includes('surgery scheduled') ||
              aptNotes.includes('surgery appointment scheduled') ||
              aptNotes.includes('surgical') ||
              aptNotes.includes('surgery type:');

            // Check for surgeryType field
            const hasSurgeryType = aptSurgeryType && aptSurgeryType.length > 0;

            // Include surgery appointments that are scheduled or confirmed
            return (isSurgeryType || hasSurgeryInNotes || hasSurgeryType) &&
              (aptStatus === 'scheduled' || aptStatus === 'confirmed');
          })
          .map(apt => {
            // Handle patient name
            const patientName = apt.patientName ||
              (apt.first_name && apt.last_name
                ? `${apt.first_name} ${apt.last_name}`
                : 'Unknown Patient');

            // Extract date and time
            const appointmentDate = apt.date || apt.appointmentDate || apt.appointment_date || '';
            const appointmentTime = apt.time || apt.appointmentTime || apt.appointment_time || '';

            // Determine priority based on patient or appointment priority
            let priority = apt.priority || 'Medium';
            if (typeof priority === 'string') {
              priority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
            }

            const priorityColor = priority === 'High' || priority === 'Urgent' ? 'red' :
              priority === 'Low' ? 'green' : 'yellow';

            return {
              id: apt.id,
              patient: patientName,
              age: apt.age || 'N/A',
              scheduledDate: appointmentDate,
              scheduledTime: appointmentTime,
              procedure: apt.notes ? apt.notes.split('\n')[0].substring(0, 50) : 'Surgery Procedure',
              priority: priority,
              priorityColor: priorityColor,
              status: apt.status === 'scheduled' ? 'Scheduled' :
                apt.status === 'confirmed' ? 'Confirmed' : 'Scheduled'
            };
          })
          // Sort by date and time (most recent first)
          .sort((a, b) => {
            const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
            const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
            return dateA - dateB;
          });

        console.log('Surgical Queue: Filtered surgery appointments:', surgicalAppointments);
        setSurgicalQueue(surgicalAppointments);
      } else {
        setSurgicalQueueError(result.error || 'Failed to fetch surgical queue');
        setSurgicalQueue([]);
      }
    } catch (error) {
      setSurgicalQueueError('Failed to fetch surgical queue');
      console.error('Error fetching surgical queue:', error);
      setSurgicalQueue([]);
    } finally {
      setLoadingSurgicalQueue(false);
    }
  };

  // Fetch recent patients (placeholder - will need to create API endpoint)
  const fetchRecentPatients = async () => {
    setLoadingRecentPatients(true);
    setRecentPatientsError(null);

    try {
      const result = await patientService.getNewPatients({ limit: 15 });

      if (result.success) {
        console.log('Raw recent patients data:', result.data);

        // Handle the data - it might be in result.data.patients or result.data directly
        const patientsData = result.data?.patients || result.data || [];

        if (patientsData.length > 0) {
          console.log('First patient structure:', patientsData[0]);
        }

        const recent = patientsData.map(patient => {
          // Handle different possible field names
          const firstName = patient.first_name || patient.firstName || '';
          const lastName = patient.last_name || patient.lastName || '';
          const fullName = patient.name || patient.patientName || `${firstName} ${lastName}`.trim() || 'Unknown Patient';

          // Format the visit date/time
          let timeDisplay = 'Recently';
          if (patient.last_appointment_date) {
            const visitDate = new Date(patient.last_appointment_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const visitDateOnly = new Date(visitDate);
            visitDateOnly.setHours(0, 0, 0, 0);

            const diffTime = today - visitDateOnly;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
              timeDisplay = 'Today';
            } else if (diffDays === 1) {
              timeDisplay = 'Yesterday';
            } else if (diffDays < 7) {
              timeDisplay = `${diffDays} days ago`;
            } else {
              // Format as date
              timeDisplay = visitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: visitDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
            }

            // Add time if available
            if (patient.last_appointment_time) {
              const timeStr = typeof patient.last_appointment_time === 'string'
                ? patient.last_appointment_time.substring(0, 5)
                : patient.last_appointment_time;
              timeDisplay += ` ${formatTime(timeStr)}`;
            }
          }

          // Determine status based on appointment status
          let status = 'Visited';
          let statusColor = 'green';
          if (patient.last_appointment_status) {
            if (patient.last_appointment_status === 'completed') {
              status = 'Completed';
              statusColor = 'green';
            } else if (patient.last_appointment_status === 'no_show') {
              status = 'No Show';
              statusColor = 'red';
            } else if (patient.last_appointment_status === 'scheduled' || patient.last_appointment_status === 'confirmed') {
              status = 'Scheduled';
              statusColor = 'blue';
            }
          }

          return {
            id: patient.id || patient.patient_id,
            time: timeDisplay,
            patient: fullName,
            age: patient.age || 'N/A',
            status: status,
            statusColor: statusColor
          };
        });

        console.log('Mapped recent patients:', recent);
        setRecentPatients(recent);
      } else {
        setRecentPatientsError(result.error || 'Failed to fetch recent patients');
      }
    } catch (error) {
      setRecentPatientsError('Failed to fetch recent patients');
      console.error('Error fetching recent patients:', error);
    } finally {
      setLoadingRecentPatients(false);
    }
  };

  // Fetch recent MDT outcomes (derive from my meetings with non-empty outcome)
  const fetchMdtOutcomes = async () => {
    setLoadingMdtOutcomes(true);
    setMdtOutcomesError(null);
    try {
      const result = await mdtService.getMyMDTMeetings();
      if (!result.success) {
        setMdtOutcomesError(result.error || 'Failed to fetch MDT outcomes');
        setMdtOutcomes([]);
        return;
      }
      const meetings = result.data?.meetings || [];
      const outcomes = meetings
        .map(m => {
          // Prefer top-level field; fallback to notes JSON
          let outcome = m.mdtOutcome || '';
          if (!outcome) {
            try {
              const parsed = m.notes ? (typeof m.notes === 'string' ? JSON.parse(m.notes) : m.notes) : {};
              outcome = parsed.mdtOutcome || '';
            } catch { }
          }
          return outcome ? {
            patient: m.patient?.name || 'Patient',
            patientName: m.patient?.name || 'Patient',
            outcome,
            date: m.meetingDate,
            time: m.meetingTime,
            id: m.id
          } : null;
        })
        .filter(Boolean)
        // Keep most recent first
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6);
      setMdtOutcomes(outcomes);
    } catch (error) {
      setMdtOutcomesError('Failed to fetch MDT outcomes');
      console.error('Error fetching MDT outcomes:', error);
    } finally {
      setLoadingMdtOutcomes(false);
    }
  };

  // Fetch surgeries for the logged-in urologist
  const fetchSurgeries = async () => {
    setLoadingSurgeries(true);
    setSurgeriesError(null);

    try {
      // Get current urologist ID
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.id) {
        setSurgeriesError('User not found');
        setSurgeries([]);
        return;
      }

      const urologistId = currentUser.id;

      // Get current urologist's name for surgeon field
      const currentUrologistName = currentUser.first_name && currentUser.last_name
        ? `Dr. ${currentUser.first_name} ${currentUser.last_name}`
        : currentUser.name || 'Dr. ' + (currentUser.first_name || currentUser.last_name || 'Unknown');

      // Calculate date range based on surgeryView
      // Use local timezone instead of UTC to match backend behavior
      const now = new Date();
      const today = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0'); // YYYY-MM-DD format in local timezone

      let startDate, endDate;

      if (surgeryView === 'today') {
        startDate = today;
        endDate = today;
      } else if (surgeryView === 'week') {
        startDate = today;
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 6);
        endDate = weekEnd.getFullYear() + '-' +
          String(weekEnd.getMonth() + 1).padStart(2, '0') + '-' +
          String(weekEnd.getDate()).padStart(2, '0');
      } else { // month
        startDate = today;
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
        endDate = monthEnd.getFullYear() + '-' +
          String(monthEnd.getMonth() + 1).padStart(2, '0') + '-' +
          String(monthEnd.getDate()).padStart(2, '0');
      }

      console.log('Fetching surgeries for urologist:', urologistId, 'Date range:', startDate, 'to', endDate);
      console.log('Current date (local):', today);

      // Fetch all appointments for this urologist
      const result = await bookingService.getAllAppointments({
        urologistId: urologistId,
        startDate: startDate,
        endDate: endDate
      });

      console.log('Surgeries API result:', result);

      if (result.success) {
        // Handle different response structures
        const appointments = result.data?.appointments || result.data || [];

        console.log('Raw appointments data:', appointments);

        if (!Array.isArray(appointments)) {
          console.error('Invalid appointments data structure:', result.data);
          setSurgeriesError('Invalid data format received from server');
          setSurgeries([]);
          return;
        }

        // Filter for surgery appointments (check type, notes, and surgeryType field)
        const surgeryAppointments = appointments.filter(apt => {
          const aptType = (apt.type || apt.appointmentType || '').toLowerCase();
          const aptNotes = (apt.notes || '').toLowerCase();
          const aptSurgeryType = (apt.surgeryType || apt.surgery_type || '').toLowerCase();

          console.log('Checking appointment:', apt.patientName, 'Type:', apt.type, 'aptType:', aptType);

          // Check for surgery in type field
          const isSurgeryType = aptType === 'surgery' ||
            aptType === 'surgical' ||
            apt.type === 'Surgery Appointment';

          // Check for surgery keywords in notes
          const hasSurgeryInNotes = aptNotes.includes('surgery scheduled') ||
            aptNotes.includes('surgery appointment scheduled') ||
            aptNotes.includes('surgical') ||
            aptNotes.includes('surgery type:');

          // Check for surgeryType field
          const hasSurgeryType = aptSurgeryType && aptSurgeryType.length > 0;

          const isSurgery = isSurgeryType || hasSurgeryInNotes || hasSurgeryType;

          console.log('Is surgery?:', isSurgery, {
            isSurgeryType,
            hasSurgeryInNotes,
            hasSurgeryType,
            notesPreview: apt.notes?.substring(0, 100)
          });

          return isSurgery;
        });

        console.log('Filtered surgery appointments:', surgeryAppointments);

        // Transform to match the expected format
        const transformedSurgeries = surgeryAppointments.map(surgery => {
          // Handle patient name - backend returns patientName or first_name/last_name
          const patientName = surgery.patientName ||
            (surgery.first_name && surgery.last_name
              ? `${surgery.first_name} ${surgery.last_name}`
              : 'Unknown Patient');

          // Handle urologist name - prefer appointment data, fallback to current user
          const urologistName = surgery.urologistName ||
            (surgery.urologist_first_name && surgery.urologist_last_name
              ? `Dr. ${surgery.urologist_first_name} ${surgery.urologist_last_name}`
              : currentUrologistName);

          // Extract time - backend returns 'time' field (formatted) or 'appointmentTime'/'appointment_time'
          const appointmentTime = surgery.time || surgery.appointmentTime || surgery.appointment_time || '';
          const timeDisplay = appointmentTime ? appointmentTime.substring(0, 5) : '';

          // Extract date - backend returns 'date' field (formatted) or 'appointmentDate'/'appointment_date'
          const appointmentDate = surgery.date || surgery.appointmentDate || surgery.appointment_date || '';

          return {
            id: surgery.id,
            patientName: patientName,
            age: surgery.age || 'N/A',
            scheduledDate: appointmentDate,
            scheduledTime: timeDisplay,
            procedure: surgery.notes ? surgery.notes.split('\n')[0].substring(0, 50) : 'Surgery',
            priority: 'Medium', // Default priority, can be enhanced later
            priorityColor: 'yellow',
            status: surgery.status === 'scheduled' ? 'Scheduled' :
              surgery.status === 'completed' ? 'Completed' :
                surgery.status === 'cancelled' ? 'Cancelled' : 'Scheduled',
            statusColor: surgery.status === 'scheduled' ? 'blue' :
              surgery.status === 'completed' ? 'green' :
                surgery.status === 'cancelled' ? 'red' : 'blue',
            surgeon: urologistName,
            duration: 60 // Default 60 minutes, can be enhanced later
          };
        });

        // Sort by date and time
        transformedSurgeries.sort((a, b) => {
          const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
          const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
          return dateA - dateB;
        });

        setSurgeries(transformedSurgeries);
      } else {
        setSurgeriesError(result.error || 'Failed to fetch surgeries');
        setSurgeries([]);
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch surgeries';
      setSurgeriesError(errorMessage);
      console.error('Error fetching surgeries:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      setSurgeries([]);
    } finally {
      setLoadingSurgeries(false);
    }
  };

  // Fetch MDT schedules for current doctor
  const fetchMdtSchedules = async () => {
    setLoadingMdtSchedules(true);
    setMdtSchedulesError(null);

    try {
      const result = await mdtService.getMyMDTMeetings();
      if (result.success) {
        const meetings = result.data?.meetings || [];
        // Map API meetings to dashboard card structure
        const palette = ['teal', 'blue', 'purple', 'orange'];
        const mapped = meetings.map(m => ({
          id: m.id,
          date: m.meetingDate,
          time: formatTime(m.meetingTime),
          department: 'MDT',
          location: 'Clinic',
          patientId: m.patient?.id,
          patientName: m.patient?.name,
          attendees: (m.teamMembers || []).slice(0, 5).map((tm, idx) => ({
            name: tm.name,
            initials: (tm.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
            color: palette[idx % palette.length]
          })),
          patientsCount: 1,
          chair: m.createdBy?.name || '—'
        }));
        // Sort ascending by meeting datetime and ensure the first is the next upcoming
        const withSortKey = mapped.map(item => ({
          ...item,
          _dt: new Date(item.date).setHours(
            parseInt((item.time || '00:00').split(':')[0], 10),
            parseInt((item.time || '00:00').split(':')[1], 10),
            0,
            0
          )
        }));
        withSortKey.sort((a, b) => a._dt - b._dt);
        setMdtSchedules(withSortKey.map(({ _dt, ...rest }) => rest));
      } else {
        setMdtSchedulesError(result.error || 'Failed to fetch MDT schedules');
        setMdtSchedules([]);
      }
    } catch (error) {
      setMdtSchedulesError('Failed to fetch MDT schedules');
      console.error('Error fetching MDT schedules:', error);
    } finally {
      setLoadingMdtSchedules(false);
    }
  };

  // Fetch upcoming appointments for Patients Due for Review section
  const fetchPatientsDueForReview = async () => {
    setLoadingPatientsDueForReview(true);
    setPatientsDueForReviewError(null);

    try {
      // Fetch upcoming appointments (next 7 days by default)
      const result = await bookingService.getUpcomingAppointments({
        view: 'week',
        limit: 50,
        offset: 0
      });

      if (result.success) {
        console.log('Upcoming appointments result:', result);
        const appointments = result.data?.appointments || [];
        const summary = result.data?.summary || {
          total: 0,
          postOpFollowup: 0,
          investigation: 0,
          surgical: 0
        };

        // Transform appointments to match the modal's expected format
        const patients = appointments.map(apt => {
          // Determine type based on appointment type or care pathway
          let type = 'Follow-up';
          if (apt.type === 'Surgery Appointment' || apt.type === 'surgery' || apt.type === 'Surgery') {
            type = 'Surgery';
          } else if (apt.carePathway === 'Post-op Transfer' || apt.carePathway === 'Post-op Followup') {
            type = 'Post-Op Follow-up';
          } else if (apt.type === 'Investigation Appointment' || apt.type === 'investigation') {
            type = 'Investigation';
          } else if (apt.carePathway === 'Investigation Pathway') {
            type = 'Investigation';
          }

          // Determine priority based on date proximity and type
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const appointmentDate = new Date(apt.appointmentDate);
          appointmentDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.floor((appointmentDate - today) / (24 * 60 * 60 * 1000));

          let priority = 'Medium';
          if (daysUntil <= 7 || type === 'Post-Op Follow-up') {
            priority = 'High';
          } else if (daysUntil > 10) {
            priority = 'Low';
          }

          return {
            id: apt.patientId,
            name: apt.patientName, // Modal expects 'name'
            age: apt.age,
            date: apt.appointmentDate, // Modal expects 'date'
            time: apt.appointmentTime,
            type: type, // Modal expects 'type'
            priority: priority, // Modal expects 'priority'
            carePathway: apt.carePathway,
            status: apt.status,
            appointmentId: apt.id
          };
        });

        setPatientsDueForReview(patients);
        setPatientsDueForReviewSummary(summary);
      } else {
        setPatientsDueForReviewError(result.error || 'Failed to fetch upcoming appointments');
        setPatientsDueForReview([]);
        setPatientsDueForReviewSummary({
          total: 0,
          postOpFollowup: 0,
          investigation: 0,
          surgical: 0
        });
      }
    } catch (error) {
      setPatientsDueForReviewError('Failed to fetch upcoming appointments');
      console.error('Error fetching upcoming appointments:', error);
      setPatientsDueForReview([]);
      setPatientsDueForReviewSummary({
        total: 0,
        postOpFollowup: 0,
        investigation: 0,
        surgical: 0
      });
    } finally {
      setLoadingPatientsDueForReview(false);
    }
  };

  // Refresh MDT schedules when an MDT is created elsewhere
  useEffect(() => {
    const handler = () => fetchMdtSchedules();
    window.addEventListener('mdt:updated', handler);
    return () => window.removeEventListener('mdt:updated', handler);
  }, []);

  // Refresh surgical queue and surgeries when surgery appointments are updated
  useEffect(() => {
    const handler = () => {
      console.log('Surgery appointment updated event received, refreshing surgical queue and surgeries');
      fetchSurgicalQueue();
      fetchSurgeries(); // Also refresh the surgeries section
      fetchTodaysAppointments(); // Refresh today's appointments as well
    };
    window.addEventListener('surgery:updated', handler);
    return () => window.removeEventListener('surgery:updated', handler);
  }, []);

  // Refresh appointments when patient is updated
  useEffect(() => {
    const handler = () => {
      console.log('Patient updated event received, refreshing appointments');
      fetchTodaysAppointments();
      fetchSurgicalQueue();
      fetchRecentPatients();
    };
    window.addEventListener('patient:updated', handler);
    return () => window.removeEventListener('patient:updated', handler);
  }, []);

  // Format MDT date safely (avoid timezone shifts)
  const formatMdtDate = (dateString) => {
    if (!dateString) return '';
    let date;
    const str = String(dateString);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(str);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    if (scheduleDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (scheduleDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Get color classes for attendee avatars
  const getAvatarColorClass = (color) => {
    const colorMap = {
      teal: 'bg-teal-100 text-teal-700',
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      blue: 'bg-blue-100 text-blue-700',
      purple: 'bg-purple-100 text-purple-700',
      pink: 'bg-pink-100 text-pink-700',
      indigo: 'bg-indigo-100 text-indigo-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700',
      gray: 'bg-gray-100 text-gray-700',
    };
    return colorMap[color] || 'bg-gray-100 text-gray-700';
  };

  // Load data on component mount
  useEffect(() => {
    // Wait for authentication to be ready before fetching data
    const initializeData = async () => {
      try {
        // Check if user and token are available
        let currentUser = authService.getCurrentUser();
        let isAuthenticated = authService.isAuthenticated();

        console.log('[Dashboard] Initial auth check:', {
          hasUser: !!currentUser,
          isAuthenticated,
          userRole: currentUser?.role
        });

        // If not authenticated, wait and retry (handles page refresh case)
        if (!currentUser || !isAuthenticated) {
          console.warn('[Dashboard] User or token not ready, waiting...');

          // Wait a bit and check again (token might be setting or needs refresh)
          await new Promise(resolve => setTimeout(resolve, 200));

          currentUser = authService.getCurrentUser();
          isAuthenticated = authService.isAuthenticated();

          if (!currentUser || !isAuthenticated) {
            console.error('[Dashboard] Authentication not ready after retry');

            // Try to refresh token if it exists but is expired
            const tokenService = (await import('../../services/tokenService.js')).default;
            if (tokenService.getAccessToken() || tokenService.getRefreshToken()) {
              console.log('[Dashboard] Attempting token refresh...');
              const refreshed = await tokenService.refreshIfNeeded();
              if (refreshed) {
                currentUser = authService.getCurrentUser();
                isAuthenticated = authService.isAuthenticated();
                console.log('[Dashboard] Token refreshed, auth status:', isAuthenticated);
              }
            }

            if (!currentUser || !isAuthenticated) {
              console.error('[Dashboard] Authentication not ready after refresh attempt, skipping data fetch');
              return;
            }
          }
        } else {
          // Token exists, but might need refresh - check proactively
          const tokenService = (await import('../../services/tokenService.js')).default;
          if (tokenService.needsRefresh()) {
            console.log('[Dashboard] Token needs refresh, refreshing...');
            await tokenService.refreshIfNeeded();
          }
        }

        console.log('[Dashboard] Authentication ready, fetching data...');
        console.log('[Dashboard] User:', currentUser);
        console.log('[Dashboard] Is authenticated:', isAuthenticated);

        // Small delay to ensure axios interceptor has the token
        await new Promise(resolve => setTimeout(resolve, 50));

        // Fetch all data
        fetchTodaysAppointments();
        fetchSurgicalQueue();
        fetchRecentPatients();
        fetchMdtOutcomes();
        fetchSurgeries();
        fetchMdtSchedules();
        fetchPatientsDueForReview();
      } catch (error) {
        console.error('[Dashboard] Error initializing data:', error);
      }
    };

    initializeData();
  }, []);

  // Refresh data when surgery view changes
  useEffect(() => {
    fetchSurgeries();
  }, [surgeryView]);

  // Refresh data when MDT view changes
  useEffect(() => {
    fetchMdtSchedules();
  }, [mdtView]);

  const getStatusBadge = (status, color) => {
    const colorClasses = {
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      purple: 'bg-purple-100 text-purple-700',
      gray: 'bg-gray-100 text-gray-700',
      red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`} aria-label={`Status: ${status}`}>
        {status}
      </span>
    );
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Function to open MDT schedule details modal
  const openMdtScheduleDetails = (schedule) => {
    setSelectedMdtSchedule(schedule);
    setIsMdtDetailsOpen(true);
  };

  // Function to open MDT notes modal for MDT outcomes
  const openMdtOutcomeDetails = (outcome) => {
    setSelectedMdtOutcome(outcome);
    setIsMdtNotesOpen(true);
  };

  // Helper function to format surgery date
  const formatSurgeryDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const surgeryDate = new Date(date);
    surgeryDate.setHours(0, 0, 0, 0);

    if (surgeryDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (surgeryDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Helper function to format duration
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
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
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      return timeString;
    } catch (error) {
      console.error('Error formatting time:', error, 'Input:', timeString);
      return timeString;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Urologist Dashboard</h1>
          </div>
          {/* Notification and Profile Icons */}
          <div className="flex items-center gap-3">
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
        </div>

        {/* Search Bar - Below Title */}
        <div className="mt-6 mb-6">
          <div className="relative w-full sm:w-96">
            <GlobalPatientSearch
              placeholder="Search by name"
              onPatientSelect={(patient) => {
                console.log('Urologist Dashboard: Patient selected:', patient);
                // Determine category based on care pathway
                let category = 'new';
                if (patient.carePathway === 'Surgery Pathway') {
                  category = 'surgery-pathway';
                } else if (patient.carePathway === 'Post-op Transfer' || patient.carePathway === 'Post-op Followup') {
                  category = 'post-op-followup';
                }
                patientModalRef.current?.openPatientDetails(patient.name, { age: patient.age }, category);
              }}
            />
          </div>
        </div>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Takes 2/3 width */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Today's Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[32rem]">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    {activeTab === 'appointments' ? "Today's Appointments" : activeTab === 'recentPatients' ? "Recent Patients" : "My Surgical Queue"}
                  </h2>
                  {/* Tabs */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'appointments'
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Appointments
                    </button>
                    <button
                      onClick={() => setActiveTab('surgicalQueue')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'surgicalQueue'
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Surgical Queue
                    </button>
                    <button
                      onClick={() => setActiveTab('recentPatients')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'recentPatients'
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Recent Patients
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="overflow-x-auto h-full">
                  <table className="w-full min-w-[640px]">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="border-b border-gray-200">
                        {activeTab === 'surgicalQueue' ? (
                          <>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Patient Name</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Age</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Procedure</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Scheduled Date</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Priority</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Actions</th>
                          </>
                        ) : activeTab === 'appointments' ? (
                          <>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Time</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Patient Name</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Age</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Actions</th>
                          </>
                        ) : (
                          <>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Time</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Patient Name</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Age</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Status</th>
                            <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab === 'appointments' ? (
                        loadingAppointments ? (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-500">
                              Loading appointments...
                            </td>
                          </tr>
                        ) : appointmentsError ? (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-red-500">
                              Error: {appointmentsError}
                            </td>
                          </tr>
                        ) : appointments.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-500">
                              No appointments scheduled for today
                            </td>
                          </tr>
                        ) : (
                          appointments.map((appointment, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">
                                {appointment.appointment_type === 'automatic' || appointment.type === 'automatic'
                                  ? 'Flexible'
                                  : formatTime(appointment.time || appointment.appointmentTime || appointment.scheduledTime) || 'N/A'}
                              </td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-900 text-xs sm:text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <span>{appointment.patientName}</span>
                                  {appointment.type === 'Investigation Appointment' && (
                                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-medium">
                                      Investigation
                                    </span>
                                  )}
                                  {appointment.type === 'Surgery Appointment' && (
                                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-medium">
                                      Surgery
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">
                                {appointment.age ? `${appointment.age} years old` : 'N/A'}
                              </td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6">
                                <button
                                  onClick={() => {
                                    console.log('🔍 Dashboard: View button clicked for appointment:', appointment);
                                    if (appointment.status === 'MDT Discussion') {
                                      // Open MDT Notes modal for MDT Discussion appointments
                                      setSelectedMdtOutcome({
                                        patient: appointment.patientName,
                                        outcome: 'MDT Discussion Scheduled',
                                        patientName: appointment.patientName
                                      });
                                      setIsMdtNotesOpen(true);
                                    } else {
                                      // Open patient details modal for regular appointments
                                      console.log('🔍 Dashboard: Opening patient details for:', appointment.patientName);
                                      // Determine category based on appointment type
                                      let category = 'new';
                                      if (appointment.type === 'Surgery Appointment') {
                                        category = 'surgery-pathway';
                                      }
                                      console.log('🔍 Dashboard: Determined category:', category, 'for appointment type:', appointment.type);
                                      patientModalRef.current?.openPatientDetails(appointment.patientName, appointment, category);
                                    }
                                  }}
                                  className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors"
                                  aria-label={`View details for ${appointment.patientName}`}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )
                      ) : activeTab === 'surgicalQueue' ? (
                        loadingSurgicalQueue ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              Loading surgical queue...
                            </td>
                          </tr>
                        ) : surgicalQueueError ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-red-500">
                              Error: {surgicalQueueError}
                            </td>
                          </tr>
                        ) : surgicalQueue.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              No surgical procedures scheduled
                            </td>
                          </tr>
                        ) : (
                          surgicalQueue.map((patient, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-900 text-xs sm:text-sm font-medium">{patient.patient}</td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">{patient.age ? `${patient.age} years old` : 'N/A'}</td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">{patient.procedure}</td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">{formatDate(patient.scheduledDate)}</td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${patient.priorityColor === 'red' ? 'bg-red-100 text-red-700' :
                                    patient.priorityColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                  }`} aria-label={`Priority: ${patient.priority}`}>
                                  {patient.priority}
                                </span>
                              </td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6">
                                <button
                                  onClick={() => patientModalRef.current?.openPatientDetails(patient.patient, { age: patient.age }, 'surgery-pathway')}
                                  className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors"
                                  aria-label={`View details for ${patient.patient}`}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )
                      ) : (
                        loadingRecentPatients ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">
                              Loading recent patients...
                            </td>
                          </tr>
                        ) : recentPatientsError ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-red-500">
                              Error: {recentPatientsError}
                            </td>
                          </tr>
                        ) : recentPatients.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">
                              No recent patients
                            </td>
                          </tr>
                        ) : (
                          recentPatients.map((patient, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">{patient.time}</td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-900 text-xs sm:text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <span>{patient.patient}</span>
                                </div>
                              </td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">{patient.age ? `${patient.age} years old` : 'N/A'}</td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6">
                                {getStatusBadge(patient.status, patient.statusColor)}
                              </td>
                              <td className="py-3 sm:py-4 px-3 sm:px-6">
                                <button
                                  onClick={() => patientModalRef.current?.openPatientDetails(patient.patient, { age: patient.age })}
                                  className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors"
                                  aria-label={`View details for ${patient.patient}`}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Patients Due for Review and Recent MDT Outcomes Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {/* Patients Due for Review */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Patients Due for Review</h2>
                    <button
                      onClick={() => setIsPatientsReviewOpen(true)}
                      className="px-3 py-1 text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      View All
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-1 flex items-center">
                  {loadingPatientsDueForReview ? (
                    <div className="text-center py-8 text-gray-500 text-sm w-full">
                      Loading patients due for review...
                    </div>
                  ) : patientsDueForReviewError ? (
                    <div className="text-center py-8 text-red-500 text-sm w-full">
                      Error: {patientsDueForReviewError}
                    </div>
                  ) : (
                    <div
                      className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer w-full"
                      onClick={() => setIsPatientsReviewOpen(true)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-600 mb-2">Next 7-14 Days</h3>
                          <div className="text-3xl font-bold text-teal-600 mb-2">{patientsDueForReviewSummary.total}</div>
                          <div className="text-xs text-gray-500 mb-3">patients</div>
                          <div className="space-y-1 text-sm text-gray-700">
                            <div className="flex justify-between">
                              <span>Postop Followup:</span>
                              <span className="font-medium">{patientsDueForReviewSummary.postOpFollowup}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Investigation:</span>
                              <span className="font-medium">{patientsDueForReviewSummary.investigation}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Surgical:</span>
                              <span className="font-medium">{patientsDueForReviewSummary.surgical}</span>
                            </div>
                          </div>
                        </div>
                        <IoChevronForward className="text-gray-400 text-lg ml-4" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent MDT Outcomes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent MDT Outcomes</h2>
                </div>
                <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                  {loadingMdtOutcomes ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Loading MDT outcomes...
                    </div>
                  ) : mdtOutcomesError ? (
                    <div className="text-center py-8 text-red-500 text-sm">
                      Error: {mdtOutcomesError}
                    </div>
                  ) : mdtOutcomes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No recent MDT outcomes
                    </div>
                  ) : (
                    mdtOutcomes.map((outcome, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedMdtOutcome({
                            patient: outcome.patient,
                            outcome: outcome.outcome,
                            patientName: outcome.patientName,
                            meetingId: outcome.id
                          });
                          setIsMdtNotesOpen(true);
                        }}
                        className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-medium text-teal-900 text-sm">
                            {outcome.patient}
                          </div>
                          <div className="text-xs text-teal-700">Outcome: {outcome.outcome}</div>
                        </div>
                        <IoChevronForward className="text-teal-400 text-sm" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Takes 1/3 width */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-6">
            {/* MDT Schedule */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[32rem]">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">MDT Schedule</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6">
                  {/* Next MDT Discussion Card */}
                  {mdtSchedules.length > 0 && (
                    <div
                      onClick={() => {
                        setSelectedMdtOutcome({
                          meetingId: mdtSchedules[0].id,
                          outcome: 'MDT Discussion Scheduled',
                          patientName: mdtSchedules[0].patientName
                        });
                        setIsMdtNotesOpen(true);
                      }}
                      className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200 mb-4 cursor-pointer hover:shadow-lg hover:border-teal-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">Next MDT Discussion</h3>
                        <BsCalendar3 className="text-teal-600" />
                      </div>
                      {mdtSchedules[0].patientName && (
                        <div className="text-sm font-semibold text-teal-900 mb-2">
                          {mdtSchedules[0].patientName}
                        </div>
                      )}
                      <div className="text-sm text-gray-700 font-medium mb-1">
                        {formatMdtDate(mdtSchedules[0].date)} at {mdtSchedules[0].time}
                      </div>
                      <div className="text-xs text-gray-600 mb-3">
                        {mdtSchedules[0].department} • {mdtSchedules[0].location}
                      </div>
                      <div className="flex items-center space-x-1 mb-2">
                        {mdtSchedules[0].attendees.slice(0, 3).map((attendee, idx) => (
                          <div
                            key={idx}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColorClass(attendee.color)}`}
                          >
                            {attendee.initials}
                          </div>
                        ))}
                        {mdtSchedules[0].attendees.length > 3 && (
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 text-xs font-bold">
                            +{mdtSchedules[0].attendees.length - 3}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        Chair: {mdtSchedules[0].chair}
                      </div>
                    </div>
                  )}

                  {/* Day/Week/Month Toggle */}
                  <div className="flex space-x-2 border-b border-gray-200 pb-3 mb-4">
                    <button
                      onClick={() => setMdtView('day')}
                      className={`px-4 py-2 text-sm transition-colors ${mdtView === 'day'
                          ? 'text-teal-600 font-medium border-b-2 border-teal-600'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setMdtView('week')}
                      className={`px-4 py-2 text-sm transition-colors ${mdtView === 'week'
                          ? 'text-teal-600 font-medium border-b-2 border-teal-600'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setMdtView('month')}
                      className={`px-4 py-2 text-sm transition-colors ${mdtView === 'month'
                          ? 'text-teal-600 font-medium border-b-2 border-teal-600'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Month
                    </button>
                  </div>

                  {/* MDT Schedule List */}
                  <div className="space-y-3">
                    {loadingMdtSchedules ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        Loading MDT schedules...
                      </div>
                    ) : mdtSchedulesError ? (
                      <div className="text-center py-8 text-red-500 text-sm">
                        Error: {mdtSchedulesError}
                      </div>
                    ) : mdtSchedules.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No MDT schedules for this period
                      </div>
                    ) : (
                      mdtSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          onClick={() => {
                            setSelectedMdtOutcome({
                              meetingId: schedule.id,
                              outcome: 'MDT Discussion Scheduled',
                              patientName: schedule.patientName
                            });
                            setIsMdtNotesOpen(true);
                          }}
                          className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-teal-300 transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatMdtDate(schedule.date)}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                                  {schedule.department}
                                </span>
                              </div>
                              {schedule.patientName && (
                                <div className="text-xs font-semibold text-gray-800 mb-1">
                                  {schedule.patientName}
                                </div>
                              )}
                              <div className="text-xs text-gray-600">
                                {schedule.time} • {schedule.location}
                              </div>
                            </div>
                            <IoChevronForward className="text-gray-400 text-sm flex-shrink-0" />
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-1">
                              {schedule.attendees.slice(0, 4).map((attendee, idx) => (
                                <div
                                  key={idx}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getAvatarColorClass(attendee.color)}`}
                                  title={attendee.name}
                                >
                                  {attendee.initials}
                                </div>
                              ))}
                              {schedule.attendees.length > 4 && (
                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 text-[10px] font-bold">
                                  +{schedule.attendees.length - 4}
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Surgery List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-96">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Upcoming Surgery List</h2>
              </div>
              <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden">
                {/* Today/Week/Month Toggle */}
                <div className="flex space-x-2 border-b border-gray-200 pb-3 mb-4 flex-shrink-0">
                  <button
                    onClick={() => setSurgeryView('today')}
                    className={`px-4 py-2 text-sm transition-colors ${surgeryView === 'today'
                        ? 'text-teal-600 font-medium border-b-2 border-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setSurgeryView('week')}
                    className={`px-4 py-2 text-sm transition-colors ${surgeryView === 'week'
                        ? 'text-teal-600 font-medium border-b-2 border-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={() => setSurgeryView('month')}
                    className={`px-4 py-2 text-sm transition-colors ${surgeryView === 'month'
                        ? 'text-teal-600 font-medium border-b-2 border-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    This Month
                  </button>
                </div>

                {/* Surgery List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {loadingSurgeries ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Loading surgeries...
                    </div>
                  ) : surgeriesError ? (
                    <div className="text-center py-8 text-red-500 text-sm">
                      Error: {surgeriesError}
                    </div>
                  ) : surgeries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No surgeries scheduled for this period
                    </div>
                  ) : (
                    surgeries.map((surgery) => (
                      <div
                        key={surgery.id}
                        onClick={() => patientModalRef.current?.openPatientDetails(surgery.patientName, { age: surgery.age }, 'surgery-pathway')}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-teal-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatSurgeryDate(surgery.scheduledDate)}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                                {surgery.scheduledTime}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${surgery.priorityColor === 'red' ? 'bg-red-100 text-red-700' :
                                  surgery.priorityColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {surgery.priority}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              {formatDuration(surgery.duration)}
                            </div>
                          </div>
                          <IoChevronForward className="text-gray-400 text-sm flex-shrink-0" />
                        </div>

                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {surgery.patientName}
                          </div>
                          <div className="text-xs text-gray-600">
                            {surgery.procedure}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              {surgery.age ? `${surgery.age} years old` : 'N/A'}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${surgery.statusColor === 'blue' ? 'bg-blue-100 text-blue-700' :
                                surgery.statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                              }`}>
                              {surgery.status}
                            </span>
                          </div>
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

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onPatientClick={(patientName, patientId, metadata) => {
          console.log('Urologist Dashboard: Notification clicked for patient:', patientName);
          // Determine category based on pathway in metadata
          let category = 'new';
          if (metadata?.pathway === 'Surgery Pathway') {
            category = 'surgery-pathway';
          } else if (metadata?.pathway === 'Post-op Transfer' || metadata?.pathway === 'Post-op Followup') {
            category = 'post-op-followup';
          } else if (metadata?.pathway === 'Active Monitoring' || metadata?.pathway === 'Medication') {
            category = 'new'; // Or appropriate category
          }
          patientModalRef.current?.openPatientDetails(patientName, { age: 'N/A' }, category);
          setIsNotificationOpen(false);
        }}
        onNotificationCountChange={(count) => setNotificationCount(count)}
      />


      {/* Patients Due for Review Modal */}
      <PatientsDueForReviewModal
        isOpen={isPatientsReviewOpen}
        onClose={() => setIsPatientsReviewOpen(false)}
        patients={patientsDueForReview}
        loading={loadingPatientsDueForReview}
        error={patientsDueForReviewError}
        patientModalRef={patientModalRef}
      />

      {/* Patient Details Modal Wrapper */}
      <PatientDetailsModalWrapper ref={patientModalRef} />

      {/* MDT Schedule Details Modal */}
      <MDTScheduleDetailsModal
        isOpen={isMdtDetailsOpen}
        onClose={() => setIsMdtDetailsOpen(false)}
        schedule={selectedMdtSchedule}
      />

      {/* MDT Notes Modal */}
      <MDTNotesModal
        isOpen={isMdtNotesOpen}
        onClose={() => setIsMdtNotesOpen(false)}
        patientName={selectedMdtOutcome?.patientName}
        outcome={selectedMdtOutcome?.outcome}
        meetingId={selectedMdtOutcome?.meetingId}
      />
    </div>
  );
};

export default UrologistDashboard;

