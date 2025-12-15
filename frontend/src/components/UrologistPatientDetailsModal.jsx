import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { IoClose, IoTimeSharp, IoMedical, IoCheckmarkCircle, IoDocumentText, IoAnalytics, IoDocument, IoHeart, IoCheckmark, IoAlertCircle, IoCalendar, IoServer, IoConstruct, IoBusiness, IoPeople, IoCheckmarkDone, IoClipboard } from 'react-icons/io5';
import { FaNotesMedical, FaUserMd, FaUserNurse, FaFileMedical, FaFlask, FaPills, FaStethoscope } from 'react-icons/fa';
import { BsClockHistory } from 'react-icons/bs';
import { Plus, Upload, Trash, Eye, Edit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';
import SuccessModal from './SuccessModal';
import ErrorModal from './modals/ErrorModal';
import MDTSchedulingModal from './MDTSchedulingModal';
import AddClinicalInvestigationModal from './AddClinicalInvestigationModal';
import AddPSAResultModal from './modals/AddPSAResultModal';
import AddInvestigationResultModal from './AddInvestigationResultModal';
import DischargeSummaryModal from './DischargeSummaryModal';
import EditSurgeryAppointmentModal from './EditSurgeryAppointmentModal';
import EditPatientModal from './EditPatientModal';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { notesService } from '../services/notesService';
import { patientService } from '../services/patientService';
import { investigationService } from '../services/investigationService';
import { mdtService } from '../services/mdtService';
import { bookingService } from '../services/bookingService';
import authService from '../services/authService';
import { calculatePSAVelocity } from '../utils/psaVelocity';
import { getPatientPipelineStage } from '../utils/patientPipeline';
import DecisionSupportPanel from './DecisionSupportPanel';
import PathwayValidator from './PathwayValidator';

const UrologistPatientDetailsModal = ({ isOpen, onClose, patient, loading, error, onTransferSuccess }) => {
  const [activeTab, setActiveTab] = useState('clinicalNotes');
  const [noteContent, setNoteContent] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [successModalAppointmentDetails, setSuccessModalAppointmentDetails] = useState(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [isPSAHistoryModalOpen, setIsPSAHistoryModalOpen] = useState(false);
  const [isPSAPlotModalOpen, setIsPSAPlotModalOpen] = useState(false);
  const [isOtherTestsHistoryModalOpen, setIsOtherTestsHistoryModalOpen] = useState(false);
  const [isMDTSchedulingModalOpen, setIsMDTSchedulingModalOpen] = useState(false);
  const [isAddInvestigationModalOpen, setIsAddInvestigationModalOpen] = useState(false);
  const [isAddPSAModalOpen, setIsAddPSAModalOpen] = useState(false);
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);
  const [isAddResultModalOpen, setIsAddResultModalOpen] = useState(false);
  const [selectedInvestigationRequest, setSelectedInvestigationRequest] = useState(null);
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [selectedTestResults, setSelectedTestResults] = useState([]);
  const [selectedTestName, setSelectedTestName] = useState('');

  // Transfer modal states
  const [isPathwayModalOpen, setIsPathwayModalOpen] = useState(false);
  const [selectedPathway, setSelectedPathway] = useState('');
  const [isDischargeSummaryModalOpen, setIsDischargeSummaryModalOpen] = useState(false);
  const [isEditSurgeryAppointmentModalOpen, setIsEditSurgeryAppointmentModalOpen] = useState(false);
  const [selectedSurgeryAppointment, setSelectedSurgeryAppointment] = useState(null);
  const [hasSurgeryAppointment, setHasSurgeryAppointment] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Transfer form states
  const [transferDetails, setTransferDetails] = useState({
    reason: '',
    priority: 'normal',
    clinicalRationale: '',
    additionalNotes: '',
    // Surgery scheduling fields
    surgeryDate: '',
    surgeryTime: '',
    surgeryStartTime: '',
    surgeryEndTime: ''
  });

  // Surgery slot selection states
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedStartSlot, setSelectedStartSlot] = useState('');
  const [selectedEndSlot, setSelectedEndSlot] = useState('');

  const [medicationDetails, setMedicationDetails] = useState({
    medications: [{
      id: Date.now(),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    }]
  });

  const [appointmentBooking, setAppointmentBooking] = useState({
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  });

  const [recurringAppointments, setRecurringAppointments] = useState({
    interval: '3'
  });


  // Patient data state - store full patient details fetched from API
  const [fullPatientData, setFullPatientData] = useState(null);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  // Appointments and MDT meetings state for pipeline
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(null);
  const [mdtMeetings, setMdtMeetings] = useState([]);
  const [loadingMdtMeetings, setLoadingMdtMeetings] = useState(false);
  const [mdtMeetingsError, setMdtMeetingsError] = useState(null);

  // API state management
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [deletingNote, setDeletingNote] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const [psaResults, setPsaResults] = useState([]);
  const [otherTestResults, setOtherTestResults] = useState([]);
  const [investigationRequests, setInvestigationRequests] = useState([]);
  const [loadingInvestigations, setLoadingInvestigations] = useState(false);
  const [investigationsError, setInvestigationsError] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  // Helper function to show error modal
  const showErrorModal = (title, message) => {
    setErrorModalTitle(title || 'Error');
    setErrorModalMessage(message || 'An error occurred. Please try again.');
    setIsErrorModalOpen(true);
  };

  // Check if patient has a surgery appointment
  const checkSurgeryAppointment = useCallback(async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 CHECKING SURGERY APPOINTMENT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📍 Patient ID:', patient?.id);

    if (!patient?.id) {
      console.log('❌ No patient ID, setting hasSurgeryAppointment to false');
      setHasSurgeryAppointment(false);
      return;
    }

    try {
      const appointmentsResult = await bookingService.getPatientAppointments(patient.id);
      console.log('📥 checkSurgeryAppointment API Response:', {
        success: appointmentsResult.success,
        data: appointmentsResult.data
      });

      if (appointmentsResult.success) {
        const appointments = appointmentsResult.data?.appointments || appointmentsResult.data || [];
        console.log('📋 Total appointments in check:', appointments.length);

        appointments.forEach((apt, idx) => {
          const aptType = (apt.appointmentType || apt.type || apt.appointment_type || '').toLowerCase();
          const surgeryType = (apt.surgeryType || apt.surgery_type || '').toLowerCase();
          console.log(`📌 Appointment ${idx + 1} in check:`, {
            id: apt.id,
            appointmentType: apt.appointmentType,
            type: apt.type,
            appointment_type: apt.appointment_type,
            aptType: aptType,
            surgeryType: surgeryType,
            allKeys: Object.keys(apt)
          });
        });

        const surgeryAppointment = appointments.find(apt => {
          const aptType = (apt.appointmentType || apt.type || apt.appointment_type || '').toLowerCase();
          const surgeryType = (apt.surgeryType || apt.surgery_type || '').toLowerCase();
          // Check for various surgery appointment type formats
          const isSurgery = aptType === 'surgery' ||
            aptType === 'surgical' ||
            aptType.includes('surgery') ||
            aptType.includes('surgical') ||
            surgeryType.includes('surgery');

          console.log('🔎 Check - Appointment:', {
            id: apt.id,
            aptType: aptType,
            surgeryType: surgeryType,
            isSurgery: isSurgery
          });

          return isSurgery;
        });

        const hasAppointment = !!surgeryAppointment;
        console.log('📊 checkSurgeryAppointment Result:', {
          hasAppointment: hasAppointment,
          surgeryAppointment: surgeryAppointment ? {
            id: surgeryAppointment.id,
            type: surgeryAppointment.appointmentType || surgeryAppointment.type,
            surgeryType: surgeryAppointment.surgeryType || surgeryAppointment.surgery_type
          } : null
        });
        console.log('═══════════════════════════════════════════════════════════\n');
        setHasSurgeryAppointment(hasAppointment);
      } else {
        console.log('⚠️ checkSurgeryAppointment - Failed to fetch appointments:', appointmentsResult.error);
        console.log('═══════════════════════════════════════════════════════════\n');
        setHasSurgeryAppointment(false);
      }
    } catch (error) {
      console.error('❌ checkSurgeryAppointment - Exception:', error);
      console.error('Error Stack:', error.stack);
      console.log('═══════════════════════════════════════════════════════════\n');
      setHasSurgeryAppointment(false);
    }
  }, [patient]);

  // Fetch full patient details when modal opens
  const fetchFullPatientData = async () => {
    if (!patient?.id) {
      console.log('❌ UrologistPatientDetailsModal: No patient ID, cannot fetch full details');
      return;
    }

    try {
      setLoadingPatientData(true);
      console.log('🔍 UrologistPatientDetailsModal: Fetching full patient details for ID:', patient.id);
      const result = await patientService.getPatientById(patient.id);

      if (result.success && result.data) {
        console.log('✅ UrologistPatientDetailsModal: Fetched full patient details:', result.data);
        setFullPatientData(result.data);
      } else {
        console.error('❌ UrologistPatientDetailsModal: Failed to fetch patient details:', result.error);
      }
    } catch (error) {
      console.error('❌ UrologistPatientDetailsModal: Error fetching patient details:', error);
    } finally {
      setLoadingPatientData(false);
    }
  };

  // Fetch appointments for patient (for pipeline)
  const fetchAppointments = useCallback(async () => {
    if (!patient?.id) return;

    setLoadingAppointments(true);
    setAppointmentsError(null);

    try {
      const result = await bookingService.getPatientAppointments(patient.id);

      if (result.success) {
        // Ensure we always get an array
        let appointmentsArray = [];
        if (Array.isArray(result.data)) {
          appointmentsArray = result.data;
        } else if (result.data?.appointments && Array.isArray(result.data.appointments)) {
          appointmentsArray = result.data.appointments;
        } else if (result.data && Array.isArray(result.data)) {
          appointmentsArray = result.data;
        }
        setAppointments(appointmentsArray);
      } else {
        setAppointmentsError(result.error || 'Failed to fetch appointments');
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointmentsError('Failed to fetch appointments');
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [patient?.id]);

  // Fetch MDT meetings for patient (for pipeline)
  const fetchMDTMeetings = useCallback(async () => {
    if (!patient?.id) return;

    setLoadingMdtMeetings(true);
    setMdtMeetingsError(null);

    try {
      const result = await patientService.getPatientMDTMeetings(patient.id);

      if (result.success) {
        // Ensure we always get an array
        let mdtArray = [];
        if (Array.isArray(result.data)) {
          mdtArray = result.data;
        } else if (result.data?.meetings && Array.isArray(result.data.meetings)) {
          mdtArray = result.data.meetings;
        } else if (result.data && Array.isArray(result.data)) {
          mdtArray = result.data;
        }
        setMdtMeetings(mdtArray);
      } else {
        setMdtMeetingsError(result.error || 'Failed to fetch MDT meetings');
        setMdtMeetings([]);
      }
    } catch (error) {
      console.error('Error fetching MDT meetings:', error);
      setMdtMeetingsError('Failed to fetch MDT meetings');
      setMdtMeetings([]);
    } finally {
      setLoadingMdtMeetings(false);
    }
  }, [patient?.id]);

  // Load patient data when modal opens
  useEffect(() => {
    console.log('🔍 UrologistPatientDetailsModal: useEffect triggered', { isOpen, patient });
    if (isOpen && patient) {
      console.log('🔍 UrologistPatientDetailsModal: Modal opened with patient:', patient);

      // Fetch full patient details from API
      fetchFullPatientData();

      // Fetch fresh data from API
      fetchNotes();
      fetchInvestigations();
      fetchInvestigationRequests();
      checkSurgeryAppointment();
      fetchAppointments();
      fetchMDTMeetings();

      // Also set any existing data from props
      if (patient.recentNotes) {
        console.log('🔍 UrologistPatientDetailsModal: Setting recent notes from props:', patient.recentNotes);
        setClinicalNotes(patient.recentNotes);
      }
      if (patient.psaResults) {
        console.log('🔍 UrologistPatientDetailsModal: Setting PSA results from props:', patient.psaResults);
        setPsaResults(patient.psaResults);
      }
      if (patient.otherTestResults) {
        console.log('🔍 UrologistPatientDetailsModal: Setting other test results from props:', patient.otherTestResults);
        setOtherTestResults(patient.otherTestResults);
      }
    } else {
      // Reset when modal closes
      setHasSurgeryAppointment(false);
      setFullPatientData(null);
    }
  }, [isOpen, patient?.id, checkSurgeryAppointment, fetchAppointments, fetchMDTMeetings]);

  // Reset surgery time when date changes
  useEffect(() => {
    setTransferDetails(prev => ({ ...prev, surgeryTime: '', surgeryStartTime: '', surgeryEndTime: '' }));
  }, [transferDetails.surgeryDate]);

  // API functions
  const fetchNotes = async () => {
    console.log('🔍 UrologistPatientDetailsModal: fetchNotes called with patient ID:', patient?.id);
    if (!patient?.id) {
      console.log('❌ UrologistPatientDetailsModal: No patient ID, returning early');
      return;
    }

    setLoadingNotes(true);
    setNotesError(null);

    try {
      console.log('🔍 UrologistPatientDetailsModal: Calling notesService.getPatientNotes with patient ID:', patient.id);
      const result = await notesService.getPatientNotes(patient.id);
      console.log('🔍 UrologistPatientDetailsModal: fetchNotes result:', result);
      if (result.success) {
        // Use the notes data directly from backend (now provides consistent format)
        const notes = result.data.notes || result.data || [];
        // Filter out unwanted notes
        const filteredNotes = notes.filter(note => {
          const content = note.content || '';
          const noteType = note.type || '';

          // Remove notes that say "Appointment type changed from..."
          if (content.includes('Appointment type changed from')) {
            return false;
          }

          // Remove ALL pathway_transfer notes from clinical notes timeline
          // (These are duplicate/unnecessary - the main clinical note with full details is what matters)
          if (noteType === 'pathway_transfer') {
            console.log('🗑️ Filtering out pathway_transfer note:', {
              noteId: note.id,
              content: content.substring(0, 100)
            });
            return false;
          }

          // Remove investigation requests that were automatically created from investigation management
          // These should only appear in "Other Test Results & Reports", not in clinical notes
          if (noteType === 'investigation_request' && content.includes('Automatically created from investigation management')) {
            console.log('🗑️ Filtering out automatic investigation request note:', {
              noteId: note.id,
              content: content.substring(0, 100)
            });
            return false;
          }

          return true;
        });
        console.log('✅ UrologistPatientDetailsModal: Setting clinical notes:', filteredNotes);
        setClinicalNotes(filteredNotes);
      } else {
        console.log('❌ UrologistPatientDetailsModal: Failed to fetch notes:', result.error);
        setNotesError(result.error || 'Failed to fetch notes');
      }
    } catch (err) {
      console.error('❌ UrologistPatientDetailsModal: Error fetching notes:', err);
      setNotesError('Failed to fetch notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchInvestigations = async () => {
    if (!patient?.id) return;

    setLoadingInvestigations(true);
    setInvestigationsError(null);

    try {
      const result = await investigationService.getInvestigationResults(patient.id);
      console.log('🔍 UrologistPatientDetailsModal: Investigation results response:', result);

      if (result.success) {
        // Handle different response structures
        const investigations = Array.isArray(result.data)
          ? result.data
          : (result.data?.results || result.data?.investigations || []);

        console.log('✅ UrologistPatientDetailsModal: Processed investigations:', investigations);

        // Filter PSA results
        const psaResults = investigations.filter(inv =>
          inv.testType === 'psa' || inv.test_type === 'PSA' || inv.test_type === 'psa'
        );
        setPsaResults(psaResults);

        // Filter non-PSA results
        const otherTestResults = investigations.filter(inv =>
          inv.testType !== 'psa' && inv.test_type !== 'PSA' && inv.test_type !== 'psa'
        );
        setOtherTestResults(otherTestResults);

        console.log('✅ UrologistPatientDetailsModal: PSA results:', psaResults);
        console.log('✅ UrologistPatientDetailsModal: Other test results:', otherTestResults);
      } else {
        setInvestigationsError(result.error || 'Failed to fetch investigations');
        console.error('❌ UrologistPatientDetailsModal: Investigation fetch failed:', result.error);
      }
    } catch (err) {
      setInvestigationsError('Failed to fetch investigations');
      console.error('❌ UrologistPatientDetailsModal: Error fetching investigations:', err);
    } finally {
      setLoadingInvestigations(false);
    }
  };

  const fetchInvestigationRequests = async () => {
    if (!patient?.id) {
      console.log('⚠️ fetchInvestigationRequests: No patient ID');
      return;
    }

    console.log(`🔍 fetchInvestigationRequests: Starting for patient ID: ${patient.id}`);
    setLoadingRequests(true);
    setRequestsError(null);

    try {
      const result = await investigationService.getInvestigationRequests(patient.id);
      console.log('🔍 UrologistPatientDetailsModal: Investigation requests API response:', result);
      console.log('🔍 Result success:', result.success);
      console.log('🔍 Result data:', result.data);

      if (result.success) {
        const requests = Array.isArray(result.data)
          ? result.data
          : (result.data?.requests || []);

        console.log('✅ UrologistPatientDetailsModal: Parsed investigation requests:', requests);
        console.log('✅ Number of requests:', requests.length);

        // Log each request
        requests.forEach((req, index) => {
          console.log(`  Request ${index + 1}:`, req.investigationName || req.investigation_name, `(ID: ${req.id})`);
        });

        setInvestigationRequests(requests);
        console.log('✅ State updated with requests');

        // Automatically create investigation requests for MRI, TRUS, and Biopsy if patient has investigations
        // Call this after setting requests to avoid race conditions
        ensureMainTestRequests(requests).catch(error => {
          console.error('Error ensuring main test requests:', error);
        });
      } else {
        setRequestsError(result.error || 'Failed to fetch investigation requests');
        console.error('❌ UrologistPatientDetailsModal: Investigation requests fetch failed:', result.error);
      }
    } catch (err) {
      setRequestsError('Failed to fetch investigation requests');
      console.error('❌ UrologistPatientDetailsModal: Error fetching investigation requests:', err);
      console.error('❌ Error stack:', err.stack);
    } finally {
      setLoadingRequests(false);
      console.log('✅ fetchInvestigationRequests: Complete');
    }
  };

  // Ensure main test requests (MRI, TRUS, Biopsy) exist for patients with investigations
  const ensureMainTestRequests = async (existingRequests) => {
    if (!patient?.id) return;

    // Check if patient has investigation data (mri, trus, biopsy status)
    // These come from the investigation management page
    const hasInvestigationData = patient.mri || patient.trus || patient.biopsy ||
      patient.mriStatus || patient.trusStatus || patient.biopsyStatus;

    if (!hasInvestigationData) return;

    const mainTests = [
      { name: 'MRI', key: 'mri' },
      { name: 'TRUS', key: 'trus' },
      { name: 'Biopsy', key: 'biopsy' }
    ];

    // Check which tests need to be created
    const testsToCreate = [];

    for (const test of mainTests) {
      // Check if request already exists for this test
      const testNameUpper = test.name.toUpperCase();
      const existingRequest = existingRequests.find(req => {
        const reqName = (req.investigationName || req.investigation_name || '').toUpperCase();
        return reqName === testNameUpper || reqName.includes(testNameUpper) || testNameUpper.includes(reqName);
      });

      if (!existingRequest) {
        // Check the status - only create if not 'not_required'
        const status = patient[test.key] || patient[`${test.key}Status`] || 'pending';
        if (status !== 'not_required' && status !== 'NOT_REQUIRED') {
          testsToCreate.push(test.name);
        }
      }
    }

    // Create missing investigation requests
    if (testsToCreate.length > 0) {
      console.log('🔍 UrologistPatientDetailsModal: Creating investigation requests for:', testsToCreate);

      // Don't set scheduledDate for automatically created requests
      // This ensures they are created as requests (not appointments) and won't appear in the appointments list

      for (const testName of testsToCreate) {
        try {
          const result = await investigationService.createInvestigationRequest(patient.id, {
            investigationType: 'clinical_investigation',
            testNames: [testName],
            priority: 'routine',
            notes: 'Automatically created from investigation management',
            scheduledDate: null, // Don't set a date - this makes it a request, not an appointment
            scheduledTime: null
          });

          if (result.success) {
            console.log(`✅ Created investigation request for ${testName}`);
          } else {
            console.error(`❌ Failed to create investigation request for ${testName}:`, result.error);
          }
        } catch (error) {
          console.error(`❌ Exception creating investigation request for ${testName}:`, error);
        }
      }

      // Refresh investigation requests after creating
      if (testsToCreate.length > 0) {
        setTimeout(async () => {
          const refreshResult = await investigationService.getInvestigationRequests(patient.id);
          if (refreshResult.success) {
            const requests = Array.isArray(refreshResult.data)
              ? refreshResult.data
              : (refreshResult.data?.requests || []);
            setInvestigationRequests(requests);
          }
        }, 500);
      }
    }
  };

  const saveNote = async () => {
    console.log('🔍 UrologistPatientDetailsModal: saveNote called with:', { patientId: patient?.id, noteContent: noteContent.trim() });
    if (!patient?.id || !noteContent.trim()) {
      console.log('❌ UrologistPatientDetailsModal: Early return - no patient ID or note content');
      return;
    }

    setSavingNote(true);

    try {
      const noteData = {
        noteContent: noteContent.trim(),
        noteType: 'clinical'
      };

      console.log('🔍 UrologistPatientDetailsModal: Calling notesService.addNote with:', { patientId: patient.id, noteData });
      const result = await notesService.addNote(patient.id, noteData);
      console.log('🔍 UrologistPatientDetailsModal: addNote result:', result);

      if (result.success) {
        console.log('✅ UrologistPatientDetailsModal: Note saved successfully, adding to list');
        // Add the new note to the beginning of the list (backend now provides correct format)
        setClinicalNotes(prev => [result.data, ...prev]);
        setNoteContent('');

        // Show "Saved" in button for 2 seconds
        setNoteSaved(true);
        setTimeout(() => {
          setNoteSaved(false);
        }, 2000);
      } else {
        console.log('❌ UrologistPatientDetailsModal: Failed to save note:', result.error);
        setNotesError(result.error || 'Failed to save note');
        console.error('Error saving note:', result.error);
      }
    } catch (err) {
      console.error('❌ UrologistPatientDetailsModal: Error saving note:', err);
      setNotesError('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteClick = (noteId) => {
    setNoteToDelete(noteId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;

    setDeletingNote(noteToDelete);
    setIsDeleteConfirmOpen(false);

    try {
      const result = await notesService.deleteNote(noteToDelete);
      console.log('Delete note result:', result);

      // Check if result.success is explicitly true (not just truthy)
      if (result && result.success === true) {
        await fetchNotes(); // Refresh notes
        setSuccessModalTitle('Note Deleted');
        setSuccessModalMessage('Clinical note has been deleted successfully.');
        setIsSuccessModalOpen(true);
      } else {
        // Show error in error modal with the specific error message
        const errorMessage = result?.error || result?.message || 'Failed to delete note';
        console.error('Delete note failed:', errorMessage);
        setErrorModalTitle('Cannot Delete Note');
        setErrorModalMessage(errorMessage);
        setIsErrorModalOpen(true);
      }
    } catch (err) {
      // Show error in error modal
      console.error('Exception deleting note:', err);
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to delete note';
      setErrorModalTitle('Error');
      setErrorModalMessage(errorMessage);
      setIsErrorModalOpen(true);
    } finally {
      setDeletingNote(null);
      setNoteToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setNoteToDelete(null);
  };

  // Handle investigation success (refresh data)
  const handleInvestigationSuccess = async (message, skipModal = false) => {
    if (!skipModal) {
      setSuccessModalTitle('Investigation Added');
      setSuccessModalMessage(message);
      setIsSuccessModalOpen(true);
    }

    // Refresh investigations data
    if (patient?.id) {
      try {
        const investigationsResult = await investigationService.getInvestigationResults(patient.id);
        if (investigationsResult.success) {
          const results = Array.isArray(investigationsResult.data)
            ? investigationsResult.data
            : (investigationsResult.data?.results || investigationsResult.data?.investigations || []);

          const psaResults = results.filter(inv =>
            inv.testType === 'psa' || inv.test_type === 'PSA' || inv.test_type === 'psa'
          );
          const otherTestResults = results.filter(inv =>
            inv.testType !== 'psa' && inv.test_type !== 'PSA' && inv.test_type !== 'psa'
          );

          setPsaResults(psaResults);
          setOtherTestResults(otherTestResults);
        }
      } catch (err) {
        console.error('Error refreshing investigations:', err);
      }
    }
  };

  // Handle MDT scheduling
  const handleMDTScheduled = async (mdtData) => {
    console.log('🔍 UrologistPatientDetailsModal: handleMDTScheduled called with:', mdtData);

    if (!patient?.id) {
      console.error('❌ UrologistPatientDetailsModal: No patient ID for MDT scheduling');
      setSuccessModalTitle('Error');
      setSuccessModalMessage('Patient ID is required for MDT scheduling');
      setIsSuccessModalOpen(true);
      return;
    }

    try {
      // Convert team members to the format expected by the API
      const teamMembers = mdtData.teamMembers.map(member => {
        // Extract name and role from format "Dr. Name (Role)"
        const match = member.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          return {
            name: match[1].trim(),
            role: match[2].trim()
          };
        }
        return {
          name: member,
          role: 'Team Member'
        };
      });

      const apiData = {
        meetingDate: mdtData.mdtDate,
        meetingTime: mdtData.time,
        priority: mdtData.priority,
        notes: mdtData.notes || '',
        teamMembers: teamMembers
      };

      console.log('🔍 UrologistPatientDetailsModal: Calling mdtService.scheduleMDTMeeting with:', { patientId: patient.id, apiData });

      const result = await mdtService.scheduleMDTMeeting(patient.id, apiData);
      console.log('🔍 UrologistPatientDetailsModal: MDT scheduling result:', result);

      if (result.success) {
        // Add clinical note about MDT scheduling
        try {
          const formattedDate = new Date(mdtData.mdtDate).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const teamMembersList = mdtData.teamMembers.length > 0
            ? ` Team members: ${mdtData.teamMembers.join(', ')}.`
            : '';
          const noteContent = `MDT meeting scheduled for ${formattedDate} at ${mdtData.time}. Priority: ${mdtData.priority}.${teamMembersList}${mdtData.notes ? ` Notes: ${mdtData.notes}` : ''}`;

          const noteResult = await notesService.addNote(patient.id, {
            noteContent: noteContent,
            noteType: 'clinical'
          });

          if (noteResult.success) {
            console.log('✅ Clinical note added for MDT scheduling');
            // Add the new note to the beginning of the list
            setClinicalNotes(prev => [noteResult.data, ...prev]);
          } else {
            console.warn('⚠️ Failed to add clinical note for MDT scheduling:', noteResult.error);
          }
        } catch (noteError) {
          console.error('❌ Error adding clinical note for MDT scheduling:', noteError);
          // Don't fail the MDT scheduling if note creation fails
        }

        setSuccessModalTitle('MDT Meeting Scheduled Successfully!');
        setSuccessModalMessage(`Multidisciplinary team meeting has been scheduled for ${patient.name} on ${new Date(mdtData.mdtDate).toLocaleDateString()} at ${mdtData.time}.`);
        setIsSuccessModalOpen(true);
        setIsMDTSchedulingModalOpen(false);
        // Notify dashboard to refresh MDT schedules
        try {
          window.dispatchEvent(new CustomEvent('mdt:updated'));
        } catch (_) { /* no-op */ }
      } else {
        console.error('❌ UrologistPatientDetailsModal: MDT scheduling failed:', result.error);
        setSuccessModalTitle('Error');
        setSuccessModalMessage(result.error || 'Failed to schedule MDT meeting');
        setIsSuccessModalOpen(true);
        // Don't close the MDT modal on error so user can try again
      }
    } catch (err) {
      console.error('❌ UrologistPatientDetailsModal: Error scheduling MDT:', err);
      setSuccessModalTitle('Error');
      setSuccessModalMessage('Failed to schedule MDT meeting');
      setIsSuccessModalOpen(true);
    }
  };

  // Helper functions for timeline icons and colors
  const getNoteIcon = (type) => {
    if (!type) return <IoDocumentText className="text-teal-600" />;

    switch (type.toLowerCase()) {
      case 'clinical_investigation':
      case 'investigation_request':
        return <FaFlask className="text-teal-600" />;
      case 'post-op check':
        return <IoCheckmarkCircle className="text-green-600" />;
      case 'follow-up appointment':
        return <IoMedical className="text-blue-600" />;
      case 'initial consultation':
        return <IoDocumentText className="text-purple-600" />;
      case 'pre-op assessment':
        return <IoMedical className="text-orange-600" />;
      case 'patient intake':
        return <IoDocumentText className="text-indigo-600" />;
      case 'vital signs check':
        return <IoCheckmarkCircle className="text-emerald-600" />;
      default:
        return <IoDocumentText className="text-teal-600" />;
    }
  };

  const getDesignationIcon = (designation, noteType = null, noteContent = '', note = null) => {
    // Check if this is a system-generated note
    const authorRole = designation || note?.authorRole || note?.author_role || '';
    const isSystemGenerated =
      noteType === 'pathway_transfer' ||
      noteType === 'no_show' ||
      authorRole.toLowerCase() === 'automated' ||
      authorRole.toLowerCase() === 'system' ||
      noteContent.includes('PATHWAY TRANSFER') ||
      noteContent.includes('SURGERY APPOINTMENT RESCHEDULED') ||
      noteContent.includes('automatically marked as No Show') ||
      noteContent.includes('automatically marked as no-show') ||
      (!designation && (noteType === 'pathway_transfer' || noteType === 'no_show' || noteContent.includes('PATHWAY TRANSFER')));

    if (isSystemGenerated) {
      return <IoConstruct className="text-purple-600" />;
    }

    // Get role from multiple possible fields
    const role = designation || note?.authorRole || note?.author_role || '';
    const roleLower = role.toLowerCase().trim();

    if (!role) return <FaStethoscope className="text-gray-600" />;

    // Check for nurse variations
    if (roleLower === 'nurse' || roleLower.includes('nurse')) {
      return <FaUserNurse className="text-blue-600" />;
    }

    // Check for urologist/doctor variations
    if (roleLower === 'urologist' || roleLower === 'doctor' || roleLower.includes('urologist') || roleLower.includes('doctor')) {
      return <FaStethoscope className="text-teal-600" />;
    }

    // Default to doctor icon
    return <FaStethoscope className="text-gray-600" />;
  };

  const getDesignationColor = (designation) => {
    if (!designation) return 'text-gray-600 bg-gray-50';

    switch (designation.toLowerCase()) {
      case 'urologist':
        return 'text-teal-600 bg-teal-50';
      case 'nurse':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Helper function to render reschedule notes with structured formatting
  const renderRescheduleNote = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    const data = {};

    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (trimmedLine.includes('New Appointment:')) {
        data.hasNewAppointment = true;
      } else if (trimmedLine.startsWith('- Date:')) {
        data.newDate = trimmedLine.replace('- Date:', '').trim();
      } else if (trimmedLine.startsWith('- Time:')) {
        data.newTime = trimmedLine.replace('- Time:', '').trim();
      } else if (trimmedLine.startsWith('Reason:')) {
        data.reason = trimmedLine.replace('Reason:', '').trim();
      }
    });

    return (
      <div className="space-y-3">
        {data.hasNewAppointment && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">New Appointment</div>
            <div className="space-y-1">
              {data.newDate && (
                <div className="text-sm text-gray-900">Date: {data.newDate}</div>
              )}
              {data.newTime && (
                <div className="text-sm text-gray-900">Time: {data.newTime}</div>
              )}
            </div>
          </div>
        )}
        {data.reason && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Reason</div>
            <div className="text-sm text-gray-900">{data.reason}</div>
          </div>
        )}
      </div>
    );
  };

  // Helper function to render pathway transfer notes with structured formatting
  const renderPathwayTransferNote = (content, noteType = null) => {
    const lines = content.split('\n').filter(line => line.trim());

    // Check if this is a reschedule note - render it specially
    if (content.includes('SURGERY APPOINTMENT RESCHEDULED')) {
      return renderRescheduleNote(content);
    }

    // Check if this is an investigation request note
    const isInvestigationRequest = content.includes('INVESTIGATION REQUEST') || noteType === 'investigation_request';

    // Check if this is a clinical investigation note
    const isClinicalInvestigation = content.includes('CLINICAL INVESTIGATION') || noteType === 'clinical_investigation';

    // Check if this is a pathway transfer note (either has PATHWAY TRANSFER header or is pathway_transfer type)
    const isPathwayTransferNote = content.includes('PATHWAY TRANSFER') || noteType === 'pathway_transfer';

    // Handle investigation request notes
    if (isInvestigationRequest) {
      return renderInvestigationRequestNote(content, 'investigation_request');
    }

    // Handle clinical investigation notes (same format as investigation request, but no scheduled date)
    if (isClinicalInvestigation) {
      return renderInvestigationRequestNote(content, 'clinical_investigation');
    }

    if (!isPathwayTransferNote) {
      return <p className="text-gray-700 leading-relaxed text-sm">{content}</p>;
    }

    const data = {};
    let currentKey = null;
    let currentValue = [];

    // Parse the content
    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (trimmedLine === 'PATHWAY TRANSFER' || trimmedLine === 'PATHWAY TRANSFER - MEDICATION PRESCRIBED') {
        data.title = trimmedLine;
      } else if (trimmedLine.includes('Transfer To:')) {
        // Extract the pathway name from "Transfer To: ..."
        const pathwayMatch = trimmedLine.match(/Transfer To:\s*(.+)/i);
        if (pathwayMatch) {
          currentKey = 'transferTo';
          data[currentKey] = pathwayMatch[1].trim();
        }
      } else if (trimmedLine.includes('Priority:')) {
        currentKey = 'priority';
        data[currentKey] = trimmedLine.replace('Priority:', '').trim();
      } else if (trimmedLine.includes('Reason for Transfer:')) {
        if (currentKey && currentValue.length > 0) {
          data[currentKey] = currentValue.join('\n');
        }
        currentKey = 'reason';
        currentValue = [];
      } else if (trimmedLine.includes('Clinical Rationale:')) {
        if (currentKey && currentValue.length > 0) {
          data[currentKey] = currentValue.join('\n');
        }
        currentKey = 'clinicalRationale';
        currentValue = [];
      } else if (trimmedLine.includes('Additional Notes:')) {
        if (currentKey && currentValue.length > 0) {
          data[currentKey] = currentValue.join('\n');
        }
        currentKey = 'additionalNotes';
        currentValue = [];
      } else if (trimmedLine.includes('Prescribed Medications:')) {
        if (currentKey && currentValue.length > 0) {
          data[currentKey] = currentValue.join('\n');
        }
        currentKey = 'medications';
        currentValue = [];
      } else if (trimmedLine.includes('Follow-up Appointment Scheduled:')) {
        if (currentKey && currentValue.length > 0) {
          data[currentKey] = currentValue.join('\n');
        }
        currentKey = 'appointment';
        currentValue = [];
      } else if (trimmedLine && currentKey) {
        currentValue.push(trimmedLine);
      }
    });

    // Save the last accumulated value
    if (currentKey && currentValue.length > 0) {
      data[currentKey] = currentValue.join('\n');
    }

    // Get priority color
    const getPriorityColor = (priority) => {
      const p = priority?.toLowerCase() || 'normal';
      if (p === 'high' || p === 'urgent') return 'bg-red-100 text-red-700 border-red-200';
      if (p === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      return 'bg-green-100 text-green-700 border-green-200';
    };

    // Get the actual pathway name - use patient's current pathway if "Not specified"
    const extractedPathway = data.transferTo || '';
    const patientPathway = patient?.carePathway || patient?.care_pathway || patient?.pathway || '';

    const displayPathway = extractedPathway && extractedPathway !== 'Not specified' && extractedPathway.trim() !== ''
      ? extractedPathway
      : (patientPathway || 'Not specified');

    // Debug logging
    if (extractedPathway === 'Not specified' || !extractedPathway || extractedPathway.trim() === '') {
      console.log('🔍 Pathway fallback:', {
        extractedPathway,
        patientPathway,
        displayPathway,
        patientId: patient?.id,
        patientData: {
          carePathway: patient?.carePathway,
          care_pathway: patient?.care_pathway,
          pathway: patient?.pathway
        }
      });
    }

    return (
      <div className="space-y-3">
        {/* Transfer To and Priority in same row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-500 mb-1">Transfer To</div>
            <div className="text-base text-gray-900">{displayPathway}</div>
          </div>
          {data.priority && (
            <span className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getPriorityColor(data.priority)}`}>
              {data.priority} Priority
            </span>
          )}
        </div>

        {/* Reason for Transfer */}
        {data.reason && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Reason for Transfer</div>
            <div className="text-sm text-gray-900 whitespace-pre-line">{data.reason}</div>
          </div>
        )}

        {/* Clinical Rationale */}
        {data.clinicalRationale && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Clinical Rationale</div>
            <div className="text-sm text-gray-900 whitespace-pre-line">{data.clinicalRationale}</div>
          </div>
        )}

        {/* Follow-up Appointment */}
        {data.appointment && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-sm font-medium text-blue-900 mb-1.5">Follow-up Appointment Scheduled</div>
            <div className="text-sm text-blue-800 whitespace-pre-line">{data.appointment}</div>
          </div>
        )}

        {/* Prescribed Medications */}
        {data.medications && (
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
            <div className="text-sm font-medium text-purple-900 mb-1.5">Prescribed Medications</div>
            <div className="text-sm text-purple-800 whitespace-pre-line">{data.medications}</div>
          </div>
        )}

        {/* Additional Notes */}
        {data.additionalNotes && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Additional Notes</div>
            <div className="text-sm text-gray-900 whitespace-pre-line">{data.additionalNotes}</div>
          </div>
        )}
      </div>
    );
  };

  // Render investigation request notes with structured formatting
  const renderInvestigationRequestNote = (content, noteType = null) => {
    const lines = content.split('\n').filter(line => line.trim());

    const data = {};
    const isClinicalInvestigation = content.includes('CLINICAL INVESTIGATION') || noteType === 'clinical_investigation';

    // Parse the content
    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (trimmedLine === 'INVESTIGATION REQUEST' || trimmedLine === 'CLINICAL INVESTIGATION') {
        data.title = trimmedLine;
      } else if (trimmedLine.includes('Investigation Type:')) {
        // Ignore investigation type line - no longer needed for clinical investigations
        // Keep for backward compatibility with old notes
      } else if (trimmedLine.includes('Test/Procedure Name:')) {
        const testNameValue = trimmedLine.replace('Test/Procedure Name:', '').trim();
        // Handle comma-separated test names (for multi-select)
        // Format: "PSA: PSA Total, PSA Free, TRUS: TRUS Prostate"
        data.testName = testNameValue;
        // Check if test names include investigation type prefixes (e.g., "PSA: PSA Total")
        if (testNameValue.includes(':')) {
          // Parse format: "TYPE: Test1, Test2, TYPE2: Test3"
          const testEntries = testNameValue.split(',').map(t => t.trim()).filter(t => t);
          data.testNamesByType = {};
          testEntries.forEach(entry => {
            if (entry.includes(':')) {
              const [type, ...testParts] = entry.split(':');
              const typeKey = type.trim();
              const testName = testParts.join(':').trim();
              if (!data.testNamesByType[typeKey]) {
                data.testNamesByType[typeKey] = [];
              }
              data.testNamesByType[typeKey].push(testName);
            } else {
              // Fallback: just add to a general list
              if (!data.testNamesByType['GENERAL']) {
                data.testNamesByType['GENERAL'] = [];
              }
              data.testNamesByType['GENERAL'].push(entry);
            }
          });
          data.testNames = testEntries;
        } else {
          // Simple comma-separated list
          data.testNames = testNameValue.includes(',')
            ? testNameValue.split(',').map(t => t.trim()).filter(t => t)
            : [testNameValue];
        }
      } else if (trimmedLine.includes('Priority:')) {
        data.priority = trimmedLine.replace('Priority:', '').trim();
      } else if (trimmedLine.includes('Scheduled Date:')) {
        data.scheduledDate = trimmedLine.replace('Scheduled Date:', '').trim();
      } else if (trimmedLine.includes('Clinical Notes:')) {
        // Get everything after "Clinical Notes:"
        const notesIndex = trimmedLine.indexOf('Clinical Notes:');
        if (notesIndex !== -1) {
          data.clinicalNotes = trimmedLine.substring(notesIndex + 'Clinical Notes:'.length).trim();
        }
      } else if (data.clinicalNotes !== undefined && trimmedLine) {
        // Append to clinical notes if we're already in that section
        data.clinicalNotes = (data.clinicalNotes || '') + '\n' + trimmedLine;
      }
    });

    // Get priority color
    const getPriorityColor = (priority) => {
      const p = priority?.toLowerCase() || 'routine';
      if (p === 'urgent' || p.includes('urgent')) return 'bg-red-100 text-red-700 border-red-200';
      if (p === 'soon' || p === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      return 'bg-green-100 text-green-700 border-green-200';
    };

    return (
      <div className="space-y-3">
        {/* Test/Procedure Names */}
        {(() => {
          // Extract all test names for display
          let allTestNames = [];
          if (data.testNamesByType) {
            Object.values(data.testNamesByType).forEach(tests => {
              allTestNames = [...allTestNames, ...tests];
            });
          } else if (data.testNames && data.testNames.length > 0) {
            allTestNames = data.testNames;
          } else if (data.testName) {
            // Parse comma-separated test names
            allTestNames = data.testName.split(',').map(t => t.trim()).filter(t => t);
          }

          return allTestNames.length > 0 ? (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Test/Procedure Name</div>
              <div className="text-base text-gray-900">
                {allTestNames.join(', ')}
              </div>
            </div>
          ) : null;
        })()}

        {/* Priority - Only show scheduled date for investigation requests, not clinical investigations */}
        {isClinicalInvestigation ? (
          <div className="flex items-start justify-end">
            {data.priority && (
              <span className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getPriorityColor(data.priority)}`}>
                {data.priority} Priority
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-500 mb-1">Scheduled Date</div>
              <div className={`text-base ${data.scheduledDate && !data.scheduledDate.includes('Not scheduled') ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                {data.scheduledDate || 'Not scheduled'}
              </div>
            </div>
            {data.priority && (
              <span className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${getPriorityColor(data.priority)}`}>
                {data.priority} Priority
              </span>
            )}
          </div>
        )}

        {/* Clinical Notes */}
        {data.clinicalNotes && data.clinicalNotes.trim() && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-sm font-medium text-blue-900 mb-1.5">Clinical Notes</div>
            <div className="text-sm text-blue-800 whitespace-pre-line">{data.clinicalNotes.trim()}</div>
          </div>
        )}
      </div>
    );
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = noteContent.trim() !== '';

  // Handle save function for Escape key
  const handleSaveChanges = (e) => {
    if (e) e.preventDefault();
    if (noteContent.trim()) {
      console.log('Saving note:', { content: noteContent });
      // Here you would typically save to backend
      setNoteContent('');
    }
  };

  // Handle Escape key with unsaved changes check
  const [showConfirmModal, closeConfirmModal] = useEscapeKey(onClose, isOpen, hasUnsavedChanges, handleSaveChanges);

  // Transform MDT meetings data to match the UI format
  // This must be before the early return to follow Rules of Hooks
  const transformedMdtNotes = useMemo(() => {
    if (!mdtMeetings || mdtMeetings.length === 0) return [];

    return mdtMeetings.map((meeting) => {
      // Parse notes JSON if it's a string
      let notesData = {};
      if (meeting.notes) {
        try {
          notesData = typeof meeting.notes === 'string' ? JSON.parse(meeting.notes) : meeting.notes;
        } catch (e) {
          // If parsing fails, treat as plain text
          notesData = { discussion: meeting.notes };
        }
      }

      // Format time
      const formatTime = (timeStr) => {
        if (!timeStr) return '';
        if (timeStr.match(/^\d{2}:\d{2}$/)) {
          const [hours, minutes] = timeStr.split(':');
          const hour24 = parseInt(hours, 10);
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          return `${hour12}:${minutes} ${ampm}`;
        }
        return timeStr;
      };

      // Format date
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
      };

      // Get author name - handle both API response formats
      let authorName = 'Unknown';
      if (meeting.createdBy && meeting.createdBy.name) {
        authorName = meeting.createdBy.name.startsWith('Dr.')
          ? meeting.createdBy.name
          : `Dr. ${meeting.createdBy.name}`;
      } else if (meeting.created_by_first_name && meeting.created_by_last_name) {
        authorName = `Dr. ${meeting.created_by_first_name} ${meeting.created_by_last_name}`;
      } else if (meeting.created_by_first_name) {
        authorName = `Dr. ${meeting.created_by_first_name}`;
      } else if (meeting.created_by) {
        authorName = meeting.created_by;
      }

      // Get designation/role
      const designation = meeting.createdBy?.role || meeting.created_by_role || 'Urologist';

      // Format attendees - handle both API response formats
      const attendees = (meeting.teamMembers || []).map((member) => {
        const role = member.role || member.userRole || '';
        const name = member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown';
        return `${name}${role ? ` (${role})` : ''}`;
      });

      // Extract content from notes - handle both parsed and raw formats
      const content = meeting.content ||
        meeting.clinicalSummary ||
        notesData.discussion ||
        notesData.caseSummary ||
        notesData.content ||
        (typeof meeting.notes === 'string' && meeting.notes.trim() ? meeting.notes : '') ||
        '';

      // Extract recommendations - check both parsed fields and notes JSON
      const recommendations = meeting.recommendations || notesData.recommendations || [];

      // Extract action items - check both parsed fields and notes JSON
      const actionItems = meeting.actionItems || notesData.actionItems || [];

      // Extract documents (if any)
      const documents = notesData.documents || [];

      return {
        id: meeting.id,
        date: formatDate(meeting.meeting_date || meeting.meetingDate),
        time: formatTime(meeting.meeting_time || meeting.meetingTime),
        author: authorName,
        designation: designation,
        meetingDate: formatDate(meeting.meeting_date || meeting.meetingDate),
        attendees: attendees,
        content: content,
        recommendations: recommendations,
        actionItems: actionItems,
        documents: documents
      };
    });
  }, [mdtMeetings]);

  if (!isOpen || !patient) return null;

  // Sample discharge summary data
  const dischargeSummary = {
    dischargeDate: '2024-09-20',
    dischargeTime: '14:30',
    admissionDate: '2024-09-10',
    lengthOfStay: '10 days',
    consultantName: 'Dr. Thompson',
    ward: 'Urology Ward - Room 302',
    diagnosis: {
      primary: 'Localized Prostate Adenocarcinoma (Gleason 7, 3+4)',
      secondary: [
        'Benign Prostatic Hyperplasia',
        'Hypertension (controlled)'
      ]
    },
    procedure: {
      name: 'Robot-Assisted Laparoscopic Radical Prostatectomy',
      date: '2024-09-11',
      surgeon: 'Dr. Thompson',
      findings: 'Successful nerve-sparing radical prostatectomy performed. No intraoperative complications. Estimated blood loss: 150ml. All specimens sent for histopathology.'
    },
    clinicalSummary: 'Patient admitted for elective radical prostatectomy for localized prostate cancer. Pre-operative assessment satisfactory. Surgery performed without complications. Post-operative recovery uncomplicated with good pain control. Patient mobilizing well. Catheter in-situ with clear urine output. Patient educated on catheter care and pelvic floor exercises.',
    investigations: [
      { test: 'PSA', result: '4.5 ng/mL', date: '2024-09-05' },
      { test: 'Full Blood Count', result: 'Within normal limits', date: '2024-09-09' },
      { test: 'Renal Function', result: 'eGFR >60 ml/min', date: '2024-09-09' },
      { test: 'ECG', result: 'Normal sinus rhythm', date: '2024-09-09' }
    ],
    medications: {
      discharged: [
        { name: 'Tamsulosin', dose: '400mcg', frequency: 'Once daily', duration: '4 weeks', instructions: 'Take in the morning after food' },
        { name: 'Paracetamol', dose: '1g', frequency: 'Four times daily', duration: '1 week', instructions: 'For pain relief as needed' },
        { name: 'Diclofenac', dose: '50mg', frequency: 'Three times daily', duration: '5 days', instructions: 'Take with food. For pain relief' },
        { name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', duration: 'Continue', instructions: 'Continue regular medication for hypertension' }
      ],
      stopped: [
        { name: 'Aspirin 75mg', reason: 'Stopped 1 week pre-operatively' }
      ]
    },
    followUp: {
      catheterRemoval: {
        date: '2024-09-27',
        location: 'Urology Outpatient Clinic',
        instructions: 'Catheter to remain in-situ for 7 days. Attend clinic for removal and trial without catheter.'
      },
      postOpReview: {
        date: '2024-10-18',
        location: 'Urology Outpatient Clinic',
        instructions: 'Post-operative review with histology results. PSA check at 6 weeks.'
      },
      additionalInstructions: [
        'Pelvic floor exercises - information leaflet provided',
        'Avoid heavy lifting (>10kg) for 6 weeks',
        'Avoid driving for 2 weeks',
        'Contact urology team if fever, heavy bleeding, or concerns'
      ]
    },
    gpActions: [
      'Continue antihypertensive medication (Amlodipine 5mg OD)',
      'Patient may require support with catheter care',
      'Monitor for any complications and refer back if concerns',
      'Patient may experience urinary incontinence initially - this should improve with pelvic floor exercises'
    ],
    dischargedBy: 'Dr. Sarah Wilson, Urology Registrar',
    documents: [
      { id: 1, name: 'Discharge Summary Letter.pdf', type: 'pdf', size: '245 KB' },
      { id: 2, name: 'Patient Information - Post-Prostatectomy.pdf', type: 'pdf', size: '1.2 MB' },
      { id: 3, name: 'Medication Chart.pdf', type: 'pdf', size: '890 KB' }
    ]
  };

  // Latest PSA result from API data
  const latestPSA = psaResults.length > 0 ? {
    id: psaResults[0].id,
    date: psaResults[0].test_date || psaResults[0].created_at,
    result: psaResults[0].result_value || psaResults[0].result,
    referenceRange: psaResults[0].reference_range || '0.0 - 4.0 ng/mL',
    status: psaResults[0].status || 'Available',
    statusColor: 'blue',
    notes: psaResults[0].notes || psaResults[0].comments || '',
    filePath: psaResults[0].file_path
  } : null;

  // Complete PSA history from API data
  const psaHistory = psaResults.map(result => {
    // Try multiple date fields from API response
    const dateSource = result.testDate || result.test_date || result.formattedDate || result.created_at;
    let dateObj = null;
    let formattedDate = 'N/A';

    if (dateSource) {
      // If it's formattedDate (MM/DD/YYYY format)
      if (result.formattedDate && result.formattedDate.includes('/')) {
        const parts = result.formattedDate.split('/');
        if (parts.length === 3) {
          dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        }
      }
      // Try parsing as ISO string or standard date string
      if (!dateObj) {
        dateObj = new Date(dateSource);
      }

      if (dateObj && !isNaN(dateObj.getTime())) {
        // Format for display: "Nov 25, 2025"
        formattedDate = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }

    return {
      id: result.id,
      date: formattedDate,
      dateObj: dateObj, // Store date object for chart
      result: result.result_value || result.result,
      referenceRange: result.reference_range || '0.0 - 4.0 ng/mL',
      status: result.status || 'Available',
      statusColor: 'blue',
      notes: result.notes || result.comments || '',
      filePath: result.file_path,
      testDate: result.testDate || result.test_date,
      formattedDate: result.formattedDate
    };
  });

  // Latest other test results from API data
  const latestOtherTests = otherTestResults.map(result => ({
    id: result.id,
    testName: result.testName || result.test_name || result.testType || result.test_type,
    date: result.testDate || result.test_date || result.created_at,
    result: result.result || result.result_value,
    referenceRange: result.referenceRange || result.reference_range || 'N/A',
    status: result.status || 'Completed',
    statusColor: 'green',
    notes: result.notes || result.comments || '',
    filePath: result.filePath || result.file_path,
    testType: result.testType || result.test_type
  }));

  // Complete other tests history from API data
  const otherTestsHistory = otherTestResults.map(result => ({
    id: result.id,
    testName: result.test_name || result.test_type,
    date: result.test_date || result.created_at,
    result: result.result_value || result.result,
    referenceRange: result.reference_range || 'N/A',
    status: result.status || 'Completed',
    statusColor: 'green',
    notes: result.notes || result.comments || '',
    filePath: result.file_path
  }));

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'normal':
      case 'low risk':
      case 'low':
        return 'bg-green-100 text-green-700';
      case 'elevated':
      case 'high risk':
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'available':
        return 'bg-blue-100 text-blue-700';
      case 'not available':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSaveNote = () => {
    console.log('🔍 UrologistPatientDetailsModal: handleSaveNote called');
    saveNote();
  };

  // Get document icon based on file type
  const getDocumentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return <IoDocument className="text-red-600" />;
      case 'word':
      case 'docx':
      case 'doc':
        return <IoDocument className="text-blue-600" />;
      case 'excel':
      case 'xlsx':
      case 'xls':
        return <IoDocument className="text-green-600" />;
      default:
        return <IoDocument className="text-gray-600" />;
    }
  };

  // Handle view document
  const handleViewDocument = (document) => {
    console.log('Viewing document:', document.name);
    setSuccessModalTitle('View Document');
    setSuccessModalMessage(`Opening ${document.name}...`);
    setIsSuccessModalOpen(true);
  };

  // Handle view file
  const handleViewFile = (filePath) => {
    if (filePath) {
      investigationService.viewFile(filePath);
    }
  };

  // Handle view test report
  const handleViewReport = (test) => {
    console.log('Viewing report for:', test.testName || test.name);

    if (test.filePath) {
      // Use the investigation service to view the file
      investigationService.viewFile(test.filePath);
    } else {
      // Fallback for tests without file attachments
      setSuccessModalTitle('View Report');
      setSuccessModalMessage(`No file attachment available for ${test.testName || test.name}`);
      setIsSuccessModalOpen(true);
    }
  };

  // Medication management functions
  const addMedication = () => {
    setMedicationDetails(prev => ({
      ...prev,
      medications: [...prev.medications, {
        id: Date.now(),
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      }]
    }));
  };

  const removeMedication = (id) => {
    if (medicationDetails.medications.length > 1) {
      setMedicationDetails(prev => ({
        ...prev,
        medications: prev.medications.filter(med => med.id !== id)
      }));
    }
  };

  const updateMedication = (id, field, value) => {
    setMedicationDetails(prev => ({
      ...prev,
      medications: prev.medications.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    }));
  };

  // Handle transfer actions
  const handleTransfer = (transferType) => {
    setSelectedPathway(transferType);
    setIsPathwayModalOpen(true);
  };

  // Handle discharge summary submission
  const handleDischargeSummarySubmit = async (dischargeSummaryData) => {
    try {
      console.log('📋 Creating discharge summary:', dischargeSummaryData);

      // Create discharge summary via API using patientService
      const result = await patientService.createDischargeSummary(patient.id, dischargeSummaryData);

      if (result.success) {
        console.log('✅ Discharge summary created successfully');

        // Now proceed with pathway transfer
        const pathwayPayload = {
          pathway: selectedPathway,
          reason: transferDetails.reason || 'Patient discharged',
          notes: dischargeSummaryData.clinicalSummary || ''
        };

        const pathwayRes = await patientService.updatePatientPathway(patient.id, pathwayPayload);

        if (pathwayRes.success) {
          setSuccessModalTitle('Patient Discharged Successfully');
          setSuccessModalMessage(`Discharge summary created and patient transferred to ${selectedPathway}.`);
          setIsSuccessModalOpen(true);
          setIsDischargeSummaryModalOpen(false);

          // Refresh patient data
          if (onTransferSuccess) {
            onTransferSuccess();
          }

          // Close the main modal after a delay
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          showErrorModal('Transfer Failed', 'Failed to transfer patient pathway: ' + (pathwayRes.error || 'Unknown error'));
        }
      } else {
        showErrorModal('Discharge Summary Failed', 'Failed to create discharge summary: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating discharge summary:', error);
      showErrorModal('Error', 'An error occurred while creating discharge summary. Please try again.');
    }
  };

  // Generate time slots for appointment booking
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();


  // Use fullPatientData if available, otherwise fallback to patient prop
  const displayPatient = fullPatientData || patient;

  // Get patient name from various possible fields
  const patientName = displayPatient.name ||
    displayPatient.fullName ||
    displayPatient.patientName ||
    (displayPatient.firstName && displayPatient.lastName
      ? `${displayPatient.firstName} ${displayPatient.lastName}`.trim()
      : displayPatient.first_name && displayPatient.last_name
        ? `${displayPatient.first_name} ${displayPatient.last_name}`.trim()
        : 'Unknown Patient');

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
          {/* Fixed Header */}
          <div className="bg-teal-50 text-teal-900 p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">{patientName}</h2>
                  {displayPatient.referredByGP && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-teal-800">Referred by</div>
                      <div className="text-sm text-teal-700">{displayPatient.referredByGP} (GP)</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-teal-700">
                  <span>{displayPatient.age || '0'}, {displayPatient.gender || 'Unknown'}</span>
                  <span>UPI: {displayPatient.upi || displayPatient.patientId || 'Unknown'}</span>
                  <span>MRN: {displayPatient.mrn || 'N/A'}</span>
                  {displayPatient.appointmentTime && (
                    <span>Appointment: {displayPatient.appointmentTime}</span>
                  )}
                  {displayPatient.status && (
                    <span className={`px-2 py-1 rounded-full text-xs ${displayPatient.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      displayPatient.status === 'no_show' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                      {displayPatient.status}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-white hover:bg-teal-50 text-teal-600 hover:text-teal-700 rounded-full p-2 transition-colors border border-teal-200 ml-4"
              >
                <IoClose className="text-xl" />
              </button>
            </div>
          </div>

          {/* Appointment Summary */}
          {(displayPatient.appointmentTime || displayPatient.psa || displayPatient.type) && (
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {displayPatient.appointmentTime && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Appointment Time:</span>
                      <span className="text-sm font-semibold text-gray-900">{displayPatient.appointmentTime}</span>
                    </div>
                  )}
                  {displayPatient.psa && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">PSA:</span>
                      <span className="text-sm font-semibold text-gray-900">{displayPatient.psa} ng/mL</span>
                    </div>
                  )}
                  {displayPatient.type && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Type:</span>
                      <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                        {displayPatient.type}
                      </span>
                    </div>
                  )}
                </div>
                {displayPatient.urologist && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Urologist:</span> {displayPatient.urologist}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('clinicalNotes')}
                className={`px-4 py-3 font-medium text-sm relative flex items-center ${activeTab === 'clinicalNotes'
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <FaNotesMedical className="mr-2" />
                Clinical Notes
                {activeTab === 'clinicalNotes' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('testResults')}
                className={`px-4 py-3 font-medium text-sm relative flex items-center ${activeTab === 'testResults'
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <IoAnalytics className="mr-2" />
                Clinical Investigation
                {activeTab === 'testResults' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                )}
              </button>

              {/* Decision Support tab */}
              <button
                onClick={() => setActiveTab('decisionSupport')}
                className={`px-4 py-3 font-medium text-sm relative flex items-center ${activeTab === 'decisionSupport'
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <IoMedical className="mr-2" />
                Decision Support
                {activeTab === 'decisionSupport' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                )}
              </button>

              {/* MDT Notes tab - only visible for surgery-pathway and post-op-followup patients */}
              {(patient.category === 'surgery-pathway' || patient.category === 'post-op-followup') && (
                <button
                  onClick={() => setActiveTab('mdtNotes')}
                  className={`px-4 py-3 font-medium text-sm relative flex items-center ${activeTab === 'mdtNotes'
                    ? 'text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <FaUserMd className="mr-2" />
                  MDT Notes
                  {activeTab === 'mdtNotes' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                  )}
                </button>
              )}

              {/* Discharge Summary tab - only visible for post-op-followup patients */}
              {/* Discharge Summary tab - visible for post-op-followup patients and discharged patients */}
              {(patient.category === 'post-op-followup' ||
                (patient.carePathway && patient.carePathway.toLowerCase() === 'discharge') ||
                (patient.pathway && patient.pathway.toLowerCase() === 'discharge') ||
                patient.status === 'Discharged') && (
                  <button
                    onClick={() => setActiveTab('dischargeSummary')}
                    className={`px-4 py-3 font-medium text-sm relative flex items-center ${activeTab === 'dischargeSummary'
                      ? 'text-teal-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <IoDocumentText className="mr-2" />
                    Discharge Summary
                    {activeTab === 'dischargeSummary' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                    )}
                  </button>
                )}

              {/* General Info tab - always last */}
              <button
                onClick={() => setActiveTab('generalInfo')}
                className={`px-4 py-3 font-medium text-sm relative flex items-center ${activeTab === 'generalInfo'
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <IoDocument className="mr-2" />
                General Info
                {activeTab === 'generalInfo' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600"></div>
                )}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden min-w-0">
            {activeTab === 'clinicalNotes' && (
              <div className="flex w-full">
                {/* Add Clinical Note Section - Fixed */}
                <div className="w-1/2 p-2 sm:p-3 lg:p-6 border-r border-gray-200 flex flex-col min-h-0">
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3 lg:p-5 border border-gray-200 flex flex-col h-full min-h-0">
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center flex-shrink-0">
                      <FaNotesMedical className="mr-1 sm:mr-2 text-teal-600" />
                      Add Clinical Note
                    </h3>

                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="flex flex-col mb-2 sm:mb-3 flex-shrink-0">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex-shrink-0">
                          Note Content
                        </label>
                        <textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Enter clinical note details..."
                          rows={4}
                          className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none min-h-[80px] sm:min-h-[100px] max-h-[150px] sm:max-h-[180px] lg:max-h-[220px] overflow-y-auto text-sm"
                        />
                      </div>

                      <div className="flex justify-between space-x-2 flex-shrink-0 mb-2">
                        <button
                          onClick={() => {
                            setNoteContent('');
                          }}
                          className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleSaveNote}
                          disabled={savingNote || !noteContent.trim()}
                          className="px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {savingNote ? (
                            <>
                              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5 sm:mr-2"></div>
                              <span className="hidden sm:inline">Saving...</span>
                              <span className="sm:hidden">Saving</span>
                            </>
                          ) : noteSaved ? (
                            <>
                              <IoCheckmark className="mr-1.5 sm:mr-2 text-sm sm:text-base" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <FaNotesMedical className="mr-1.5 sm:mr-2 text-xs sm:text-sm" />
                              <span>Save Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t border-gray-200 mt-2 pt-2 sm:pt-3 flex-shrink-0">
                      <div className="flex gap-2 sm:gap-3">
                        <button
                          onClick={() => setIsMDTSchedulingModalOpen(true)}
                          className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors flex items-center justify-center"
                        >
                          <FaUserNurse className="mr-1 sm:mr-2 text-xs sm:text-sm" />
                          <span className="whitespace-nowrap">Schedule MDT</span>
                        </button>
                        <button
                          onClick={() => setIsAddInvestigationModalOpen(true)}
                          className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                        >
                          <FaFlask className="mr-1 sm:mr-2 text-xs sm:text-sm" />
                          <span className="whitespace-nowrap">Add Clinical Investigation</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clinical Notes Timeline - Scrollable */}
                <div className="w-1/2 flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-200 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <BsClockHistory className="mr-2 text-teal-600" />
                      Case Timeline
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {loadingNotes ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-gray-500">Loading notes...</div>
                      </div>
                    ) : notesError ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-red-500">Error: {notesError}</div>
                      </div>
                    ) : clinicalNotes.length > 0 ? (
                      <div className="space-y-6">
                        {(() => {
                          // Reorganize notes to group reschedule notes with their parent Surgery Pathway notes
                          // Surgery Pathway notes should appear first, followed by their reschedule notes (indented)
                          const organizedNotes = [];
                          const processedIndices = new Set();

                          // First, collect all surgery pathway notes and all reschedule notes
                          const surgeryPathwayNotes = [];
                          const rescheduleNotes = [];

                          clinicalNotes.forEach((note, index) => {
                            const noteContent = note.content || '';
                            const isSurgeryPathway = noteContent.includes('Transfer To:') &&
                              (noteContent.includes('Surgery Pathway') ||
                                noteContent.toLowerCase().includes('surgery pathway'));
                            const isReschedule = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');

                            if (isSurgeryPathway) {
                              surgeryPathwayNotes.push({ note, index });
                            } else if (isReschedule) {
                              rescheduleNotes.push({ note, index });
                            }
                          });

                          // Sort surgery pathway notes by date (newest first, matching the notes order)
                          surgeryPathwayNotes.sort((a, b) => {
                            const dateA = new Date(a.note.createdAt || a.note.created_at);
                            const dateB = new Date(b.note.createdAt || b.note.created_at);
                            return dateB - dateA; // Newest first
                          });

                          // For each surgery pathway note, find and group its reschedule notes
                          surgeryPathwayNotes.forEach(({ note: surgeryNote, index: surgeryIndex }, pathwayIndex) => {
                            // Add the Surgery Pathway note
                            organizedNotes.push({ note: surgeryNote, index: surgeryIndex, isSubNote: false });
                            processedIndices.add(surgeryIndex);

                            // Find all reschedule notes that belong to this surgery pathway note
                            const surgeryDate = new Date(surgeryNote.createdAt || surgeryNote.created_at);

                            // Get the next surgery pathway note's date (if any) to create a boundary
                            const nextSurgeryDate = pathwayIndex < surgeryPathwayNotes.length - 1
                              ? new Date(surgeryPathwayNotes[pathwayIndex + 1].note.createdAt || surgeryPathwayNotes[pathwayIndex + 1].note.created_at)
                              : null;

                            // Find reschedule notes that belong to this surgery pathway note
                            // They should be created after this surgery note but before the next surgery note (if any)
                            const matchingReschedules = rescheduleNotes
                              .filter(({ note: rescheduleNote, index: rescheduleIndex }) => {
                                if (processedIndices.has(rescheduleIndex)) return false;

                                const rescheduleDate = new Date(rescheduleNote.createdAt || rescheduleNote.created_at);

                                // Reschedule note must be after this surgery pathway note
                                if (rescheduleDate < surgeryDate) return false;

                                // If there's a next surgery pathway note, reschedule must be before it
                                if (nextSurgeryDate && rescheduleDate >= nextSurgeryDate) return false;

                                return true;
                              })
                              .sort((a, b) => {
                                // Sort reschedule notes by date (newest first)
                                const dateA = new Date(a.note.createdAt || a.note.created_at);
                                const dateB = new Date(b.note.createdAt || b.note.created_at);
                                return dateB - dateA;
                              });

                            // Add matching reschedule notes right after the surgery pathway note
                            matchingReschedules.forEach(({ note: rescheduleNote, index: rescheduleIndex }) => {
                              organizedNotes.push({ note: rescheduleNote, index: rescheduleIndex, isSubNote: true });
                              processedIndices.add(rescheduleIndex);
                            });
                          });

                          // Add any remaining non-Surgery Pathway, non-reschedule notes in their original order
                          clinicalNotes.forEach((note, index) => {
                            if (processedIndices.has(index)) return;

                            const noteContent = note.content || '';
                            const isSurgeryPathway = noteContent.includes('Transfer To:') &&
                              (noteContent.includes('Surgery Pathway') ||
                                noteContent.toLowerCase().includes('surgery pathway'));
                            const isReschedule = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');

                            if (!isSurgeryPathway && !isReschedule) {
                              organizedNotes.push({ note, index, isSubNote: false });
                              processedIndices.add(index);
                            }
                          });

                          // Add any remaining unprocessed notes (orphaned reschedule notes, etc.)
                          clinicalNotes.forEach((note, index) => {
                            if (!processedIndices.has(index)) {
                              organizedNotes.push({ note, index, isSubNote: false });
                            }
                          });

                          return organizedNotes.map(({ note, isSubNote }, displayIndex) => {
                            const noteContent = note.content || '';
                            const isRescheduleNote = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');

                            return (
                              <div key={note.id || displayIndex} className={`flex gap-4 ${isSubNote ? 'ml-8 -mt-4' : ''}`}>
                                {/* Timeline indicator */}
                                <div className="flex flex-col items-center">
                                  {isSubNote ? (
                                    // For sub-notes, use a smaller connecting line
                                    <>
                                      <div className="w-0.5 h-4 bg-orange-200 mb-1"></div>
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isRescheduleNote ? 'bg-orange-100' : 'bg-teal-100'}`}>
                                        {getNoteIcon(note.type)}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRescheduleNote ? 'bg-orange-100' : 'bg-teal-100'}`}>
                                        {getNoteIcon(note.type)}
                                      </div>
                                      {displayIndex < organizedNotes.length - 1 && !isSubNote && (
                                        <div className={`w-0.5 h-16 mt-2 ${isRescheduleNote ? 'bg-orange-100' : 'bg-teal-100'}`}></div>
                                      )}
                                    </>
                                  )}
                                </div>

                                {/* Note content */}
                                <div className="flex-1 pb-4">
                                  <div className={`rounded-lg p-4 border ${isRescheduleNote ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${isRescheduleNote ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>
                                          {note.type === 'clinical_investigation' ? 'Clinical Investigation' :
                                            note.type === 'investigation_request' ? 'Investigation Request' :
                                              note.type || 'Clinical Note'}
                                        </span>
                                        <span className="text-sm text-gray-500 flex items-center">
                                          <IoTimeSharp className="mr-1" />
                                          {note.createdAt
                                            ? new Date(note.createdAt).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: '2-digit',
                                              day: '2-digit',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            })
                                            : 'No date'}
                                        </span>
                                      </div>

                                      {/* Author Name and Icon */}
                                      <div className="flex items-center gap-2">
                                        {getDesignationIcon(note.authorRole || note.author_role, note.type, note.content || '', note)}
                                        <span className="text-sm font-medium text-gray-900">
                                          {note.authorName || note.author_name || (note.type === 'pathway_transfer' || note.type === 'no_show' || (note.authorRole || note.author_role || '').toLowerCase() === 'automated' || (note.authorRole || note.author_role || '').toLowerCase() === 'system' || (note.content || '').includes('PATHWAY TRANSFER') || (note.content || '').includes('SURGERY APPOINTMENT RESCHEDULED') || (note.content || '').includes('automatically marked') ? 'System' : 'Unknown')}
                                        </span>
                                        {/* Edit Appointment button - ONLY show on clinical notes with Surgery Pathway (not pathway_transfer notes, not reschedule notes) */}
                                        {(() => {
                                          const noteContent = note.content || '';
                                          const noteType = note.type || '';

                                          // Don't show button on pathway_transfer notes - only on clinical notes
                                          if (noteType === 'pathway_transfer') {
                                            return null;
                                          }

                                          // Don't show button on reschedule notes
                                          const isRescheduleNote = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');
                                          if (isRescheduleNote) {
                                            return null;
                                          }

                                          // Only show on clinical notes that mention Surgery Pathway
                                          const noteContentLower = noteContent.toLowerCase();
                                          const hasSurgeryPathway =
                                            noteContent.includes('Surgery Pathway') ||
                                            noteContentLower.includes('surgery pathway') ||
                                            (noteContent.includes('Transfer To:') && noteContentLower.includes('surgery'));

                                          // Only show button on clinical notes with Surgery Pathway
                                          if (!hasSurgeryPathway) {
                                            console.log('❌ Edit Appointment button hidden - not a Surgery Pathway clinical note:', {
                                              noteId: note.id,
                                              noteType: note.type,
                                              hasSurgeryPathway,
                                              noteContentPreview: noteContent.substring(0, 150)
                                            });
                                            return null;
                                          }

                                          // Debug logging - button WILL be shown
                                          console.log('✅ Edit Appointment button WILL BE SHOWN:', {
                                            noteId: note.id,
                                            noteType: note.type,
                                            hasSurgeryPathway,
                                            isRescheduleNote,
                                            noteContentPreview: noteContent.substring(0, 150)
                                          });

                                          return (
                                            <button
                                              onClick={async () => {
                                                // Parse note content to extract pathway details
                                                const lines = noteContent.split('\n').filter(line => line.trim());
                                                const parsedData = {};
                                                let currentKey = null;
                                                let currentValue = [];

                                                lines.forEach(line => {
                                                  const trimmedLine = line.trim();
                                                  if (trimmedLine.includes('Transfer To:')) {
                                                    if (currentKey && currentValue.length > 0) {
                                                      parsedData[currentKey] = currentValue.join('\n');
                                                    }
                                                    currentKey = 'transferTo';
                                                    parsedData[currentKey] = trimmedLine.replace('Transfer To:', '').trim();
                                                    currentValue = [];
                                                  } else if (trimmedLine.includes('Priority:')) {
                                                    if (currentKey && currentValue.length > 0) {
                                                      parsedData[currentKey] = currentValue.join('\n');
                                                    }
                                                    currentKey = 'priority';
                                                    parsedData[currentKey] = trimmedLine.replace('Priority:', '').trim();
                                                    currentValue = [];
                                                  } else if (trimmedLine.includes('Reason for Transfer:') || trimmedLine.includes('Reason for Surgery:')) {
                                                    if (currentKey && currentValue.length > 0) {
                                                      parsedData[currentKey] = currentValue.join('\n');
                                                    }
                                                    currentKey = 'reason';
                                                    currentValue = [];
                                                  } else if (trimmedLine.includes('Clinical Rationale:')) {
                                                    if (currentKey && currentValue.length > 0) {
                                                      parsedData[currentKey] = currentValue.join('\n');
                                                    }
                                                    currentKey = 'clinicalRationale';
                                                    currentValue = [];
                                                  } else if (trimmedLine.includes('Additional Notes:')) {
                                                    if (currentKey && currentValue.length > 0) {
                                                      parsedData[currentKey] = currentValue.join('\n');
                                                    }
                                                    currentKey = 'additionalNotes';
                                                    currentValue = [];
                                                  } else if (trimmedLine && currentKey) {
                                                    currentValue.push(trimmedLine);
                                                  }
                                                });

                                                if (currentKey && currentValue.length > 0) {
                                                  parsedData[currentKey] = currentValue.join('\n');
                                                }

                                                // Fetch surgery appointment details
                                                try {
                                                  console.log('═══════════════════════════════════════════════════════════');
                                                  console.log('🔍 EDIT APPOINTMENT BUTTON CLICKED');
                                                  console.log('═══════════════════════════════════════════════════════════');
                                                  console.log('📍 Patient ID:', patient.id);
                                                  console.log('📍 Patient Name:', patient.name);
                                                  console.log('📍 Note Content Preview:', noteContent.substring(0, 200));

                                                  const appointmentsResult = await bookingService.getPatientAppointments(patient.id);
                                                  console.log('📥 API Response Success:', appointmentsResult.success);
                                                  console.log('📥 API Response Data:', JSON.stringify(appointmentsResult.data, null, 2));

                                                  if (appointmentsResult.success) {
                                                    const appointments = appointmentsResult.data?.appointments || appointmentsResult.data || [];
                                                    console.log('📋 Total Appointments Found:', appointments.length);
                                                    console.log('📋 All Appointments:', JSON.stringify(appointments, null, 2));

                                                    // Log each appointment's structure
                                                    appointments.forEach((apt, idx) => {
                                                      console.log(`\n📌 Appointment ${idx + 1}:`, {
                                                        id: apt.id,
                                                        appointmentType: apt.appointmentType,
                                                        type: apt.type,
                                                        appointment_type: apt.appointment_date,
                                                        surgeryType: apt.surgeryType,
                                                        surgery_type: apt.surgery_type,
                                                        notes: apt.notes?.substring(0, 100),
                                                        date: apt.appointmentDate || apt.appointment_date,
                                                        time: apt.appointmentTime || apt.appointment_time,
                                                        allKeys: Object.keys(apt)
                                                      });
                                                    });

                                                    // More robust search for surgery appointment
                                                    let surgeryAppointment = null;
                                                    let foundIndex = -1;

                                                    appointments.forEach((apt, idx) => {
                                                      const aptType = (apt.appointmentType || apt.type || apt.appointment_type || '').toLowerCase();
                                                      const surgeryType = (apt.surgeryType || apt.surgery_type || '').toLowerCase();
                                                      const notes = (apt.notes || '').toLowerCase();

                                                      // Check for various surgery appointment type formats
                                                      const isSurgery = aptType === 'surgery' ||
                                                        aptType === 'surgical' ||
                                                        aptType.includes('surgery') ||
                                                        aptType.includes('surgical') ||
                                                        surgeryType.includes('surgery') ||
                                                        notes.includes('surgery scheduled');

                                                      console.log(`\n🔎 Checking Appointment ${idx + 1}:`, {
                                                        id: apt.id,
                                                        aptType: aptType,
                                                        surgeryType: surgeryType,
                                                        notesPreview: notes.substring(0, 50),
                                                        isSurgery: isSurgery,
                                                        checks: {
                                                          'aptType === surgery': aptType === 'surgery',
                                                          'aptType === surgical': aptType === 'surgical',
                                                          'aptType.includes(surgery)': aptType.includes('surgery'),
                                                          'aptType.includes(surgical)': aptType.includes('surgical'),
                                                          'surgeryType.includes(surgery)': surgeryType.includes('surgery'),
                                                          'notes.includes(surgery scheduled)': notes.includes('surgery scheduled')
                                                        }
                                                      });

                                                      if (isSurgery && !surgeryAppointment) {
                                                        surgeryAppointment = apt;
                                                        foundIndex = idx;
                                                        console.log(`✅ FOUND SURGERY APPOINTMENT at index ${idx}!`);
                                                      }
                                                    });

                                                    // Fallback: If no surgery appointment found by type, try to find by surgeryType field or notes
                                                    if (!surgeryAppointment && appointments.length > 0) {
                                                      console.log('\n⚠️ PRIMARY SEARCH FAILED - Trying fallback search...');
                                                      appointments.forEach((apt, idx) => {
                                                        const surgeryType = (apt.surgeryType || apt.surgery_type || '').toLowerCase();
                                                        const notes = (apt.notes || '').toLowerCase();
                                                        const hasSurgeryType = surgeryType && surgeryType.length > 0;
                                                        const hasSurgeryInNotes = notes.includes('surgery scheduled') || notes.includes('surgery:');

                                                        console.log(`🔎 Fallback Check ${idx + 1}:`, {
                                                          id: apt.id,
                                                          hasSurgeryType: hasSurgeryType,
                                                          surgeryType: surgeryType,
                                                          hasSurgeryInNotes: hasSurgeryInNotes,
                                                          notesPreview: notes.substring(0, 50)
                                                        });

                                                        if ((hasSurgeryType || hasSurgeryInNotes) && !surgeryAppointment) {
                                                          surgeryAppointment = apt;
                                                          foundIndex = idx;
                                                          console.log(`✅ FOUND via FALLBACK at index ${idx}!`);
                                                        }
                                                      });

                                                      // Last resort: If patient has only one appointment and we're on a Surgery Pathway note,
                                                      // it's likely the surgery appointment even if type doesn't match
                                                      if (!surgeryAppointment && appointments.length === 1) {
                                                        console.log('\n⚠️ LAST RESORT: Only one appointment found, using it as surgery appointment');
                                                        surgeryAppointment = appointments[0];
                                                        foundIndex = 0;
                                                      }
                                                    }

                                                    console.log('\n═══════════════════════════════════════════════════════════');
                                                    console.log('📊 SEARCH RESULT:');
                                                    console.log('═══════════════════════════════════════════════════════════');
                                                    console.log('Found:', !!surgeryAppointment);
                                                    console.log('Found at index:', foundIndex);
                                                    if (surgeryAppointment) {
                                                      console.log('Selected Appointment:', JSON.stringify(surgeryAppointment, null, 2));
                                                    } else {
                                                      console.log('❌ NO SURGERY APPOINTMENT FOUND');
                                                      console.log('Available appointments:', appointments.map(apt => ({
                                                        id: apt.id,
                                                        type: apt.appointmentType || apt.type || apt.appointment_type,
                                                        surgeryType: apt.surgeryType || apt.surgery_type,
                                                        notes: apt.notes?.substring(0, 50)
                                                      })));
                                                    }
                                                    console.log('═══════════════════════════════════════════════════════════\n');

                                                    if (surgeryAppointment) {
                                                      setSelectedSurgeryAppointment({
                                                        ...surgeryAppointment,
                                                        reason: parsedData.reason || surgeryAppointment.surgeryType || surgeryAppointment.surgery_type || '',
                                                        priority: parsedData.priority || surgeryAppointment.priority || 'normal',
                                                        clinicalRationale: parsedData.clinicalRationale || '',
                                                        additionalNotes: parsedData.additionalNotes || ''
                                                      });
                                                      setIsEditSurgeryAppointmentModalOpen(true);
                                                      console.log('✅ Edit Appointment Modal Opened Successfully');
                                                    } else {
                                                      console.error('❌ ERROR: No surgery appointment found after all search attempts');
                                                      console.error('Available appointments structure:', appointments);
                                                      showErrorModal('Appointment Not Found', 'No surgery appointment found for this patient. Please schedule a surgery appointment first.');
                                                      // Refresh the appointment check
                                                      await checkSurgeryAppointment();
                                                    }
                                                  } else {
                                                    console.error('❌ API CALL FAILED');
                                                    console.error('Error:', appointmentsResult.error);
                                                    console.error('Full Response:', appointmentsResult);
                                                    showErrorModal('Failed to Fetch', `Failed to fetch appointment details: ${appointmentsResult.error || 'Unknown error'}`);
                                                  }
                                                } catch (error) {
                                                  console.error('❌ EXCEPTION CAUGHT');
                                                  console.error('Error:', error);
                                                  console.error('Error Stack:', error.stack);
                                                  console.error('Error Message:', error.message);
                                                  showErrorModal('Error', `Error fetching appointment details: ${error.message}`);
                                                }
                                              }}
                                              className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1"
                                            >
                                              <IoCalendar className="w-3 h-3" />
                                              Edit Appointment
                                            </button>
                                          );
                                        })()}
                                      </div>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-4">
                                      {renderPathwayTransferNote(note.content || 'No content available', note.type)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <BsClockHistory className="text-2xl text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Clinical Notes</h4>
                        <p className="text-gray-500">No clinical notes have been recorded for this patient yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'testResults' && (
              <div className="flex w-full h-full">
                {/* PSA Results Section - Left Side */}
                <div className="w-1/2 p-6 border-r border-gray-200">
                  <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <IoAnalytics className="mr-2 text-teal-600" />
                          PSA Results
                        </h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setIsAddPSAModalOpen(true)}
                            className="px-3 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add PSA</span>
                          </button>
                          {psaResults.length > 0 && (
                            <button
                              onClick={() => setIsPSAPlotModalOpen(true)}
                              className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium"
                            >
                              View Plot
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {/* PSA Velocity Display */}
                      {psaResults.length >= 2 && (() => {
                        const velocityData = calculatePSAVelocity(psaResults);
                        return (
                          <div className={`mb-4 p-4 rounded-lg border-2 ${velocityData.isHighRisk ? 'bg-red-50 border-red-300' : 'bg-teal-50 border-teal-200'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">PSA Velocity</h4>
                                <p className={`text-lg font-bold ${velocityData.isHighRisk ? 'text-red-700' : 'text-teal-700'}`}>
                                  {velocityData.velocityText}
                                </p>
                              </div>
                              {velocityData.isHighRisk && (
                                <div className="flex items-center gap-2">
                                  <IoAlertCircle className="text-red-600 text-xl" />
                                  <span className="text-sm font-semibold text-red-700">High Risk</span>
                                </div>
                              )}
                            </div>
                            {velocityData.isHighRisk && (
                              <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                                ⚠️ PSA velocity exceeds 0.75 ng/mL/year threshold. Consider MDT referral.
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {loadingInvestigations ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-gray-500">Loading investigations...</div>
                        </div>
                      ) : investigationsError ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-red-500">Error: {investigationsError}</div>
                        </div>
                      ) : psaResults.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">DATE</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">PSA VALUE (NG/ML)</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">NOTES</th>
                              </tr>
                            </thead>
                            <tbody>
                              {psaResults.map((psa) => {
                                // Check multiple possible date fields from API response
                                const date = psa.testDate || psa.test_date || psa.formattedDate || psa.created_at || psa.date;
                                let formattedDate = 'N/A';
                                if (date) {
                                  // If it's already formatted (from formattedDate field), use it
                                  if (psa.formattedDate && psa.formattedDate !== 'N/A' && psa.formattedDate.includes('/')) {
                                    // Convert from MM/DD/YYYY to DD-MM-YYYY format
                                    const parts = psa.formattedDate.split('/');
                                    if (parts.length === 3) {
                                      formattedDate = `${parts[1]}-${parts[0]}-${parts[2]}`;
                                    } else {
                                      formattedDate = psa.formattedDate;
                                    }
                                  } else {
                                    // Parse date object
                                    const dateObj = new Date(date);
                                    if (!isNaN(dateObj.getTime())) {
                                      const day = String(dateObj.getDate()).padStart(2, '0');
                                      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                      const year = dateObj.getFullYear();
                                      formattedDate = `${day}-${month}-${year}`;
                                    }
                                  }
                                }
                                const psaValue = psa.result_value || psa.result || 'N/A';
                                const displayValue = psaValue.toString().includes('ng/mL') ? psaValue : `${psaValue} ng/mL`;

                                return (
                                  <tr key={psa.id} className="border-b border-gray-100">
                                    <td className="py-3 px-4 text-sm text-gray-900">{formattedDate}</td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-900 font-medium">{displayValue}</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(psa.status)}`}>
                                          {psa.status || 'Normal'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600">{psa.notes || psa.comments || ''}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                            <IoAnalytics className="text-xl text-gray-400" />
                          </div>
                          <h4 className="text-base font-medium text-gray-900 mb-1">No PSA Results</h4>
                          <p className="text-gray-500 text-sm">No PSA results have been recorded for this patient yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Test Results Section - Right Side */}
                <div className="w-1/2 p-6">
                  <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <IoDocument className="mr-2 text-teal-600" />
                          Other Test Results & Reports
                        </h3>
                        <button
                          onClick={() => setIsAddInvestigationModalOpen(true)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm font-medium flex items-center space-x-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Test</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {(loadingInvestigations || loadingRequests) ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                            <span className="text-gray-600 text-sm">Loading...</span>
                          </div>
                        </div>
                      ) : (investigationsError || requestsError) ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-red-500 text-sm">{investigationsError || requestsError}</div>
                        </div>
                      ) : (investigationRequests.length > 0 || clinicalNotes.length > 0 || latestOtherTests.length > 0) ? (
                        <div className="space-y-6">
                          {/* Group investigation requests and clinical investigations by date */}
                          {(() => {
                            const getRequestStatusColor = (status) => {
                              switch (status?.toLowerCase()) {
                                case 'urgent':
                                  return 'bg-red-100 text-red-700 border-red-200';
                                case 'scheduled':
                                  return 'bg-blue-100 text-blue-700 border-blue-200';
                                case 'completed':
                                  return 'bg-green-100 text-green-700 border-green-200';
                                case 'results_awaited':
                                  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                case 'not_required':
                                  return 'bg-gray-100 text-gray-700 border-gray-200';
                                case 'pending':
                                case 'requested':
                                case 'requested_urgent':
                                  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                default:
                                  return 'bg-gray-100 text-gray-700 border-gray-200';
                              }
                            };

                            // Extract clinical investigations from notes
                            const clinicalInvestigations = clinicalNotes
                              .filter(note => note.type === 'clinical_investigation' || (note.content && note.content.includes('CLINICAL INVESTIGATION')))
                              .map(note => {
                                const content = note.content || '';
                                const lines = content.split('\n').filter(line => line.trim());
                                const data = {};

                                lines.forEach(line => {
                                  const trimmedLine = line.trim();
                                  if (trimmedLine.includes('Test/Procedure Name:')) {
                                    const testNameValue = trimmedLine.replace('Test/Procedure Name:', '').trim();
                                    data.testName = testNameValue;
                                    // Parse comma-separated test names
                                    if (testNameValue.includes(',')) {
                                      data.testNames = testNameValue.split(',').map(t => t.trim()).filter(t => t);
                                    } else if (testNameValue.includes(':')) {
                                      // Handle format like "PSA: PSA Total, PSA Free"
                                      const parts = testNameValue.split(',').map(t => t.trim());
                                      data.testNames = parts.map(p => {
                                        if (p.includes(':')) {
                                          return p.split(':')[1]?.trim() || p;
                                        }
                                        return p;
                                      }).filter(t => t);
                                    } else {
                                      data.testNames = [testNameValue];
                                    }
                                  } else if (trimmedLine.includes('Priority:')) {
                                    data.priority = trimmedLine.replace('Priority:', '').trim();
                                  } else if (trimmedLine.includes('Clinical Notes:')) {
                                    const notesIndex = trimmedLine.indexOf('Clinical Notes:');
                                    if (notesIndex !== -1) {
                                      data.clinicalNotes = trimmedLine.substring(notesIndex + 'Clinical Notes:'.length).trim();
                                    }
                                  }
                                });

                                // Get date from note
                                const noteDate = note.createdAt || note.created_at;
                                let formattedDate = 'No Date';
                                if (noteDate) {
                                  const dateObj = new Date(noteDate);
                                  const day = String(dateObj.getDate()).padStart(2, '0');
                                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                  const year = dateObj.getFullYear();
                                  formattedDate = `${day}-${month}-${year}`;
                                }

                                // Create individual entries for each test name
                                const testNames = data.testNames || (data.testName ? [data.testName] : []);
                                return testNames.map((testName, index) => ({
                                  id: `clinical-inv-${note.id}-${index}`,
                                  investigationName: testName,
                                  investigation_name: testName,
                                  investigationType: 'clinical_investigation',
                                  investigation_type: 'clinical_investigation',
                                  scheduledDate: noteDate,
                                  scheduled_date: noteDate,
                                  status: data.priority?.toLowerCase() === 'urgent' ? 'urgent' : 'pending',
                                  notes: data.clinicalNotes || '',
                                  isClinicalInvestigation: true,
                                  noteId: note.id,
                                  formattedDate: formattedDate
                                }));
                              })
                              .flat();

                            // Filter out test entries like "TEST DOCTOR" and doctor appointments
                            const filteredInvestigationRequests = investigationRequests.filter(request => {
                              const investigationName = (request.investigationName || request.investigation_name || '').toUpperCase();
                              const investigationType = (request.investigationType || request.investigation_type || '').toLowerCase();

                              // Filter out TEST DOCTOR
                              if (investigationName === 'TEST DOCTOR' || investigationName.includes('TEST DOCTOR')) {
                                return false;
                              }

                              // Filter out doctor appointments - these are consultations, not test results
                              // Doctor appointments typically have person names (first and last name with space)
                              // or investigation_type might be 'appointment' or 'consultation'
                              if (investigationType === 'appointment' || investigationType === 'consultation' || investigationType === 'urologist') {
                                return false;
                              }

                              // Filter out entries that look like person names (doctor names)
                              // Person names typically have a space between first and last name
                              // and are not common test names
                              const nameParts = investigationName.trim().split(/\s+/);
                              if (nameParts.length >= 2) {
                                // Check if it looks like a person name (not a test name)
                                const commonTestNames = ['MRI', 'TRUS', 'BIOPSY', 'PSA', 'ULTRASOUND', 'CT', 'X-RAY', 'BLOOD', 'URINE'];
                                const isTestName = commonTestNames.some(test => investigationName.includes(test));
                                if (!isTestName) {
                                  // Likely a person name (doctor appointment), exclude it
                                  return false;
                                }
                              }

                              return true;
                            });

                            const filteredClinicalInvestigations = clinicalInvestigations.filter(request => {
                              const investigationName = (request.investigationName || request.investigation_name || '').toUpperCase();
                              const investigationType = (request.investigationType || request.investigation_type || '').toLowerCase();

                              // Filter out TEST DOCTOR
                              if (investigationName === 'TEST DOCTOR' || investigationName.includes('TEST DOCTOR')) {
                                return false;
                              }

                              // Filter out doctor appointments
                              if (investigationType === 'appointment' || investigationType === 'consultation' || investigationType === 'urologist') {
                                return false;
                              }

                              // Filter out entries that look like person names (doctor names)
                              const nameParts = investigationName.trim().split(/\s+/);
                              if (nameParts.length >= 2) {
                                const commonTestNames = ['MRI', 'TRUS', 'BIOPSY', 'PSA', 'ULTRASOUND', 'CT', 'X-RAY', 'BLOOD', 'URINE'];
                                const isTestName = commonTestNames.some(test => investigationName.includes(test));
                                if (!isTestName) {
                                  return false;
                                }
                              }

                              return true;
                            });

                            // Combine investigation requests and clinical investigations
                            const allInvestigations = [...filteredInvestigationRequests, ...filteredClinicalInvestigations];

                            // Group by date
                            const groupedByDate = {};
                            allInvestigations.forEach((request) => {
                              let dateKey = 'No Date';
                              if (request.scheduledDate || request.scheduled_date) {
                                const dateObj = new Date(request.scheduledDate || request.scheduled_date);
                                const day = String(dateObj.getDate()).padStart(2, '0');
                                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const year = dateObj.getFullYear();
                                dateKey = `${day}-${month}-${year}`;
                              } else if (request.formattedDate && request.formattedDate !== 'No Date') {
                                dateKey = request.formattedDate;
                              }

                              if (!groupedByDate[dateKey]) {
                                groupedByDate[dateKey] = [];
                              }
                              groupedByDate[dateKey].push(request);
                            });

                            // Sort dates (newest first)
                            const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                              if (a === 'No Date') return 1;
                              if (b === 'No Date') return -1;
                              return b.localeCompare(a);
                            });

                            return sortedDates.map((dateKey) => {
                              // Sort tests within this date group: 
                              // Tests needing action (no results AND not "not_required") come first
                              // Tests with results OR marked "not_required" come last
                              const sortedTests = [...groupedByDate[dateKey]].sort((a, b) => {
                                const aName = (a.investigationName || a.investigation_name || '').trim().toUpperCase();
                                const bName = (b.investigationName || b.investigation_name || '').trim().toUpperCase();

                                // Use exact match only to prevent false matches (e.g., "MRI" matching "MRI SUB TEST")
                                const aHasResults = latestOtherTests.some(result => {
                                  const resultName = (result.testName || '').trim().toUpperCase();
                                  return resultName === aName;
                                });

                                const bHasResults = latestOtherTests.some(result => {
                                  const resultName = (result.testName || '').trim().toUpperCase();
                                  return resultName === bName;
                                });

                                const aIsNotRequired = (a.status || '').toLowerCase() === 'not_required';
                                const bIsNotRequired = (b.status || '').toLowerCase() === 'not_required';

                                // Tests that need action (no results AND not "not_required") should come first
                                const aNeedsAction = !aHasResults && !aIsNotRequired;
                                const bNeedsAction = !bHasResults && !bIsNotRequired;

                                // If one needs action and the other doesn't, prioritize the one that needs action
                                if (aNeedsAction && !bNeedsAction) return -1;
                                if (!aNeedsAction && bNeedsAction) return 1;
                                return 0; // Keep original order if both have same priority
                              });

                              return (
                                <div key={dateKey} className="mb-6 last:mb-0">
                                  <div className="mb-4 flex items-center">
                                    <div className="flex items-center space-x-2">
                                      <IoCalendar className="text-teal-600 text-base" />
                                      <h4 className="text-sm font-semibold text-gray-800">
                                        {dateKey}
                                      </h4>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-100 ml-3"></div>
                                  </div>
                                  <div className="space-y-2.5">
                                    {sortedTests.map((request) => {
                                      // Check if results have been uploaded for this investigation
                                      // Use exact match only to prevent false matches (e.g., "MRI" matching "MRI SUB TEST")
                                      const investigationName = (request.investigationName || request.investigation_name || '').trim().toUpperCase();

                                      // Find all results for this test (check both testName and testType)
                                      const allTestResults = otherTestResults.filter(result => {
                                        const resultName = (result.testName || result.test_name || '').trim().toUpperCase();
                                        const resultType = (result.testType || result.test_type || '').trim().toUpperCase();
                                        // Match by test name or test type
                                        return resultName === investigationName || resultType === investigationName;
                                      });

                                      const hasResults = allTestResults.length > 0;
                                      // Get the latest result for display
                                      const uploadedResult = allTestResults.length > 0 ? latestOtherTests.find(result => {
                                        const resultName = (result.testName || '').trim().toUpperCase();
                                        const resultType = (result.testType || '').trim().toUpperCase();
                                        return resultName === investigationName || resultType === investigationName;
                                      }) : null;

                                      // Handle status update for investigation requests
                                      const handleStatusUpdate = async (newStatus) => {
                                        if (!request.id || request.isClinicalInvestigation) {
                                          // For clinical investigations, we can't update status directly
                                          return;
                                        }

                                        try {
                                          const result = await investigationService.updateInvestigationRequestStatus(request.id, newStatus);
                                          if (result.success) {
                                            // Refresh investigation requests
                                            fetchInvestigationRequests();

                                            // Trigger event to refresh investigation management table
                                            window.dispatchEvent(new CustomEvent('investigationStatusUpdated', {
                                              detail: {
                                                patientId: patient.id,
                                                testName: investigationName,
                                                status: newStatus
                                              }
                                            }));

                                            setSuccessModalTitle('Status Updated');
                                            setSuccessModalMessage(`Investigation status updated to ${newStatus.replace('_', ' ').toUpperCase()}. The investigation management table will be refreshed.`);
                                            setIsSuccessModalOpen(true);
                                          } else {
                                            setErrorModalTitle('Update Failed');
                                            setErrorModalMessage(result.error || 'Failed to update status');
                                            setIsErrorModalOpen(true);
                                          }
                                        } catch (error) {
                                          setErrorModalTitle('Update Failed');
                                          setErrorModalMessage('Failed to update investigation request status');
                                          setIsErrorModalOpen(true);
                                        }
                                      };

                                      return (
                                        <div key={`request-${request.id}`} className="bg-gray-50 rounded-md p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-3">
                                                <h5 className="font-semibold text-gray-900 text-base">{investigationName}</h5>
                                                {(request.status || '').toLowerCase() === 'not_required' && (
                                                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                                    Not Required
                                                  </span>
                                                )}
                                              </div>

                                              {uploadedResult && uploadedResult.result && (
                                                <div className="text-sm text-gray-700 mb-2">
                                                  <span className="font-medium text-gray-600">Result: </span>
                                                  <span className="text-gray-900">{uploadedResult.result}</span>
                                                </div>
                                              )}

                                              {uploadedResult && uploadedResult.notes && (
                                                <div className="text-sm text-gray-600 mb-2">
                                                  <span className="font-medium">Notes: </span>
                                                  <span>{uploadedResult.notes}</span>
                                                </div>
                                              )}

                                              {!uploadedResult && request.notes && (
                                                <div className="text-sm text-gray-600 mb-2">
                                                  <span className="font-medium">Notes: </span>
                                                  <span>{request.notes}</span>
                                                </div>
                                              )}

                                              {/* Status update controls for investigation requests - only show if no results exist and not marked as not_required */}
                                              {!hasResults && !request.isClinicalInvestigation && request.id && (request.status || '').toLowerCase() !== 'not_required' && (
                                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                  <button
                                                    onClick={() => handleStatusUpdate('not_required')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${request.status === 'not_required'
                                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300'
                                                      }`}
                                                    disabled={request.status === 'not_required'}
                                                  >
                                                    Not Required
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-shrink-0">
                                              {hasResults ? (
                                                <button
                                                  onClick={() => {
                                                    // Map all results to display format
                                                    const formattedResults = allTestResults.map(result => ({
                                                      id: result.id,
                                                      testName: result.testName || result.test_name || result.testType || result.test_type,
                                                      date: result.testDate || result.test_date || result.created_at,
                                                      result: result.result || result.result_value,
                                                      referenceRange: result.referenceRange || result.reference_range || 'N/A',
                                                      status: result.status || 'Completed',
                                                      notes: result.notes || result.comments || '',
                                                      filePath: result.filePath || result.file_path,
                                                      authorName: result.authorName || result.author_name,
                                                      authorRole: result.authorRole || result.author_role,
                                                      createdAt: result.createdAt || result.created_at
                                                    })).sort((a, b) => {
                                                      // Sort by date, most recent first
                                                      const dateA = new Date(a.date || a.createdAt || 0);
                                                      const dateB = new Date(b.date || b.createdAt || 0);
                                                      return dateB - dateA;
                                                    });

                                                    setSelectedTestResults(formattedResults);
                                                    setSelectedTestName(investigationName);
                                                    setIsViewResultsModalOpen(true);
                                                  }}
                                                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                  View
                                                </button>
                                              ) : (
                                                (() => {
                                                  // Don't show upload button if status is not_required
                                                  const isNotRequired = (request.status || '').toLowerCase() === 'not_required';
                                                  if (isNotRequired) {
                                                    return null;
                                                  }

                                                  // Check if this is a PSA-related test
                                                  const isPSATest = investigationName.includes('PSA');
                                                  return (
                                                    <button
                                                      onClick={() => {
                                                        // For clinical investigations, create a request object
                                                        const requestToUse = request.isClinicalInvestigation ? {
                                                          id: request.noteId,
                                                          investigationName: request.investigationName,
                                                          investigation_name: request.investigation_name,
                                                          investigationType: request.investigationType,
                                                          investigation_type: request.investigation_type,
                                                          scheduledDate: request.scheduledDate,
                                                          scheduled_date: request.scheduled_date,
                                                          status: request.status,
                                                          notes: request.notes
                                                        } : request;
                                                        setSelectedInvestigationRequest(requestToUse);
                                                        setIsAddResultModalOpen(true);
                                                      }}
                                                      className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2"
                                                    >
                                                      {isPSATest ? (
                                                        <>
                                                          <Plus className="w-4 h-4" />
                                                          Add Value
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Upload className="w-4 h-4" />
                                                          Upload
                                                        </>
                                                      )}
                                                    </button>
                                                  );
                                                })()
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
                            <IoDocument className="text-2xl text-gray-400" />
                          </div>
                          <h4 className="text-base font-semibold text-gray-900 mb-1">No Test Results</h4>
                          <p className="text-gray-500 text-sm">No other test results have been recorded for this patient yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Decision Support Tab */}
            {activeTab === 'decisionSupport' && (
              <div className="flex w-full h-full overflow-y-auto">
                <div className="w-full p-6">
                  <DecisionSupportPanel patientId={patient?.id} />
                </div>
              </div>
            )}

            {/* MDT Notes Tab - only for surgery-pathway and post-op-followup patients */}
            {activeTab === 'mdtNotes' && (patient.category === 'surgery-pathway' || patient.category === 'post-op-followup') && (
              <div className="flex w-full h-full p-6">
                {/* MDT Notes Timeline - Full Width */}
                <div className="w-full flex flex-col min-h-0">
                  <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full min-h-0">
                    <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <BsClockHistory className="mr-2 text-teal-600" />
                        MDT Discussion History
                      </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                      {loadingMdtMeetings ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                          </div>
                          <h4 className="text-base font-medium text-gray-900 mb-1">Loading MDT Notes</h4>
                          <p className="text-gray-500 text-sm">Please wait while we fetch the MDT discussion history...</p>
                        </div>
                      ) : mdtMeetingsError ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                            <IoAlertCircle className="text-xl text-red-600" />
                          </div>
                          <h4 className="text-base font-medium text-gray-900 mb-1">Error Loading MDT Notes</h4>
                          <p className="text-gray-500 text-sm">{mdtMeetingsError}</p>
                        </div>
                      ) : transformedMdtNotes.length > 0 ? (
                        transformedMdtNotes.map((note, index) => (
                          <div key={note.id || index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className={`p-2 rounded-full ${getDesignationColor(note.designation)}`}>
                                  {getDesignationIcon(note.designation)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{note.author}</p>
                                  <p className="text-xs text-gray-500">{note.designation}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">{note.date}</p>
                                <p className="text-xs text-gray-500">{note.time}</p>
                              </div>
                            </div>

                            {note.meetingDate && (
                              <div className="mb-2 pb-2 border-b border-gray-200">
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium">MDT Meeting Date:</span> {note.meetingDate}
                                </p>
                              </div>
                            )}

                            {note.attendees && note.attendees.length > 0 && (
                              <div className="mb-2 pb-2 border-b border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-1">Attendees:</p>
                                <div className="flex flex-wrap gap-1">
                                  {note.attendees.map((attendee, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full">
                                      {attendee}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mb-2">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                            </div>

                            {note.recommendations && note.recommendations.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-1">Recommendations:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {note.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-xs text-gray-600">{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {note.actionItems && note.actionItems.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-1">Action Items:</p>
                                <ul className="space-y-1">
                                  {note.actionItems.map((item, idx) => (
                                    <li key={idx} className="flex items-start space-x-1 text-xs text-gray-600">
                                      <IoCheckmarkCircle className="text-teal-600 flex-shrink-0 mt-0.5" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {note.documents && note.documents.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-medium text-gray-700 mb-2">Uploaded Documents:</p>
                                <div className="space-y-2">
                                  {note.documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:border-teal-300 transition-colors">
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <div className="flex-shrink-0 text-lg">
                                          {getDocumentIcon(doc.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-900 truncate">{doc.name}</p>
                                          <p className="text-[10px] text-gray-500">
                                            {doc.size} • Uploaded {doc.uploadDate}
                                          </p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleViewDocument(doc)}
                                        className="flex-shrink-0 ml-2 px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center"
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        View
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                            <FaUserMd className="text-xl text-gray-400" />
                          </div>
                          <h4 className="text-base font-medium text-gray-900 mb-1">No MDT Notes</h4>
                          <p className="text-gray-500 text-sm">No MDT discussions have been documented for this patient yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Discharge Summary Tab - visible for post-op-followup patients and discharged patients */}
            {activeTab === 'dischargeSummary' && (patient.category === 'post-op-followup' ||
              (patient.carePathway && patient.carePathway.toLowerCase() === 'discharge') ||
              (patient.pathway && patient.pathway.toLowerCase() === 'discharge') ||
              patient.status === 'Discharged') && (
                <div className="flex w-full h-full overflow-y-auto p-6">
                  <div className="w-full mx-auto space-y-6">
                    {/* Header Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Discharge Summary</h2>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                          Discharged
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Patient Name</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{patient.patientName || patient.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">MRN</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{patient.mrn || patient.upi}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Admission Date</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.admissionDate}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Discharge Date</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.dischargeDate}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Length of Stay</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.lengthOfStay}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Consultant</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.consultantName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Ward</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.ward}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Discharge Time</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.dischargeTime}</p>
                        </div>
                      </div>
                    </div>

                    {/* Diagnosis Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <IoMedical className="mr-2 text-teal-600" />
                        Diagnosis
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Primary Diagnosis:</p>
                          <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">
                            {dischargeSummary.diagnosis?.primary || 'Not specified'}
                          </p>
                        </div>
                        {dischargeSummary.diagnosis?.secondary &&
                          Array.isArray(dischargeSummary.diagnosis.secondary) &&
                          dischargeSummary.diagnosis.secondary.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700">Secondary Diagnosis:</p>
                              <ul className="mt-1 space-y-1">
                                {dischargeSummary.diagnosis.secondary.map((diag, idx) => (
                                  <li key={idx} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">• {diag}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Procedure Section */}
                    {dischargeSummary.procedure && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FaStethoscope className="mr-2 text-teal-600" />
                          Procedure Details
                        </h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700">Procedure:</p>
                              <p className="text-sm text-gray-900 mt-1">{dischargeSummary.procedure?.name || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">Date:</p>
                              <p className="text-sm text-gray-900 mt-1">{dischargeSummary.procedure?.date || 'Not specified'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm font-medium text-gray-700">Surgeon:</p>
                              <p className="text-sm text-gray-900 mt-1">{dischargeSummary.procedure?.surgeon || 'Not specified'}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Operative Findings:</p>
                            <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">
                              {dischargeSummary.procedure?.findings || 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Clinical Summary */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <IoDocumentText className="mr-2 text-teal-600" />
                        Clinical Summary
                      </h3>
                      <p className="text-sm text-gray-900 leading-relaxed bg-gray-50 p-4 rounded">
                        {dischargeSummary.clinicalSummary || 'No clinical summary available'}
                      </p>
                    </div>

                    {/* Investigations */}
                    {dischargeSummary.investigations && Array.isArray(dischargeSummary.investigations) && dischargeSummary.investigations.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <IoAnalytics className="mr-2 text-teal-600" />
                          Investigations
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {dischargeSummary.investigations.map((inv, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-4 text-sm text-gray-900">{inv.test}</td>
                                  <td className="py-2 px-4 text-sm text-gray-500">{inv.date}</td>
                                  <td className="py-2 px-4 text-sm text-gray-900">{inv.result}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Medications */}
                    {dischargeSummary.medications && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FaPills className="mr-2 text-teal-600" />
                          Medications
                        </h3>

                        {dischargeSummary.medications.discharged && dischargeSummary.medications.discharged.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase">Discharge Medications</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-50">
                                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Drug</th>
                                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
                                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                    <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Instructions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {dischargeSummary.medications.discharged.map((med, idx) => (
                                    <tr key={idx}>
                                      <td className="py-2 px-4 text-sm font-medium text-gray-900">{med.name}</td>
                                      <td className="py-2 px-4 text-sm text-gray-500">{med.dose}</td>
                                      <td className="py-2 px-4 text-sm text-gray-500">{med.frequency}</td>
                                      <td className="py-2 px-4 text-sm text-gray-500">{med.duration}</td>
                                      <td className="py-2 px-4 text-sm text-gray-500">{med.instructions}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {dischargeSummary.medications.stopped && dischargeSummary.medications.stopped.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase">Stopped Medications</h4>
                            <ul className="space-y-2">
                              {dischargeSummary.medications.stopped.map((med, idx) => (
                                <li key={idx} className="text-sm text-gray-900 bg-red-50 p-3 rounded border border-red-100 flex justify-between">
                                  <span className="font-medium">{med.name}</span>
                                  <span className="text-red-600">{med.reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Follow Up & GP Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Follow Up */}
                      {dischargeSummary.followUp && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <IoCalendar className="mr-2 text-teal-600" />
                            Follow Up Plan
                          </h3>
                          <div className="space-y-4">
                            {dischargeSummary.followUp.catheterRemoval && (
                              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                <p className="text-xs font-bold text-blue-800 uppercase mb-1">Catheter Removal</p>
                                <p className="text-sm font-medium text-blue-900">{dischargeSummary.followUp.catheterRemoval.date}</p>
                                <p className="text-xs text-blue-700 mt-1">{dischargeSummary.followUp.catheterRemoval.location}</p>
                                <p className="text-xs text-blue-700 mt-1 italic">{dischargeSummary.followUp.catheterRemoval.instructions}</p>
                              </div>
                            )}

                            {dischargeSummary.followUp.postOpReview && (
                              <div className="bg-teal-50 p-3 rounded border border-teal-100">
                                <p className="text-xs font-bold text-teal-800 uppercase mb-1">Post-Op Review</p>
                                <p className="text-sm font-medium text-teal-900">{dischargeSummary.followUp.postOpReview.date}</p>
                                <p className="text-xs text-teal-700 mt-1">{dischargeSummary.followUp.postOpReview.location}</p>
                                <p className="text-xs text-teal-700 mt-1 italic">{dischargeSummary.followUp.postOpReview.instructions}</p>
                              </div>
                            )}

                            {dischargeSummary.followUp.additionalInstructions && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Instructions</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {dischargeSummary.followUp.additionalInstructions.map((inst, idx) => (
                                    <li key={idx} className="text-sm text-gray-700">{inst}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* GP Actions */}
                      {dischargeSummary.gpActions && (
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FaUserMd className="mr-2 text-teal-600" />
                            GP Actions
                          </h3>
                          <ul className="space-y-2">
                            {dischargeSummary.gpActions.map((action, idx) => (
                              <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700 bg-yellow-50 p-3 rounded border border-yellow-100">
                                <IoCheckmarkCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Documents */}
                    {dischargeSummary.documents && dischargeSummary.documents.length > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <IoDocument className="mr-2 text-teal-600" />
                          Discharge Documents
                        </h3>
                        <div className="space-y-2">
                          {dischargeSummary.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:border-teal-300 transition-colors">
                              <div className="flex items-center space-x-3">
                                <div className="text-2xl text-red-500">
                                  <IoDocumentText />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                  <p className="text-xs text-gray-500">{doc.size} • {doc.type.toUpperCase()}</p>
                                </div>
                              </div>
                              <button className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 transition-colors">
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}


            {activeTab === 'generalInfo' && (
              <div className="flex w-full h-full overflow-y-auto p-6">
                <div className="w-full mx-auto space-y-6">
                  {loadingPatientData ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading patient details...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Use fullPatientData if available, otherwise fallback to patient prop */}
                      {(() => {
                        const displayPatient = fullPatientData || patient;

                        // Get patient pipeline stage
                        const pipelineData = getPatientPipelineStage(
                          displayPatient,
                          appointments || [], // Appointments for pipeline
                          mdtMeetings || []  // MDT meetings for pipeline
                        );

                        return (
                          <>
                            {/* Edit Button */}
                            <div className="flex justify-end mb-4">
                              <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Patient Details
                              </button>
                            </div>

                            {/* Patient Journey Pipeline */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                                <IoCalendar className="mr-2 text-teal-600" />
                                Patient Journey Pipeline
                              </h3>
                              <div className="relative">
                                {/* Pipeline Flow */}
                                <div className="flex items-center justify-between">
                                  {pipelineData.stages.map((stage, index) => {
                                    // Get color classes based on stage color
                                    const getColorClasses = (color, type) => {
                                      const colorMap = {
                                        blue: {
                                          bg: 'bg-blue-500',
                                          bgLight: 'bg-blue-100',
                                          bgLighter: 'bg-blue-50',
                                          text: 'text-blue-700',
                                          textLight: 'text-blue-600',
                                          border: 'border-blue-300',
                                          borderLight: 'border-blue-200',
                                          ring: 'ring-blue-200'
                                        },
                                        indigo: {
                                          bg: 'bg-indigo-500',
                                          bgLight: 'bg-indigo-100',
                                          bgLighter: 'bg-indigo-50',
                                          text: 'text-indigo-700',
                                          textLight: 'text-indigo-600',
                                          border: 'border-indigo-300',
                                          borderLight: 'border-indigo-200',
                                          ring: 'ring-indigo-200'
                                        },
                                        purple: {
                                          bg: 'bg-purple-500',
                                          bgLight: 'bg-purple-100',
                                          bgLighter: 'bg-purple-50',
                                          text: 'text-purple-700',
                                          textLight: 'text-purple-600',
                                          border: 'border-purple-300',
                                          borderLight: 'border-purple-200',
                                          ring: 'ring-purple-200'
                                        },
                                        orange: {
                                          bg: 'bg-orange-500',
                                          bgLight: 'bg-orange-100',
                                          bgLighter: 'bg-orange-50',
                                          text: 'text-orange-700',
                                          textLight: 'text-orange-600',
                                          border: 'border-orange-300',
                                          borderLight: 'border-orange-200',
                                          ring: 'ring-orange-200'
                                        },
                                        green: {
                                          bg: 'bg-green-500',
                                          bgLight: 'bg-green-100',
                                          bgLighter: 'bg-green-50',
                                          text: 'text-green-700',
                                          textLight: 'text-green-600',
                                          border: 'border-green-300',
                                          borderLight: 'border-green-200',
                                          ring: 'ring-green-200'
                                        }
                                      };
                                      return colorMap[color]?.[type] || '';
                                    };

                                    return (
                                      <>
                                        {/* Stage Circle */}
                                        <div key={stage.id} className="flex flex-col items-center flex-1">
                                          <div
                                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${stage.isActive
                                              ? `${getColorClasses(stage.color, 'bg')} text-white shadow-lg ring-4 ${getColorClasses(stage.color, 'ring')}`
                                              : stage.isCompleted
                                                ? `${getColorClasses(stage.color, 'bgLight')} ${getColorClasses(stage.color, 'text')} border-2 ${getColorClasses(stage.color, 'border')}`
                                                : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                                              }`}
                                          >
                                            {(() => {
                                              switch (stage.icon) {
                                                case 'referral':
                                                  return <IoClipboard className="w-7 h-7" />;
                                                case 'opd':
                                                  return <IoBusiness className="w-7 h-7" />;
                                                case 'mdt':
                                                  return <IoPeople className="w-7 h-7" />;
                                                case 'surgery':
                                                  return <IoMedical className="w-7 h-7" />;
                                                case 'discharge':
                                                  return <IoCheckmarkDone className="w-7 h-7" />;
                                                default:
                                                  return <IoDocument className="w-7 h-7" />;
                                              }
                                            })()}
                                          </div>
                                          <div className="mt-3 text-center">
                                            <p
                                              className={`text-sm font-medium ${stage.isActive
                                                ? getColorClasses(stage.color, 'text')
                                                : stage.isCompleted
                                                  ? getColorClasses(stage.color, 'textLight')
                                                  : 'text-gray-500'
                                                }`}
                                            >
                                              {stage.name}
                                            </p>
                                            {stage.isActive && (
                                              <span className="inline-block mt-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                                                Current
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Arrow Connector */}
                                        {index < pipelineData.stages.length - 1 && (
                                          <div className="flex-1 mx-2 h-0.5 relative flex items-center">
                                            <div
                                              className={`h-full flex-1 ${stage.isCompleted || stage.isActive
                                                ? getColorClasses(stage.color, 'bgLight')
                                                : 'bg-gray-300'
                                                }`}
                                            />
                                            <div className="flex items-center justify-center">
                                              <svg
                                                className={`w-5 h-5 ${stage.isCompleted || stage.isActive
                                                  ? getColorClasses(stage.color, 'text')
                                                  : 'text-gray-400'
                                                  }`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })}
                                </div>

                                {/* Current Stage Info */}
                                {(() => {
                                  const currentStage = pipelineData.stages[pipelineData.stages.length - 1];
                                  const getColorClasses = (color, type) => {
                                    const colorMap = {
                                      blue: { bgLighter: 'bg-blue-50', borderLight: 'border-blue-200', text: 'text-blue-700' },
                                      indigo: { bgLighter: 'bg-indigo-50', borderLight: 'border-indigo-200', text: 'text-indigo-700' },
                                      purple: { bgLighter: 'bg-purple-50', borderLight: 'border-purple-200', text: 'text-purple-700' },
                                      orange: { bgLighter: 'bg-orange-50', borderLight: 'border-orange-200', text: 'text-orange-700' },
                                      green: { bgLighter: 'bg-green-50', borderLight: 'border-green-200', text: 'text-green-700' }
                                    };
                                    return colorMap[color]?.[type] || '';
                                  };

                                  return (
                                    <div className={`mt-6 p-4 rounded-lg ${getColorClasses(currentStage.color, 'bgLighter')} border ${getColorClasses(currentStage.color, 'borderLight')}`}>
                                      <div className="flex items-center">
                                        <span className="text-2xl mr-3">{currentStage.icon}</span>
                                        <div>
                                          <p className="text-sm font-semibold text-gray-700">
                                            Current Stage: <span className={getColorClasses(currentStage.color, 'text')}>{currentStage.name}</span>
                                          </p>
                                          <p className="text-xs text-gray-600 mt-1">
                                            Care Pathway: {displayPatient.carePathway || displayPatient.care_pathway || 'Not assigned'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Personal Information */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <IoHeart className="mr-2 text-teal-600" />
                                Personal Information
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="text-gray-600">First Name:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.firstName || displayPatient.first_name || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Last Name:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.lastName || displayPatient.last_name || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Date of Birth:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.dateOfBirth || displayPatient.date_of_birth
                                      ? new Date(displayPatient.dateOfBirth || displayPatient.date_of_birth).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Age:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.age || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Email:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.email || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Phone:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.phone || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Postcode:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.postcode || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">City:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.city || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Gender:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.gender || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">State:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.state || 'N/A'}</span>
                                </div>
                                <div className="md:col-span-2">
                                  <span className="text-gray-600">Address:</span>
                                  <span className="ml-2 font-medium text-gray-900">{displayPatient.address || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {/* PSA Information */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <IoAnalytics className="mr-2 text-teal-600" />
                                PSA Information
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="text-gray-600">Initial PSA Level:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.initialPSA || displayPatient.initial_psa
                                      ? `${parseFloat(displayPatient.initialPSA || displayPatient.initial_psa).toFixed(2)} ng/mL`
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">PSA Test Date:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.initialPSADate || displayPatient.initial_psa_date
                                      ? new Date(displayPatient.initialPSADate || displayPatient.initial_psa_date).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Medical Information */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <IoDocument className="mr-2 text-teal-600" />
                                Medical Information
                              </h3>
                              <div className="space-y-4">
                                <div>
                                  <span className="text-gray-600">Referral Date:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.referralDate || displayPatient.referral_date
                                      ? new Date(displayPatient.referralDate || displayPatient.referral_date).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                      : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Referring Department:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.referringDepartment || displayPatient.referring_department || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Referring GP:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.referredByGP || displayPatient.referred_by_gp || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Assigned Urologist:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.assignedUrologist || displayPatient.assigned_urologist || 'Not assigned'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Priority:</span>
                                  <span className="ml-2">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${(displayPatient.priority || 'normal').toLowerCase() === 'urgent'
                                      ? 'bg-red-100 text-red-700'
                                      : (displayPatient.priority || 'normal').toLowerCase() === 'high'
                                        ? 'bg-orange-100 text-orange-700'
                                        : 'bg-blue-100 text-blue-700'
                                      }`}>
                                      {displayPatient.priority || 'Normal'}
                                    </span>
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Medical History:</span>
                                  <div className="ml-2 font-medium text-gray-900 whitespace-pre-line">
                                    {displayPatient.medicalHistory || displayPatient.medical_history || 'No prior medical conditions'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Current Medications:</span>
                                  <div className="ml-2 font-medium text-gray-900 whitespace-pre-line">
                                    {displayPatient.currentMedications || displayPatient.current_medications || 'None'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Allergies:</span>
                                  <div className={`ml-2 font-medium whitespace-pre-line ${displayPatient.allergies ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {displayPatient.allergies || 'None'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Additional Notes:</span>
                                  <div className={`ml-2 font-medium whitespace-pre-line ${displayPatient.notes ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {displayPatient.notes || 'None'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <IoHeart className="mr-2 text-teal-600" />
                                Emergency Contact
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <span className="text-gray-600">Contact Name:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.emergencyContactName || displayPatient.emergency_contact_name || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Contact Phone:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.emergencyContactPhone || displayPatient.emergency_contact_phone || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Relationship:</span>
                                  <span className="ml-2 font-medium text-gray-900">
                                    {displayPatient.emergencyContactRelationship || displayPatient.emergency_contact_relationship || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Nurse Triage Information */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FaStethoscope className="mr-2 text-teal-600" />
                                Nurse Triage Information
                              </h3>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-3">Symptoms & Presentation - Chief Complaint</h4>
                                  {(() => {
                                    // Parse triage symptoms if it's a JSON string
                                    let triageSymptoms = displayPatient.triageSymptoms || displayPatient.triage_symptoms;
                                    if (typeof triageSymptoms === 'string') {
                                      try {
                                        triageSymptoms = JSON.parse(triageSymptoms);
                                      } catch (e) {
                                        triageSymptoms = [];
                                      }
                                    }

                                    // Ensure it's an array
                                    if (!Array.isArray(triageSymptoms)) {
                                      triageSymptoms = [];
                                    }

                                    return triageSymptoms && triageSymptoms.length > 0 ? (
                                      <div className="space-y-3">
                                        {triageSymptoms.map((symptom, index) => {
                                          // Normalize field names (handle both camelCase and snake_case)
                                          const symptomName = symptom.name || '';
                                          const ipssScore = symptom.ipssScore || symptom.ipss_score || null;
                                          const duration = symptom.duration || null;
                                          const durationUnit = symptom.durationUnit || symptom.duration_unit || '';
                                          const frequency = symptom.frequency || null;
                                          const notes = symptom.notes || null;
                                          const isCustom = symptom.isCustom || false;

                                          return (
                                            <div key={index} className={`border border-gray-200 rounded-lg p-4 ${isCustom ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-3">
                                                    <span className="font-medium text-gray-900 text-base">{symptomName}</span>
                                                    {isCustom && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">(Custom)</span>}
                                                  </div>
                                                  <div className={`grid gap-3 text-sm mb-3 ${symptomName === 'LUTS'
                                                    ? (frequency ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2')
                                                    : (frequency ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')
                                                    }`}>
                                                    {symptomName === 'LUTS' && (
                                                      <div>
                                                        <span className="text-gray-600">IPSS Score:</span>
                                                        <span className="ml-2 font-medium text-gray-900">{ipssScore || 'N/A'}</span>
                                                      </div>
                                                    )}
                                                    {frequency && (
                                                      <div>
                                                        <span className="text-gray-600">Frequency:</span>
                                                        <span className="ml-2 font-medium text-gray-900">
                                                          {frequency} {symptomName === 'Nocturia' ? (frequency === 1 ? 'time per night' : 'times per night') : 'times'}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  {notes && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                      <span className="text-gray-600 text-sm font-medium">Notes:</span>
                                                      <div className="mt-1 text-sm text-gray-900 whitespace-pre-line bg-white p-2 rounded border border-gray-200">
                                                        {notes}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-gray-500">
                                        <p>No triage symptoms recorded.</p>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Exam & Prior Tests */}
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <IoDocument className="mr-2 text-teal-600" />
                                Exam & Prior Tests
                              </h3>
                              <div className="space-y-4">
                                {/* DRE Findings */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">DRE (Digital Rectal Exam)</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-gray-600">DRE Done:</span>
                                      <span className="ml-2 font-medium text-gray-900">
                                        {(displayPatient.dreDone || displayPatient.dre_done) ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                    {(displayPatient.dreDone || displayPatient.dre_done) && (displayPatient.dreFindings || displayPatient.dre_findings) && (
                                      <div>
                                        <span className="text-gray-600">DRE Findings:</span>
                                        <span className="ml-2 font-medium text-gray-900">{displayPatient.dreFindings || displayPatient.dre_findings}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Prior Prostate Biopsy */}
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Prior Prostate Biopsy</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <span className="text-gray-600">Prior Biopsy:</span>
                                      <span className="ml-2 font-medium text-gray-900">
                                        {(displayPatient.priorBiopsy || displayPatient.prior_biopsy) === 'yes' ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                    {(displayPatient.priorBiopsy || displayPatient.prior_biopsy) === 'yes' && (displayPatient.priorBiopsyDate || displayPatient.prior_biopsy_date) && (
                                      <div>
                                        <span className="text-gray-600">Biopsy Date:</span>
                                        <span className="ml-2 font-medium text-gray-900">
                                          {new Date(displayPatient.priorBiopsyDate || displayPatient.prior_biopsy_date).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                          })}
                                        </span>
                                      </div>
                                    )}
                                    {(displayPatient.priorBiopsy || displayPatient.prior_biopsy) === 'yes' && (displayPatient.gleasonScore || displayPatient.gleason_score) && (
                                      <div>
                                        <span className="text-gray-600">Gleason Score:</span>
                                        <span className="ml-2 font-medium text-gray-900">{displayPatient.gleasonScore || displayPatient.gleason_score}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Comorbidities */}
                                {(displayPatient.comorbidities || []) && (displayPatient.comorbidities || []).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Comorbidities</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {(displayPatient.comorbidities || []).map((comorbidity, index) => (
                                        <span
                                          key={index}
                                          className="px-3 py-1 bg-teal-100 text-teal-700 text-sm rounded-full font-medium"
                                        >
                                          {comorbidity}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Show message if no data */}
                                {!(displayPatient.dreDone || displayPatient.dre_done) && (displayPatient.priorBiopsy || displayPatient.prior_biopsy) !== 'yes' && (!displayPatient.comorbidities || displayPatient.comorbidities.length === 0) && (
                                  <div className="text-center py-8 text-gray-500">
                                    <p>No exam or prior test information available.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Discharge Summary Tab - only for post-op-followup patients */}
            {activeTab === 'dischargeSummary' && patient.category === 'post-op-followup' && (
              <div className="flex w-full h-full overflow-y-auto p-6">
                <div className="w-full mx-auto space-y-6">
                  {/* Header Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">Discharge Summary</h2>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        Discharged
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Patient Name</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{patient.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">MRN</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{patient.mrn}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Admission Date</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.admissionDate}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Discharge Date</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.dischargeDate}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Length of Stay</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.lengthOfStay}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Consultant</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.consultantName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Ward</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.ward}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Discharge Time</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{dischargeSummary.dischargeTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <IoMedical className="mr-2 text-teal-600" />
                      Diagnosis
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Primary Diagnosis:</p>
                        <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">{dischargeSummary.diagnosis.primary}</p>
                      </div>
                      {dischargeSummary.diagnosis.secondary.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Secondary Diagnosis:</p>
                          <ul className="mt-1 space-y-1">
                            {dischargeSummary.diagnosis.secondary.map((diag, idx) => (
                              <li key={idx} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">• {diag}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Procedure Section */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaStethoscope className="mr-2 text-teal-600" />
                      Procedure Details
                    </h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Procedure:</p>
                          <p className="text-sm text-gray-900 mt-1">{dischargeSummary.procedure.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Date:</p>
                          <p className="text-sm text-gray-900 mt-1">{dischargeSummary.procedure.date}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-700">Surgeon:</p>
                          <p className="text-sm text-gray-900 mt-1">{dischargeSummary.procedure.surgeon}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Operative Findings:</p>
                        <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded">{dischargeSummary.procedure.findings}</p>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Summary */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <IoDocumentText className="mr-2 text-teal-600" />
                      Clinical Summary
                    </h3>
                    <p className="text-sm text-gray-900 leading-relaxed bg-gray-50 p-4 rounded">{dischargeSummary.clinicalSummary}</p>
                  </div>

                  {/* Investigations */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <IoAnalytics className="mr-2 text-teal-600" />
                      Investigations
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Test</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Result</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dischargeSummary.investigations.map((inv, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-3 px-4 text-sm text-gray-900">{inv.test}</td>
                              <td className="py-3 px-4 text-sm text-gray-900">{inv.result}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{inv.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaPills className="mr-2 text-teal-600" />
                      Medications on Discharge
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Current Medications:</p>
                        <div className="space-y-2">
                          {dischargeSummary.medications.discharged.map((med, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900">{med.name} - {med.dose}</p>
                                  <p className="text-xs text-gray-600 mt-1">{med.frequency} for {med.duration}</p>
                                  <p className="text-xs text-gray-600 mt-1 italic">{med.instructions}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {dischargeSummary.medications.stopped.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Medications Stopped:</p>
                          <div className="space-y-2">
                            {dischargeSummary.medications.stopped.map((med, idx) => (
                              <div key={idx} className="bg-red-50 p-3 rounded border border-red-200">
                                <p className="text-sm font-semibold text-gray-900">{med.name}</p>
                                <p className="text-xs text-gray-600 mt-1">Reason: {med.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Follow-up Arrangements */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <IoCalendar className="mr-2 text-teal-600" />
                      Follow-up Arrangements
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded border border-blue-200">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Catheter Removal</p>
                        <p className="text-sm text-gray-700"><span className="font-medium">Date:</span> {dischargeSummary.followUp.catheterRemoval.date}</p>
                        <p className="text-sm text-gray-700"><span className="font-medium">Location:</span> {dischargeSummary.followUp.catheterRemoval.location}</p>
                        <p className="text-sm text-gray-700 mt-2">{dischargeSummary.followUp.catheterRemoval.instructions}</p>
                      </div>

                      <div className="bg-green-50 p-4 rounded border border-green-200">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Post-Operative Review</p>
                        <p className="text-sm text-gray-700"><span className="font-medium">Date:</span> {dischargeSummary.followUp.postOpReview.date}</p>
                        <p className="text-sm text-gray-700"><span className="font-medium">Location:</span> {dischargeSummary.followUp.postOpReview.location}</p>
                        <p className="text-sm text-gray-700 mt-2">{dischargeSummary.followUp.postOpReview.instructions}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Additional Instructions:</p>
                        <ul className="space-y-1">
                          {dischargeSummary.followUp.additionalInstructions.map((instruction, idx) => (
                            <li key={idx} className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex items-start">
                              <IoCheckmarkCircle className="text-teal-600 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* GP Actions */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaUserMd className="mr-2 text-teal-600" />
                      Actions Required by GP
                    </h3>
                    <ul className="space-y-2">
                      {dischargeSummary.gpActions.map((action, idx) => (
                        <li key={idx} className="text-sm text-gray-900 bg-yellow-50 p-3 rounded border border-yellow-200 flex items-start">
                          <IoAlertCircle className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Documents */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <IoDocument className="mr-2 text-teal-600" />
                      Discharge Documents
                    </h3>
                    <div className="space-y-2">
                      {dischargeSummary.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:border-teal-300 transition-colors">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 text-xl">
                              {getDocumentIcon(doc.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                              <p className="text-xs text-gray-500">{doc.size}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewDocument(doc)}
                            className="flex-shrink-0 ml-3 px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Discharged by:</span> {dischargeSummary.dischargedBy}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Document generated on {dischargeSummary.dischargeDate} at {dischargeSummary.dischargeTime}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 rounded-b-xl">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm font-medium text-gray-700">Transfer to:</span>
              <div className="flex gap-3">
                {(() => {
                  const carePathway = patient?.carePathway || patient?.care_pathway || patient?.pathway || '';
                  const patientCategory = patient?.category || '';

                  // Determine patient type - check in order of specificity (most specific first)
                  const isSurgeryPathway = carePathway === 'Surgery Pathway' || patientCategory === 'surgery-pathway';
                  const isPostOp = (carePathway === 'Post-op Transfer' || carePathway === 'Post-op Followup') ||
                    patientCategory === 'post-op-followup';
                  const isMedication = carePathway === 'Medication';
                  const isNewPatient = !carePathway || carePathway === '' || carePathway === 'OPD Queue' ||
                    patientCategory === 'new' || !patientCategory;

                  // For Surgery Pathway Patients: Active Surveillance, Medication, Radiotherapy, Post-op Followup, Discharge */}
                  if (isSurgeryPathway) {
                    return (
                      <>
                        <button onClick={() => handleTransfer('Active Surveillance')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoHeart className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Active Surveillance</span>
                        </button>
                        <button onClick={() => handleTransfer('Medication')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <FaPills className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Medication</span>
                        </button>
                        <button onClick={() => handleTransfer('Radiotherapy')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoMedical className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Radiotherapy</span>
                        </button>
                        <button onClick={() => handleTransfer('Post-op Followup')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <FaStethoscope className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Post-op Followup</span>
                        </button>
                        <button onClick={() => handleTransfer('Discharge')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoCheckmark className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                        </button>
                      </>
                    );
                  }

                  // For Post-op Followup Patients: Medication, Discharge only
                  if (isPostOp) {
                    return (
                      <>
                        <button onClick={() => handleTransfer('Medication')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <FaPills className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Medication</span>
                        </button>
                        <button onClick={() => handleTransfer('Discharge')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoCheckmark className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                        </button>
                      </>
                    );
                  }

                  // For Medication Pathway Patients: Active Surveillance, Discharge only
                  if (isMedication) {
                    return (
                      <>
                        <button onClick={() => handleTransfer('Active Surveillance')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoHeart className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Active Surveillance</span>
                        </button>
                        <button onClick={() => handleTransfer('Discharge')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoCheckmark className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                        </button>
                      </>
                    );
                  }

                  // For New Patients: Active Monitoring, Surgery Pathway, Medication, Radiotherapy, Discharge
                  if (isNewPatient) {
                    return (
                      <>
                        <button onClick={() => handleTransfer('Active Monitoring')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoHeart className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Active Monitoring</span>
                        </button>
                        <button onClick={() => handleTransfer('Surgery Pathway')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <FaStethoscope className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Surgery Pathway</span>
                        </button>
                        <button onClick={() => handleTransfer('Medication')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <FaPills className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Medication</span>
                        </button>
                        <button onClick={() => handleTransfer('Radiotherapy')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoMedical className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Radiotherapy</span>
                        </button>
                        <button onClick={() => handleTransfer('Discharge')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoCheckmark className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                        </button>
                      </>
                    );
                  }

                  // Fallback: For patients on other pathways (Active Monitoring, Active Surveillance, Radiotherapy, etc.)
                  if (patient && carePathway) {
                    return (
                      <>
                        <button onClick={() => handleTransfer('Surgery Pathway')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <FaStethoscope className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Surgery Pathway</span>
                        </button>
                        <button onClick={() => handleTransfer('Medication')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <FaPills className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Medication</span>
                        </button>
                        <button onClick={() => handleTransfer('Radiotherapy')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoMedical className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Radiotherapy</span>
                        </button>
                        <button onClick={() => handleTransfer('Discharge')} className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200">
                          <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                            <IoCheckmark className="text-teal-600 text-sm" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                        </button>
                      </>
                    );
                  }

                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>


        {/* Success Modal */}
        <SuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          title={successModalTitle}
          message={successModalMessage}
        />

        {/* Error Modal */}
        <ErrorModal
          isOpen={isErrorModalOpen}
          onClose={() => setIsErrorModalOpen(false)}
          title={errorModalTitle}
          message={errorModalMessage}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteConfirmOpen}
          onClose={cancelDelete}
          onConfirm={confirmDeleteNote}
          title="Delete Clinical Note"
          message="Are you sure you want to delete this clinical note? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        />

        {/* PSA Plot Modal */}
        {isPSAPlotModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200">
              {/* Modal Header */}
              <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between border-b border-teal-700">
                <div>
                  <h2 className="text-lg font-semibold">PSA Trend Plot</h2>
                  <p className="text-teal-100 text-sm mt-0.5">PSA monitoring trend for {patient?.name || 'Patient'}</p>
                </div>
                <button
                  onClick={() => setIsPSAPlotModalOpen(false)}
                  className="text-white/90 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded"
                >
                  <IoClose className="text-xl" />
                </button>
              </div>

              {/* Modal Content - Graph Only */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  {/* PSA Velocity Display in Plot Modal */}
                  {psaHistory.length >= 2 && (() => {
                    const velocityData = calculatePSAVelocity(psaHistory);
                    return (
                      <div className={`mb-4 p-4 rounded-lg border-2 ${velocityData.isHighRisk ? 'bg-red-50 border-red-300' : 'bg-teal-50 border-teal-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-1">PSA Velocity</h4>
                            <p className={`text-lg font-bold ${velocityData.isHighRisk ? 'text-red-700' : 'text-teal-700'}`}>
                              {velocityData.velocityText}
                            </p>
                          </div>
                          {velocityData.isHighRisk && (
                            <div className="flex items-center gap-2">
                              <IoAlertCircle className="text-red-600 text-xl" />
                              <span className="text-sm font-semibold text-red-700">High Risk</span>
                            </div>
                          )}
                        </div>
                        {velocityData.isHighRisk && (
                          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                            ⚠️ PSA velocity exceeds 0.75 ng/mL/year threshold. Consider MDT referral.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <h3 className="text-base font-semibold text-gray-900 mb-4">PSA Trend</h3>
                  <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 p-4">
                    {psaHistory.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <IoDocument className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">No data available for chart</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          const chartData = psaHistory.slice(0, 5).reverse();
                          const rechartsData = chartData.map((psaItem) => {
                            const psaValue = parseFloat(psaItem.result) || 0;

                            // Use the dateObj if available, otherwise use the formatted date string
                            const dateStr = psaItem.dateObj && !isNaN(psaItem.dateObj.getTime())
                              ? psaItem.dateObj.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                              : (psaItem.date || 'N/A');

                            return {
                              id: psaItem.id,
                              date: dateStr,
                              dateObj: psaItem.dateObj || new Date(),
                              psa: psaValue,
                              originalResult: psaItem.result,
                              numericValue: psaValue
                            };
                          });

                          const psaValues = rechartsData.map(d => d.psa).filter(v => v > 0);
                          if (psaValues.length === 0) {
                            return <div className="text-center text-gray-500">No PSA data available</div>;
                          }

                          const maxValue = Math.max(...psaValues);
                          const minValue = Math.min(...psaValues);
                          const valueRange = maxValue - minValue;
                          const padding = valueRange > 0 ? Math.max(valueRange * 0.1, 0.5) : 1;
                          const yDomain = [Math.max(0, minValue - padding), maxValue + padding];

                          return (
                            <LineChart
                              data={rechartsData}
                              margin={{ top: 35, right: 20, left: 50, bottom: 30 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="date"
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                                tick={{ fill: '#6b7280' }}
                                padding={{ left: 20, right: 20 }}
                              />
                              <YAxis
                                domain={yDomain}
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                                tick={{ fill: '#6b7280' }}
                                width={45}
                                label={{
                                  value: 'PSA Value (ng/mL)',
                                  angle: -90,
                                  position: 'insideLeft',
                                  style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="psa"
                                stroke="#0d9488"
                                strokeWidth={2}
                                dot={{ fill: '#0d9488', r: 5, strokeWidth: 2, stroke: 'white' }}
                                activeDot={{ r: 7, fill: '#0d9488', stroke: '#0d9488', strokeWidth: 2 }}
                                isAnimationActive={false}
                              >
                                <LabelList
                                  dataKey="psa"
                                  content={({ x, y, value, index, payload }) => {
                                    const isFirstPoint = index === 0;
                                    // Add significant offset for first point to avoid Y-axis overlap
                                    const extraOffset = isFirstPoint ? 30 : 0;
                                    // Increase vertical offset to avoid overlap with the line
                                    const verticalOffset = -15;
                                    return (
                                      <text
                                        x={x + extraOffset}
                                        y={y + verticalOffset}
                                        fill="#0d9488"
                                        fontSize="11px"
                                        fontWeight="600"
                                        textAnchor={isFirstPoint ? "start" : "middle"}
                                      >
                                        {`${parseFloat(value).toFixed(1)} ng/mL`}
                                      </text>
                                    );
                                  }}
                                />
                              </Line>
                            </LineChart>
                          );
                        })()}
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsPSAPlotModalOpen(false)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PSA History Modal */}
        {isPSAHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-teal-700 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">PSA History</h2>
                    <p className="text-teal-100 mt-1">PSA monitoring history for {patient.name}</p>
                  </div>
                  <button
                    onClick={() => setIsPSAHistoryModalOpen(false)}
                    className="bg-teal-600 hover:bg-teal-500 rounded-full p-2 transition-colors"
                  >
                    <IoClose className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* PSA Trend Graph */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">PSA Trend</h3>
                    <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      {/* Simple line chart representation */}
                      <div className="relative h-full">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                          <span>10</span>
                          <span>8</span>
                          <span>6</span>
                          <span>4</span>
                          <span>2</span>
                          <span>0</span>
                        </div>

                        {/* Chart area */}
                        <div className="ml-8 h-full relative">
                          {/* Grid lines */}
                          <div className="absolute inset-0">
                            {[0, 1, 2, 3, 4].map(i => (
                              <div key={i} className="absolute w-full border-t border-gray-200" style={{ top: `${i * 20}%` }}></div>
                            ))}
                          </div>

                          {/* Data points and line */}
                          <div className="absolute inset-0">
                            {/* Line connecting points */}
                            <svg className="w-full h-full">
                              <polyline
                                fill="none"
                                stroke="#0d9488"
                                strokeWidth="2"
                                points="20,80 120,60 220,40"
                              />
                              {/* Data points */}
                              <circle cx="20" cy="80" r="4" fill="#0d9488" />
                              <circle cx="120" cy="60" r="4" fill="#0d9488" />
                              <circle cx="220" cy="40" r="4" fill="#0d9488" />
                            </svg>
                          </div>

                          {/* X-axis labels */}
                          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                            <span>Apr 2024</span>
                            <span>Jul 2024</span>
                            <span>Sep 2024</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PSA Test History Table */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">PSA Test History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">DATE</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">PSA VALUE (NG/ML)</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">STATUS</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">NOTES</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {psaHistory.map((psa) => (
                            <tr key={psa.id} className="border-b border-gray-100">
                              <td className="py-3 px-4 text-sm text-gray-900">{psa.date}</td>
                              <td className="py-3 px-4 text-sm text-gray-900 font-medium">{psa.result}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(psa.status)}`}>
                                  {psa.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{psa.notes || 'No notes'}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleViewReport(psa)}
                                  className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl">
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsPSAHistoryModalOpen(false)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Tests History Modal */}
        {isOtherTestsHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="bg-teal-700 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Test Results History</h2>
                  <button
                    onClick={() => setIsOtherTestsHistoryModalOpen(false)}
                    className="bg-teal-600 hover:bg-teal-500 rounded-full p-2 transition-colors"
                  >
                    <IoClose className="text-xl" />
                  </button>
                </div>
                <p className="text-teal-100 mt-1">for {patient.name}</p>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Group tests by date */}
                  {(() => {
                    // Group tests by date
                    const groupedTests = otherTestsHistory.reduce((groups, test) => {
                      const date = test.date;
                      if (!groups[date]) {
                        groups[date] = [];
                      }
                      groups[date].push(test);
                      return groups;
                    }, {});

                    // Sort dates in descending order (most recent first)
                    const sortedDates = Object.keys(groupedTests).sort((a, b) => new Date(b) - new Date(a));

                    return sortedDates.map((date) => (
                      <div key={date} className="space-y-4">
                        {/* Date Title */}
                        <div className="flex items-center">
                          <div className="flex-1 border-t border-gray-300"></div>
                          <div className="px-4">
                            <h3 className="text-lg font-semibold text-gray-800 bg-white px-3 py-1 rounded-lg border border-gray-200">
                              {new Date(date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </h3>
                          </div>
                          <div className="flex-1 border-t border-gray-300"></div>
                        </div>

                        {/* Tests for this date */}
                        <div className="space-y-3">
                          {groupedTests[date].map((test) => (
                            <div key={test.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-gray-900">{test.testName}</h4>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>
                                      {test.status}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    Time: {test.date}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleViewReport(test)}
                                  className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                                >
                                  View
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Result:</span>
                                  <span className="ml-2 text-sm text-gray-900">{test.result}</span>
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Reference Range:</span>
                                  <span className="ml-2 text-sm text-gray-600">{test.referenceRange}</span>
                                </div>
                              </div>

                              {test.notes && (
                                <div className="pt-3 border-t border-gray-200">
                                  <span className="text-sm font-medium text-gray-700">Notes:</span>
                                  <p className="text-sm text-gray-600 mt-1">{test.notes}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MDT Scheduling Modal */}
        <MDTSchedulingModal
          isOpen={isMDTSchedulingModalOpen}
          onClose={() => setIsMDTSchedulingModalOpen(false)}
          onScheduled={handleMDTScheduled}
          patient={patient}
        />

        {/* Add Investigation Modal */}
        <AddClinicalInvestigationModal
          isOpen={isAddInvestigationModalOpen}
          onClose={() => setIsAddInvestigationModalOpen(false)}
          patient={patient}
          onSuccess={(message) => {
            setIsAddInvestigationModalOpen(false);
            // Refresh notes to show the new clinical investigation instantly
            fetchNotes();
            // Refresh investigation requests and results
            fetchInvestigationRequests();
            fetchInvestigations();
          }}
        />

        {/* Add PSA Result Modal */}
        <AddPSAResultModal
          isOpen={isAddPSAModalOpen}
          onClose={() => setIsAddPSAModalOpen(false)}
          patient={patient}
          onSuccess={handleInvestigationSuccess}
        />


        {/* Add Investigation Result Modal */}
        <AddInvestigationResultModal
          isOpen={isAddResultModalOpen}
          onClose={() => {
            setIsAddResultModalOpen(false);
            setSelectedInvestigationRequest(null);
          }}
          investigationRequest={selectedInvestigationRequest}
          patient={patient}
          isPSATest={selectedInvestigationRequest ? (selectedInvestigationRequest.investigationName || selectedInvestigationRequest.investigation_name || '').toUpperCase().includes('PSA') : false}
          onSuccess={(message, requestId) => {
            setIsAddResultModalOpen(false);
            setSelectedInvestigationRequest(null);
            // Refresh both investigation results and requests
            fetchInvestigations();
            fetchInvestigationRequests();

            // Dispatch event to refresh investigation management table
            window.dispatchEvent(new CustomEvent('testResultAdded', {
              detail: {
                patientId: patient?.id,
                requestId: requestId,
                testName: selectedInvestigationRequest?.investigationName || selectedInvestigationRequest?.investigation_name
              }
            }));
          }}
        />

        {/* View Test Results Modal */}
        {isViewResultsModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Test Results: {selectedTestName}</h2>
                    {patient && (
                      <p className="text-sm text-teal-100 mt-1">
                        Patient: <span className="font-medium">{patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsViewResultsModalOpen(false);
                      setSelectedTestResults([]);
                      setSelectedTestName('');
                    }}
                    className="text-white hover:text-gray-200 transition-colors p-1"
                  >
                    <IoClose className="text-2xl" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedTestResults.length === 0 ? (
                  <div className="text-center py-12">
                    <IoDocument className="text-4xl text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No results found for this test.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTestResults.map((result, index) => {
                      const resultDate = result.date ? new Date(result.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) : 'N/A';

                      return (
                        <div key={result.id || index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">Result #{selectedTestResults.length - index}</h3>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  {result.status || 'Completed'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Date: <span className="font-medium">{resultDate}</span>
                              </p>
                              {result.authorName && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Added by: {result.authorName} {result.authorRole ? `(${result.authorRole})` : ''}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="text-sm font-medium text-gray-600">Result Value:</span>
                                <p className="text-lg font-semibold text-gray-900 mt-0.5">{result.result || 'N/A'}</p>
                              </div>
                              {result.referenceRange && result.referenceRange !== 'N/A' && (
                                <div>
                                  <span className="text-sm font-medium text-gray-600">Reference Range:</span>
                                  <p className="text-sm text-gray-700 mt-0.5">{result.referenceRange}</p>
                                </div>
                              )}
                            </div>

                            {result.notes && (
                              <div className="pt-2 border-t border-gray-200">
                                <span className="text-sm font-medium text-gray-600">Notes:</span>
                                <p className="text-sm text-gray-700 mt-1">{result.notes}</p>
                              </div>
                            )}

                            {result.filePath && (
                              <div className="pt-2 border-t border-gray-200">
                                <button
                                  onClick={() => handleViewFile(result.filePath)}
                                  className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                                >
                                  <IoDocument className="w-4 h-4" />
                                  View Attached File
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
                <button
                  onClick={() => {
                    setIsViewResultsModalOpen(false);
                    setSelectedTestResults([]);
                    setSelectedTestName('');
                  }}
                  className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => {
            setIsSuccessModalOpen(false);
            setSuccessModalAppointmentDetails(null);
          }}
          title={successModalTitle}
          message={successModalMessage}
          appointmentDetails={successModalAppointmentDetails}
        />

        {/* Pathway Transfer Confirmation Modal */}
        {isPathwayModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-teal-600 to-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <IoAlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Confirm Pathway Transfer
                      </h3>
                      <p className="text-white/80 text-sm">
                        Transfer to {selectedPathway}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsPathwayModalOpen(false);
                      setSelectedPathway('');
                      setTransferDetails({
                        reason: '',
                        priority: 'normal',
                        clinicalRationale: '',
                        additionalNotes: '',
                        surgeryDate: '',
                        surgeryTime: '',
                        surgeryStartTime: '',
                        surgeryEndTime: ''
                      });
                      setSelectedStartSlot('');
                      setSelectedEndSlot('');
                      setAvailableSlots([]);
                      setAppointmentBooking({
                        appointmentDate: '',
                        appointmentTime: '',
                        notes: ''
                      });
                      setRecurringAppointments({ interval: '3' });
                      setMedicationDetails({
                        medications: [{
                          id: Date.now(),
                          name: '',
                          dosage: '',
                          frequency: '',
                          duration: '',
                          instructions: ''
                        }]
                      });
                    }}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <IoClose className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {/* Patient Info Card */}
                <div className="mb-4 p-4 bg-white border-l-4 border-teal-600 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1">Patient</p>
                      <p className="text-sm font-semibold text-gray-900">{patient.name}</p>
                      <p className="text-xs text-gray-600">UPI: {patient.upi || patient.patientId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-1 text-right">Transferring to</p>
                      <p className="text-sm font-semibold text-teal-600">{selectedPathway}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
                  <div className="flex items-start space-x-2">
                    <IoAlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-900">
                      <span className="font-semibold">Note:</span> This action will update the patient's care pathway and notify the care team.
                    </p>
                  </div>
                </div>

                {/* Pathway Validation & Compliance Check - Consolidated Display */}
                {patient?.id && selectedPathway && (
                  <div className="mb-4" key={`validation-${patient.id}-${selectedPathway}`}>
                    <PathwayValidator
                      patientId={patient.id}
                      fromPathway={patient.carePathway || patient.care_pathway || ''}
                      toPathway={selectedPathway}
                    />
                  </div>
                )}

                {/* Medication Pathway Content */}
                {selectedPathway === 'Medication' && (
                  <div className="mb-6">
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                            <FaPills className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-gray-900">Medication Details</h4>
                            <p className="text-sm text-gray-600">Prescribe medications for patient</p>
                          </div>
                        </div>
                        <button
                          onClick={addMedication}
                          className="flex items-center px-3 py-1.5 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-sm"
                        >
                          <span className="mr-1">+</span> Add
                        </button>
                      </div>

                      <div className="space-y-3">
                        {medicationDetails.medications.map((medication, index) => (
                          <div key={medication.id} className="bg-gray-50 border border-gray-200 rounded p-3">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900 text-sm">Medication {index + 1}</h5>
                              {medicationDetails.medications.length > 1 && (
                                <button
                                  onClick={() => removeMedication(medication.id)}
                                  className="text-red-600 hover:text-red-700 p-1"
                                >
                                  <IoClose className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Medication Name *
                                </label>
                                <input
                                  type="text"
                                  value={medication.name}
                                  onChange={(e) => updateMedication(medication.id, 'name', e.target.value)}
                                  placeholder="Enter medication name..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Dosage *
                                </label>
                                <input
                                  type="text"
                                  value={medication.dosage}
                                  onChange={(e) => updateMedication(medication.id, 'dosage', e.target.value)}
                                  placeholder="e.g., 5mg, 10ml"
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Frequency *
                                </label>
                                <input
                                  type="text"
                                  value={medication.frequency}
                                  onChange={(e) => updateMedication(medication.id, 'frequency', e.target.value)}
                                  placeholder="e.g., Once daily"
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Duration
                                </label>
                                <input
                                  type="text"
                                  value={medication.duration}
                                  onChange={(e) => updateMedication(medication.id, 'duration', e.target.value)}
                                  placeholder="e.g., 30 days, 2 weeks, As needed"
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Special Instructions
                              </label>
                              <textarea
                                value={medication.instructions}
                                onChange={(e) => updateMedication(medication.id, 'instructions', e.target.value)}
                                placeholder="Any special instructions..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Discharge Pathway Content */}
                {selectedPathway === 'Discharge' && (
                  <div className="mb-6">
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                          <IoDocumentText className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">Discharge Details</h4>
                          <p className="text-sm text-gray-600">Final discharge information</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discharge Reason *
                        </label>
                        <input
                          type="text"
                          value={transferDetails.reason}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Enter reason for discharge..."
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Clinical Summary *
                        </label>
                        <textarea
                          value={transferDetails.clinicalRationale}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, clinicalRationale: e.target.value }))}
                          placeholder="Provide detailed clinical summary..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Notes
                        </label>
                        <textarea
                          value={transferDetails.additionalNotes}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                          placeholder="Any additional notes..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Surgery Pathway Content */}
                {selectedPathway === 'Surgery Pathway' && (
                  <div className="mb-6">
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                          <FaStethoscope className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">Surgery Pathway Details</h4>
                          <p className="text-sm text-gray-600">Configure surgical pathway transfer</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Surgery *
                          </label>
                          <input
                            type="text"
                            value={transferDetails.reason}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Enter reason..."
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority *
                          </label>
                          <select
                            value={transferDetails.priority}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Clinical Rationale *
                        </label>
                        <textarea
                          value={transferDetails.clinicalRationale}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, clinicalRationale: e.target.value }))}
                          placeholder="Provide detailed clinical justification for surgical pathway..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Notes
                        </label>
                        <textarea
                          value={transferDetails.additionalNotes}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                          placeholder="Any additional information or special considerations..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                        />
                      </div>
                    </div>

                    {/* Surgery Scheduling Section */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center mr-3">
                          <IoCalendar className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">Surgery Scheduling</h4>
                          <p className="text-sm text-gray-600">Schedule the surgical procedure</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Surgery Date *
                        </label>
                        <input
                          type="date"
                          value={transferDetails.surgeryDate}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, surgeryDate: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          required
                        />
                      </div>

                      {/* Surgery Time Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Surgery Time *
                        </label>
                        <input
                          type="time"
                          value={transferDetails.surgeryTime}
                          onChange={(e) => setTransferDetails(prev => ({
                            ...prev,
                            surgeryTime: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Radiotherapy Pathway Content */}
                {selectedPathway === 'Radiotherapy' && (
                  <div className="mb-6">
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                          <IoMedical className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">Radiotherapy Details</h4>
                          <p className="text-sm text-gray-600">Configure radiotherapy treatment pathway</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Radiotherapy *
                          </label>
                          <input
                            type="text"
                            value={transferDetails.reason}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Enter reason..."
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority *
                          </label>
                          <select
                            value={transferDetails.priority}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Clinical Rationale *
                        </label>
                        <textarea
                          value={transferDetails.clinicalRationale}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, clinicalRationale: e.target.value }))}
                          placeholder="Provide detailed clinical justification for radiotherapy treatment..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Notes
                        </label>
                        <textarea
                          value={transferDetails.additionalNotes}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                          placeholder="Treatment plan, dosage requirements, or other considerations..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Post-op Transfer Content */}
                {selectedPathway === 'Post-op Transfer' && (
                  <div className="mb-6">
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                          <FaStethoscope className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">Post-op Transfer Details</h4>
                          <p className="text-sm text-gray-600">Transfer patient to post-operative care</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transfer Reason *
                        </label>
                        <input
                          type="text"
                          value={transferDetails.reason}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Enter reason for post-op transfer..."
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Post-operative Notes *
                        </label>
                        <textarea
                          value={transferDetails.clinicalRationale}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, clinicalRationale: e.target.value }))}
                          placeholder="Post-operative care requirements and follow-up instructions..."
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Notes
                        </label>
                        <textarea
                          value={transferDetails.additionalNotes}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                          placeholder="Any additional post-operative instructions..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Post-op Followup Content */}
                {selectedPathway === 'Post-op Followup' && (
                  <div className="mb-6">
                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                          <FaStethoscope className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">Post-operative Follow-up</h4>
                          <p className="text-sm text-gray-600">Transfer patient to post-operative follow-up care</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Post-op Followup *
                          </label>
                          <input
                            type="text"
                            value={transferDetails.reason}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Enter reason for post-operative follow-up..."
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Clinical Rationale *
                          </label>
                          <textarea
                            value={transferDetails.clinicalRationale}
                            onChange={(e) => setTransferDetails(prev => ({ ...prev, clinicalRationale: e.target.value }))}
                            placeholder="Provide detailed clinical summary for post-operative follow-up..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Default content for other pathways */}
                {selectedPathway !== 'Medication' &&
                  selectedPathway !== 'Discharge' &&
                  selectedPathway !== 'Surgery Pathway' &&
                  selectedPathway !== 'Radiotherapy' &&
                  selectedPathway !== 'Post-op Transfer' &&
                  selectedPathway !== 'Post-op Followup' && (
                    <>
                      <div className="mb-6">
                        <div className="bg-white border border-gray-200 rounded p-4">
                          <div className="flex items-center mb-4">
                            <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                              <IoDocumentText className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">Transfer Details</h4>
                              <p className="text-sm text-gray-600">Required information for pathway transfer</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Transfer *
                              </label>
                              <input
                                type="text"
                                value={transferDetails.reason}
                                onChange={(e) => setTransferDetails(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Enter reason..."
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Priority *
                              </label>
                              <select
                                value={transferDetails.priority}
                                onChange={(e) => setTransferDetails(prev => ({ ...prev, priority: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                              >
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Clinical Rationale *
                            </label>
                            <textarea
                              value={transferDetails.clinicalRationale}
                              onChange={(e) => setTransferDetails(prev => ({ ...prev, clinicalRationale: e.target.value }))}
                              placeholder="Provide clinical justification..."
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Additional Notes
                            </label>
                            <textarea
                              value={transferDetails.additionalNotes}
                              onChange={(e) => setTransferDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                              placeholder="Any additional information..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Appointment Booking Section */}
                      {(selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance') && (
                        <div className="mb-6">
                          <div className="bg-white border border-gray-200 rounded p-4">
                            <div className="flex items-center mb-4">
                              <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                                <IoCalendar className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h4 className="text-base font-semibold text-gray-900">Schedule Follow-up</h4>
                                <p className="text-sm text-gray-600">Optional for {selectedPathway}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Date
                                </label>
                                <input
                                  type="date"
                                  value={appointmentBooking.appointmentDate}
                                  onChange={(e) => setAppointmentBooking(prev => ({ ...prev, appointmentDate: e.target.value }))}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Time
                                </label>
                                <input
                                  type="time"
                                  value={appointmentBooking.appointmentTime}
                                  onChange={(e) => setAppointmentBooking(prev => ({ ...prev, appointmentTime: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                                />
                              </div>
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Check-up Frequency
                              </label>
                              <select
                                value={recurringAppointments.interval}
                                onChange={(e) => setRecurringAppointments(prev => ({ ...prev, interval: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                              >
                                <option value="1">Monthly</option>
                                <option value="3">Every 3 months</option>
                                <option value="6">Every 6 months</option>
                                <option value="12">Annual</option>
                              </select>
                            </div>

                            <div className="mt-4 bg-teal-50 border border-teal-200 rounded p-3">
                              <div className="flex items-start space-x-3">
                                <IoCalendar className="h-4 w-4 text-teal-600 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900 mb-1">
                                    {recurringAppointments.interval === '1' && 'Monthly Check-ups'}
                                    {recurringAppointments.interval === '3' && 'Quarterly Check-ups'}
                                    {recurringAppointments.interval === '6' && 'Bi-annual Check-ups'}
                                    {recurringAppointments.interval === '12' && 'Annual Check-ups'}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Follow-up appointments will be automatically scheduled
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
              </div>

              {/* Fixed Footer */}
              <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setIsPathwayModalOpen(false);
                      setSelectedPathway('');
                      setTransferDetails({
                        reason: '',
                        priority: 'normal',
                        clinicalRationale: '',
                        additionalNotes: '',
                        surgeryDate: '',
                        surgeryTime: '',
                        surgeryStartTime: '',
                        surgeryEndTime: ''
                      });
                      setSelectedStartSlot('');
                      setSelectedEndSlot('');
                      setAvailableSlots([]);
                      setAppointmentBooking({
                        appointmentDate: '',
                        appointmentTime: '',
                        notes: ''
                      });
                      setRecurringAppointments({ interval: '3' });
                      setMedicationDetails({
                        medications: [{
                          id: Date.now(),
                          name: '',
                          dosage: '',
                          frequency: '',
                          duration: '',
                          instructions: ''
                        }]
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Basic validation based on pathway type
                      if (selectedPathway === 'Medication') {
                        const hasValidMedications = medicationDetails.medications.every(med =>
                          med.name.trim() && med.dosage.trim() && med.frequency.trim()
                        );
                        if (!hasValidMedications) {
                          showErrorModal('Validation Error', 'Please fill in all required medication fields');
                          return;
                        }
                      } else if (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance') {
                        if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                          showErrorModal('Validation Error', 'Please fill in all required fields');
                          return;
                        }
                      } else if (selectedPathway === 'Surgery Pathway') {
                        // Validate surgery pathway fields including scheduling
                        if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                          showErrorModal('Validation Error', 'Please provide reason and clinical rationale');
                          return;
                        }
                        // Validate surgery scheduling fields
                        if (!transferDetails.surgeryDate || !transferDetails.surgeryTime) {
                          showErrorModal('Validation Error', 'Please select surgery date and time');
                          return;
                        }
                        // Validate surgery date is not in the past
                        const surgeryDate = new Date(transferDetails.surgeryDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        surgeryDate.setHours(0, 0, 0, 0);
                        if (surgeryDate < today) {
                          showErrorModal('Validation Error', 'Surgery date cannot be in the past');
                          return;
                        }
                      } else if (selectedPathway === 'Post-op Transfer') {
                        // Validate Post-op Transfer fields before opening discharge summary modal
                        if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                          showErrorModal('Validation Error', 'Please provide reason and clinical rationale for post-op transfer');
                          return;
                        }
                        // Close pathway modal and open discharge summary modal
                        setIsPathwayModalOpen(false);
                        setIsDischargeSummaryModalOpen(true);
                        return;
                      } else if (selectedPathway === 'Post-op Followup') {
                        // Validate Post-op Followup fields
                        if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                          showErrorModal('Validation Error', 'Please provide reason and clinical rationale for post-op followup');
                          return;
                        }
                      } else if (selectedPathway === 'Discharge') {
                        // Validate Discharge fields before opening discharge summary modal
                        if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                          showErrorModal('Validation Error', 'Please provide discharge reason and clinical summary');
                          return;
                        }
                        // Close pathway modal and open discharge summary modal
                        setIsPathwayModalOpen(false);
                        setIsDischargeSummaryModalOpen(true);
                        return;
                      } else {
                        // Default validation for other pathways
                        if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                          showErrorModal('Validation Error', 'Please provide reason and clinical rationale');
                          return;
                        }
                      }

                      // Check if a date is selected for automatic appointment booking
                      const hasSelectedDate = (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance') &&
                        appointmentBooking.appointmentDate;

                      // Validate date if provided
                      if (hasSelectedDate) {
                        const appointmentDate = new Date(appointmentBooking.appointmentDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        appointmentDate.setHours(0, 0, 0, 0);
                        if (appointmentDate < today) {
                          showErrorModal('Validation Error', 'Appointment date cannot be in the past.');
                          return;
                        }
                      }

                      // Handle surgery scheduling for Surgery Pathway (BEFORE pathway transfer)
                      let surgeryScheduled = false;
                      // Store surgery time for use in clinical note creation
                      let surgeryTime = '';

                      if (selectedPathway === 'Surgery Pathway') {
                        try {
                          console.log('🔍 Scheduling surgery BEFORE pathway transfer');
                          console.log('📋 Surgery details:', transferDetails);

                          // Capture surgery time for use in clinical note
                          surgeryTime = transferDetails.surgeryTime || '';

                          const currentUser = authService.getCurrentUser();
                          if (!currentUser || !currentUser.id) {
                            throw new Error('User data is incomplete. Please log in again.');
                          }

                          const urologistId = currentUser.id;

                          // Try multiple ways to get the urologist name
                          let urologistName = '';
                          if (currentUser.firstName && currentUser.lastName) {
                            urologistName = `${currentUser.firstName} ${currentUser.lastName}`;
                          } else if (currentUser.first_name && currentUser.last_name) {
                            urologistName = `${currentUser.first_name} ${currentUser.last_name}`;
                          } else if (currentUser.name) {
                            urologistName = currentUser.name;
                          } else if (currentUser.username) {
                            urologistName = currentUser.username;
                          }

                          if (!urologistName || urologistName.trim() === '') {
                            throw new Error('Urologist name could not be determined. Please update your profile.');
                          }

                          const surgeryData = {
                            appointmentDate: transferDetails.surgeryDate,
                            appointmentTime: surgeryTime, // Use surgery time
                            urologistId: urologistId,
                            urologistName: urologistName.trim(),
                            appointmentType: 'surgery',
                            surgeryType: transferDetails.reason,
                            notes: `Surgery scheduled: ${transferDetails.reason}\nPriority: ${transferDetails.priority}\nSurgery Time: ${surgeryTime}\nClinical Rationale: ${transferDetails.clinicalRationale}${transferDetails.additionalNotes ? `\n\nAdditional Notes: ${transferDetails.additionalNotes}` : ''}`,
                            priority: transferDetails.priority,
                            surgeryStartTime: surgeryTime,
                            surgeryEndTime: '' // No end time needed
                          };

                          console.log('📤 Surgery data being sent:', JSON.stringify(surgeryData, null, 2));

                          const surgeryResult = await bookingService.bookUrologistAppointment(patient.id, surgeryData);

                          if (surgeryResult.success) {
                            console.log('✅ Surgery scheduled successfully');
                            surgeryScheduled = true;
                          } else {
                            console.error('❌ Failed to schedule surgery:', surgeryResult.error);
                            showErrorModal('Surgery Scheduling Failed', `Failed to schedule surgery: ${surgeryResult.error}\n\nPathway transfer has been cancelled. Please try again.`);
                            return; // Exit early - don't proceed with pathway transfer
                          }
                        } catch (surgeryError) {
                          console.error('❌ Error scheduling surgery:', surgeryError);
                          showErrorModal('Surgery Scheduling Error', `An error occurred while scheduling surgery: ${surgeryError.message}\n\nPathway transfer has been cancelled. Please try again.`);
                          return; // Exit early - don't proceed with pathway transfer
                        }
                      }

                      // Persist pathway (only if appointment booking succeeded or wasn't needed)
                      let transferSucceeded = false;
                      try {
                        const payload = {
                          pathway: selectedPathway,
                          reason: transferDetails.reason,
                          notes: transferDetails.clinicalRationale || transferDetails.additionalNotes || '',
                          skipAutoBooking: surgeryScheduled, // Only skip if surgery is scheduled
                          // Pass the selected date and frequency to backend for automatic appointment booking
                          appointmentStartDate: hasSelectedDate ? appointmentBooking.appointmentDate : null,
                          appointmentInterval: hasSelectedDate ? parseInt(recurringAppointments.interval) || 3 : null
                        };
                        const res = await patientService.updatePatientPathway(patient.id, payload);
                        if (res.success) {
                          transferSucceeded = true;
                          // If backend auto-booked an appointment and we didn't manually book, create recurring appointments
                          // hasSelectedDate means we manually booked an appointment, so we don't need to create recurring ones
                          if (!hasSelectedDate && res.data?.autoBookedAppointment &&
                            (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance')) {
                            console.log('🔍 Backend auto-booked appointment detected, creating recurring appointments');
                            console.log('📋 Auto-booked appointment:', res.data.autoBookedAppointment);

                            try {
                              const autoApt = res.data.autoBookedAppointment;
                              const currentUser = authService.getCurrentUser();
                              const urologistId = currentUser?.id;

                              // Try multiple ways to get the urologist name
                              let urologistName = autoApt.urologistName || '';
                              if (!urologistName) {
                                if (currentUser?.firstName && currentUser?.lastName) {
                                  urologistName = `${currentUser.firstName} ${currentUser.lastName}`;
                                } else if (currentUser?.first_name && currentUser?.last_name) {
                                  urologistName = `${currentUser.first_name} ${currentUser.last_name}`;
                                } else if (currentUser?.name) {
                                  urologistName = currentUser.name;
                                }
                              }

                              const intervalMonths = parseInt(recurringAppointments.interval) || 3;
                              const numberOfRecurringAppointments = 12 / intervalMonths;

                              console.log(`🔄 Creating ${numberOfRecurringAppointments - 1} recurring appointments from auto-booked appointment`);
                              console.log(`📅 Base date: ${autoApt.date}, Time: ${autoApt.time}, Interval: ${intervalMonths} months`);

                              // Create recurring appointments (starting from the second one)
                              for (let i = 1; i < numberOfRecurringAppointments; i++) {
                                try {
                                  // Calculate next appointment date
                                  const baseDate = new Date(autoApt.date);
                                  baseDate.setMonth(baseDate.getMonth() + (intervalMonths * i));

                                  const nextDateStr = baseDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

                                  const recurringAppointmentData = {
                                    appointmentDate: nextDateStr,
                                    appointmentTime: autoApt.time,
                                    urologistId: urologistId,
                                    urologistName: urologistName.trim(),
                                    appointmentType: 'urologist',
                                    notes: `Recurring follow-up for ${selectedPathway} - Appointment ${i + 1}/${numberOfRecurringAppointments} (Every ${intervalMonths} month(s))`,
                                    patientName: patient.name || 'Unknown Patient',
                                    upi: patient.upi || patient.patientId || 'N/A'
                                  };

                                  console.log(`🔄 Creating recurring appointment ${i + 1}/${numberOfRecurringAppointments - 1} for ${nextDateStr}`);

                                  const recurringResult = await bookingService.bookUrologistAppointment(patient.id, recurringAppointmentData);

                                  if (recurringResult.success) {
                                    console.log(`✅ Recurring appointment ${i + 1} created successfully for ${nextDateStr}`);
                                  } else {
                                    console.error(`⚠️ Failed to create recurring appointment ${i + 1}:`, recurringResult.error);
                                  }
                                } catch (recurringError) {
                                  console.error(`⚠️ Error creating recurring appointment ${i + 1}:`, recurringError);
                                }
                              }

                              console.log('✅ All recurring appointments from auto-booking processed');
                            } catch (recurringError) {
                              console.error('❌ Error creating recurring appointments from auto-booking:', recurringError);
                              // Don't fail the transfer if recurring appointments fail
                            }
                          }

                          // Create a clinical note with the pathway transfer details
                          let noteCreated = false;
                          let createdNoteData = null; // Store the created note data
                          try {
                            let transferNoteContent = '';

                            // Handle Medication pathway separately
                            if (selectedPathway === 'Medication') {
                              const medicationsText = medicationDetails.medications.map((med, index) =>
                                `${index + 1}. ${med.name}
   - Dosage: ${med.dosage}
   - Frequency: ${med.frequency}
   ${med.duration ? `- Duration: ${med.duration}` : ''}
   ${med.instructions ? `- Instructions: ${med.instructions}` : ''}`
                              ).join('\n\n');

                              transferNoteContent = `
PATHWAY TRANSFER - MEDICATION PRESCRIBED

Transfer To: ${selectedPathway}

Prescribed Medications:
${medicationsText}
${transferDetails.additionalNotes ? `

Additional Notes:
${transferDetails.additionalNotes}` : ''}
                            `.trim();
                            } else {
                              // Handle all other pathways
                              let appointmentSection = '';
                              if (hasSelectedDate && (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance')) {
                                const frequencyText = recurringAppointments.interval === '1' ? 'Monthly' :
                                  recurringAppointments.interval === '3' ? 'Every 3 months' :
                                    recurringAppointments.interval === '6' ? 'Every 6 months' : 'Annual';
                                const dateDisplay = new Date(appointmentBooking.appointmentDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                                appointmentSection = `
                              
Follow-up Appointments Scheduled:
- Start Date: ${dateDisplay}
- Frequency: ${frequencyText}
- Appointments will be automatically scheduled starting from the selected date`;
                              }

                              // Add surgery appointment section if surgery was scheduled
                              let surgeryAppointmentSection = '';
                              if (surgeryScheduled && selectedPathway === 'Surgery Pathway') {
                                // Use captured surgery time
                                const timeDisplay = surgeryTime || transferDetails.surgeryTime || 'Not specified';

                                surgeryAppointmentSection = `

Surgery Appointment Scheduled:
- Date: ${transferDetails.surgeryDate}
- Time: ${timeDisplay}`;
                              }

                              transferNoteContent = `
PATHWAY TRANSFER

Transfer To: ${selectedPathway}
Priority: ${transferDetails.priority ? transferDetails.priority.charAt(0).toUpperCase() + transferDetails.priority.slice(1) : 'Normal'}

Reason for Transfer:
${transferDetails.reason || 'Not specified'}

Clinical Rationale:
${transferDetails.clinicalRationale || 'Not specified'}${appointmentSection}${surgeryAppointmentSection}
${transferDetails.additionalNotes ? `

Additional Notes:
${transferDetails.additionalNotes}` : ''}
                            `.trim();
                            }

                            const noteData = {
                              noteContent: transferNoteContent,
                              noteType: 'clinical'
                            };

                            console.log('🔍 Creating clinical note for pathway transfer:', noteData);
                            console.log('🔍 Medication details:', medicationDetails);
                            console.log('🔍 Selected pathway:', selectedPathway);

                            const noteResult = await notesService.addNote(patient.id, noteData);

                            if (noteResult.success) {
                              console.log('✅ Clinical note created successfully for pathway transfer');
                              console.log('✅ Created note data:', noteResult.data);
                              noteCreated = true;
                              createdNoteData = noteResult.data; // Store the note data
                              // Update the clinical notes list in the UI immediately
                              setClinicalNotes(prev => {
                                const newNotes = [noteResult.data, ...prev];
                                console.log('✅ Updated clinical notes state, total notes:', newNotes.length);
                                return newNotes;
                              });
                            } else {
                              console.error('❌ Failed to create clinical note for pathway transfer:', noteResult.error);
                              console.error('❌ Note result:', noteResult);
                            }
                          } catch (noteError) {
                            console.error('❌ Error creating clinical note for pathway transfer:', noteError);
                            console.error('❌ Error details:', {
                              message: noteError.message,
                              stack: noteError.stack,
                              medicationDetails: medicationDetails,
                              selectedPathway: selectedPathway
                            });
                            // Don't fail the transfer if note creation fails
                          }

                          // Small delay to ensure note is committed to database before fetching
                          if (noteCreated) {
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay to 1 second
                          }

                          let message = `Patient successfully transferred to ${selectedPathway}`;
                          let appointmentDetails = null;

                          // Show appointment confirmation if appointments were scheduled
                          if (hasSelectedDate && (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance')) {
                            const aptDate = new Date(appointmentBooking.appointmentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });

                            const intervalMonths = parseInt(recurringAppointments.interval) || 3;
                            const numberOfAppointments = 12 / intervalMonths;

                            const frequencyText = recurringAppointments.interval === '1' ? 'Monthly' :
                              recurringAppointments.interval === '3' ? 'Every 3 months' :
                                recurringAppointments.interval === '6' ? 'Every 6 months' :
                                  recurringAppointments.interval === '12' ? 'Annual' : `Every ${intervalMonths} months`;

                            appointmentDetails = {
                              date: aptDate,
                              time: appointmentBooking.appointmentTime || 'Not specified',
                              frequency: frequencyText,
                              total: numberOfAppointments,
                              urologist: null
                            };
                          }
                          // Show auto-booking notification if NO date was selected and backend auto-booked
                          else if (!hasSelectedDate && (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance') && res.data?.autoBookedAppointment) {
                            const apt = res.data.autoBookedAppointment;
                            const aptDate = new Date(apt.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });

                            const intervalMonths = parseInt(recurringAppointments.interval) || 3;
                            const numberOfAppointments = 12 / intervalMonths;

                            const frequencyText = recurringAppointments.interval === '1' ? 'Monthly' :
                              recurringAppointments.interval === '3' ? 'Every 3 months' :
                                recurringAppointments.interval === '6' ? 'Every 6 months' :
                                  recurringAppointments.interval === '12' ? 'Annual' : `Every ${intervalMonths} months`;

                            appointmentDetails = {
                              date: aptDate,
                              time: apt.time,
                              frequency: frequencyText,
                              total: numberOfAppointments,
                              urologist: apt.urologistName
                            };
                          }

                          setSuccessModalTitle('Transfer Successful');
                          setSuccessModalMessage(message);
                          setSuccessModalAppointmentDetails(appointmentDetails);
                          setIsSuccessModalOpen(true);

                          // Refresh patient data to update pipeline with new care pathway
                          await fetchFullPatientData();

                          // Refresh appointment check, especially important for Surgery Pathway
                          checkSurgeryAppointment();

                          // Refresh appointments and MDT meetings for pipeline
                          await fetchAppointments();
                          await fetchMDTMeetings();

                          // Refresh clinical notes to show the new transfer note
                          // If note was created, add it to state first to ensure it's visible immediately
                          if (noteCreated && createdNoteData) {
                            console.log('✅ Adding created note to state before fetchNotes');
                            setClinicalNotes(prev => {
                              // Check if note already exists (shouldn't, but just in case)
                              const noteExists = prev.some(note => note.id === createdNoteData.id);
                              if (!noteExists) {
                                console.log('✅ Adding created note to beginning of list');
                                return [createdNoteData, ...prev];
                              }
                              return prev;
                            });
                          }

                          // Fetch notes from database (this will replace the state, but we'll add our note back if needed)
                          await fetchNotes();

                          // After fetchNotes, ensure our created note is still in the list
                          // If it was filtered out or not yet in database, add it back
                          if (noteCreated && createdNoteData) {
                            setClinicalNotes(prev => {
                              // Check if the created note is already in the fetched list
                              const noteExists = prev.some(note =>
                                note.id === createdNoteData.id ||
                                (note.content && note.content.includes('PATHWAY TRANSFER'))
                              );

                              if (!noteExists) {
                                console.log('⚠️ Created note not found after fetchNotes, adding it back to state');
                                console.log('⚠️ Created note data:', createdNoteData);
                                console.log('⚠️ Current notes count:', prev.length);
                                // Add the created note back to the beginning of the list
                                return [createdNoteData, ...prev];
                              } else {
                                console.log('✅ Created note found in fetched notes');
                              }
                              return prev;
                            });
                          }

                          console.log('✅ Note refresh completed, timeline should show the transfer note');

                          // Dispatch event if transferred to Surgery Pathway
                          if (selectedPathway === 'Surgery Pathway') {
                            window.dispatchEvent(new CustomEvent('surgery:updated'));
                            console.log('🔔 Dispatched surgery:updated event for pathway transfer to Surgery Pathway');
                          }

                          // Notify parent component about successful transfer
                          if (onTransferSuccess) {
                            onTransferSuccess(patient.id, selectedPathway);
                          }
                        } else {
                          // Transfer failed - show error
                          setSuccessModalTitle('Error');
                          setSuccessModalMessage(res.error || 'Failed to update pathway');
                          setIsSuccessModalOpen(true);
                        }
                      } catch (e) {
                        // Only show error if transfer didn't succeed
                        if (!transferSucceeded) {
                          console.error('❌ Pathway transfer error:', e);
                          setSuccessModalTitle('Error');
                          setSuccessModalMessage('Failed to update pathway: ' + (e.message || 'Unknown error'));
                          setIsSuccessModalOpen(true);
                        } else {
                          // Transfer succeeded but something else failed (like note creation)
                          // Don't show error modal, just log it
                          console.error('⚠️ Pathway transfer succeeded but post-processing failed:', e);
                        }
                      } finally {
                        setIsPathwayModalOpen(false);
                        // Reset states
                        setTransferDetails({
                          reason: '',
                          priority: 'normal',
                          clinicalRationale: '',
                          additionalNotes: ''
                        });
                        setAppointmentBooking({
                          appointmentDate: '',
                          appointmentTime: '',
                          notes: ''
                        });
                        setRecurringAppointments({ interval: '3' });
                        setMedicationDetails({
                          medications: [{
                            id: Date.now(),
                            name: '',
                            dosage: '',
                            frequency: '',
                            duration: '',
                            instructions: ''
                          }]
                        });
                      }
                    }}
                    disabled={
                      selectedPathway === 'Medication'
                        ? !medicationDetails.medications.every(med => med.name.trim() && med.dosage.trim() && med.frequency.trim())
                        : selectedPathway === 'Discharge'
                          ? !transferDetails.reason || !transferDetails.clinicalRationale.trim()
                          : selectedPathway === 'Surgery Pathway'
                            ? !transferDetails.reason || !transferDetails.clinicalRationale.trim()
                            : selectedPathway === 'Radiotherapy'
                              ? !transferDetails.reason || !transferDetails.clinicalRationale.trim()
                              : selectedPathway === 'Post-op Transfer'
                                ? !transferDetails.reason || !transferDetails.clinicalRationale.trim()
                                : selectedPathway === 'Post-op Followup'
                                  ? !transferDetails.reason || !transferDetails.clinicalRationale.trim()
                                  : (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance')
                                    ? !transferDetails.reason || !transferDetails.clinicalRationale.trim()
                                    : !transferDetails.reason || !transferDetails.clinicalRationale.trim()
                    }
                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Discharge Summary Modal */}
        {isDischargeSummaryModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-teal-600 to-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <IoCheckmarkCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Summary Generated
                      </h3>
                      <p className="text-white/80 text-sm">
                        Will be sent to GP
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsDischargeSummaryModalOpen(false)}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <IoClose className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-teal-50 border border-teal-200 rounded p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <IoCheckmarkCircle className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-teal-900 mb-1">Summary Created</h4>
                      <p className="text-sm text-teal-800">
                        Complete summary has been generated and will be sent to the GP.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded p-4">
                    <h5 className="font-semibold text-gray-900 mb-3 text-center">SUMMARY</h5>

                    {/* Patient Information */}
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h6 className="font-medium text-gray-900 mb-2">Patient Information</h6>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Name:</span> {patient.name}
                        </div>
                        <div>
                          <span className="font-medium">UPI:</span> {patient.upi || patient.patientId}
                        </div>
                      </div>
                    </div>

                    {/* Clinical Summary */}
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <h6 className="font-medium text-gray-900 mb-2">Clinical Summary</h6>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {transferDetails.clinicalRationale || 'No summary provided.'}
                      </p>
                    </div>

                    {/* Medications if applicable */}
                    {selectedPathway === 'Medication' && medicationDetails.medications.length > 0 && (
                      <div className="mb-4 pb-3 border-b border-gray-200">
                        <h6 className="font-medium text-gray-900 mb-2">Prescribed Medications</h6>
                        <div className="space-y-2">
                          {medicationDetails.medications.map((med, index) => (
                            <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                              <div className="font-medium">{med.name}</div>
                              <div>Dosage: {med.dosage} | Frequency: {med.frequency}</div>
                              {med.duration && <div>Duration: {med.duration}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsDischargeSummaryModalOpen(false);
                    setSuccessModalTitle('Transfer Successful');
                    setSuccessModalMessage(`Patient successfully transferred to ${selectedPathway}`);
                    setIsSuccessModalOpen(true);
                  }}
                  className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors font-medium text-sm"
                >
                  OK, Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discharge Summary Modal */}
      <DischargeSummaryModal
        isOpen={isDischargeSummaryModalOpen}
        onClose={() => {
          setIsDischargeSummaryModalOpen(false);
          setSelectedPathway('');
        }}
        onSubmit={handleDischargeSummarySubmit}
        patient={patient}
        pathway={selectedPathway}
      />

      {/* Edit Surgery Appointment Modal */}
      <EditSurgeryAppointmentModal
        isOpen={isEditSurgeryAppointmentModalOpen}
        onClose={() => {
          setIsEditSurgeryAppointmentModalOpen(false);
          setSelectedSurgeryAppointment(null);
        }}
        appointment={selectedSurgeryAppointment}
        patient={patient}
        onUpdate={async () => {
          // First refresh appointment check to ensure hasSurgeryAppointment is up to date
          await checkSurgeryAppointment();
          // Then refresh clinical notes after appointment check completes
          await fetchNotes();
          // Dispatch event to refresh other components
          window.dispatchEvent(new CustomEvent('surgery:updated'));
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={closeConfirmModal}
        onCancel={() => closeConfirmModal(false)}
        title="Unsaved Changes"
        message="You have unsaved changes. Do you want to save before closing?"
      />

      {/* Edit Patient Modal */}
      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        patient={fullPatientData || patient}
        onPatientUpdated={async (updatedPatient) => {
          // Immediately update the patient data in the modal for instant reflection
          if (updatedPatient) {
            setFullPatientData(updatedPatient);
          }
          // Then refresh from API to ensure we have the latest data
          await fetchFullPatientData();
          // Dispatch event to refresh patient list
          window.dispatchEvent(new CustomEvent('patient:updated', {
            detail: { patient: updatedPatient }
          }));
          setIsEditModalOpen(false);
        }}
        onError={(errorData) => {
          console.error('Error updating patient:', errorData);
          // You can show an error modal here if needed
        }}
      />
    </>
  );
};

export default UrologistPatientDetailsModal;