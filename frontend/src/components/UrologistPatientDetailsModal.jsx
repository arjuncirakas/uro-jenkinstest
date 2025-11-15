import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoTimeSharp, IoMedical, IoCheckmarkCircle, IoDocumentText, IoAnalytics, IoDocument, IoHeart, IoCheckmark, IoAlertCircle, IoCalendar } from 'react-icons/io5';
import { FaNotesMedical, FaUserMd, FaUserNurse, FaFileMedical, FaFlask, FaPills, FaStethoscope } from 'react-icons/fa';
import { BsClockHistory } from 'react-icons/bs';
import { Plus, Upload, Trash, Eye } from 'lucide-react';
import SuccessModal from './SuccessModal';
import ErrorModal from './modals/ErrorModal';
import MDTSchedulingModal from './MDTSchedulingModal';
import AddInvestigationModal from './AddInvestigationModal';
import AddPSAResultModal from './modals/AddPSAResultModal';
import AddTestResultModal from './modals/AddTestResultModal';
import AddInvestigationResultModal from './AddInvestigationResultModal';
import DischargeSummaryModal from './DischargeSummaryModal';
import EditSurgeryAppointmentModal from './EditSurgeryAppointmentModal';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { notesService } from '../services/notesService';
import { patientService } from '../services/patientService';
import { investigationService } from '../services/investigationService';
import { mdtService } from '../services/mdtService';
import { bookingService } from '../services/bookingService';
import authService from '../services/authService';

const UrologistPatientDetailsModal = ({ isOpen, onClose, patient, loading, error, onTransferSuccess }) => {
  const [activeTab, setActiveTab] = useState('clinicalNotes');
  const [noteContent, setNoteContent] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [isPSAHistoryModalOpen, setIsPSAHistoryModalOpen] = useState(false);
  const [isOtherTestsHistoryModalOpen, setIsOtherTestsHistoryModalOpen] = useState(false);
  const [isMDTSchedulingModalOpen, setIsMDTSchedulingModalOpen] = useState(false);
  const [isAddInvestigationModalOpen, setIsAddInvestigationModalOpen] = useState(false);
  const [isAddPSAModalOpen, setIsAddPSAModalOpen] = useState(false);
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);
  const [isAddResultModalOpen, setIsAddResultModalOpen] = useState(false);
  const [selectedInvestigationRequest, setSelectedInvestigationRequest] = useState(null);
  
  // Transfer modal states
  const [isPathwayModalOpen, setIsPathwayModalOpen] = useState(false);
  const [selectedPathway, setSelectedPathway] = useState('');
  const [isDischargeSummaryModalOpen, setIsDischargeSummaryModalOpen] = useState(false);
  const [isEditSurgeryAppointmentModalOpen, setIsEditSurgeryAppointmentModalOpen] = useState(false);
  const [selectedSurgeryAppointment, setSelectedSurgeryAppointment] = useState(null);
  const [hasSurgeryAppointment, setHasSurgeryAppointment] = useState(false);
  
  // Transfer form states
  const [transferDetails, setTransferDetails] = useState({
    reason: '',
    priority: 'normal',
    clinicalRationale: '',
    additionalNotes: '',
    // Surgery scheduling fields
    surgeryDate: '',
    surgeryTime: ''
  });
  
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


  // API state management
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
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
    if (!patient?.id) {
      setHasSurgeryAppointment(false);
      return;
    }
    
    try {
      const appointmentsResult = await bookingService.getPatientAppointments(patient.id);
      if (appointmentsResult.success) {
        const appointments = appointmentsResult.data?.appointments || appointmentsResult.data || [];
        const surgeryAppointment = appointments.find(apt => {
          const aptType = (apt.appointmentType || apt.type || '').toLowerCase();
          // Check for various surgery appointment type formats
          return aptType === 'surgery' || 
                 aptType === 'surgical' || 
                 aptType.includes('surgery') ||
                 aptType.includes('surgical');
        });
        const hasAppointment = !!surgeryAppointment;
        console.log('🔍 Surgery appointment check:', { hasAppointment, appointments, surgeryAppointment });
        setHasSurgeryAppointment(hasAppointment);
      } else {
        console.log('⚠️ Failed to fetch appointments:', appointmentsResult.error);
        setHasSurgeryAppointment(false);
      }
    } catch (error) {
      console.error('Error checking surgery appointment:', error);
      setHasSurgeryAppointment(false);
    }
  }, [patient]);

  // Load patient data when modal opens
  useEffect(() => {
    console.log('🔍 UrologistPatientDetailsModal: useEffect triggered', { isOpen, patient });
    if (isOpen && patient) {
      console.log('🔍 UrologistPatientDetailsModal: Modal opened with patient:', patient);
      // Fetch fresh data from API
      fetchNotes();
      fetchInvestigations();
      fetchInvestigationRequests();
      checkSurgeryAppointment();
      
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
    }
  }, [isOpen, patient, checkSurgeryAppointment]);


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
        console.log('✅ UrologistPatientDetailsModal: Setting clinical notes:', notes);
        setClinicalNotes(notes);
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
        
        // Show success message
        setSuccessModalTitle('Note Saved Successfully!');
        setSuccessModalMessage('Your clinical note has been saved and added to the patient timeline.');
        setIsSuccessModalOpen(true);
      } else {
        console.log('❌ UrologistPatientDetailsModal: Failed to save note:', result.error);
        setNotesError(result.error || 'Failed to save note');
        console.error('Error saving note:', result.error);
      }
    } catch (err) {
      console.error('❌ UrologistPatientDetailsModal: Error saving note:', err);
      setSuccessModalTitle('Error');
      setSuccessModalMessage('Failed to save note');
      setIsSuccessModalOpen(true);
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
      if (result.success) {
        await fetchNotes(); // Refresh notes
        setSuccessModalTitle('Note Deleted');
        setSuccessModalMessage('Clinical note has been deleted successfully.');
        setIsSuccessModalOpen(true);
      } else {
        setSuccessModalTitle('Error');
        setSuccessModalMessage(result.error || 'Failed to delete note');
        setIsSuccessModalOpen(true);
      }
    } catch (err) {
      setSuccessModalTitle('Error');
      setSuccessModalMessage('Failed to delete note');
      setIsSuccessModalOpen(true);
      console.error('Error deleting note:', err);
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
  const handleInvestigationSuccess = async (message) => {
    setSuccessModalTitle('Investigation Added');
    setSuccessModalMessage(message);
    setIsSuccessModalOpen(true);
    
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

  const getDesignationIcon = (designation) => {
    if (!designation) return <FaUserMd className="text-gray-600" />;
    
    switch (designation.toLowerCase()) {
      case 'urologist':
        return <FaUserMd className="text-teal-600" />;
      case 'nurse':
        return <FaUserNurse className="text-blue-600" />;
      default:
        return <FaUserMd className="text-gray-600" />;
    }
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

  // Helper function to render pathway transfer notes with structured formatting
  const renderPathwayTransferNote = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Check if this is a pathway transfer note
    if (!content.includes('PATHWAY TRANSFER')) {
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
        currentKey = 'transferTo';
        data[currentKey] = trimmedLine.replace('Transfer To:', '').trim();
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

    return (
      <div className="space-y-3">
        {/* Transfer To and Priority in same row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-500 mb-1">Transfer To</div>
            <div className="text-base text-gray-900">{data.transferTo || 'Not specified'}</div>
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

  if (!isOpen || !patient) return null;


  // Sample MDT notes data
  const mdtNotes = [
    {
      date: '2024-09-15',
      time: '02:00 PM',
      author: 'Dr. Thompson',
      designation: 'Urologist',
      meetingDate: '2024-09-15',
      attendees: ['Dr. Thompson (Urologist)', 'Dr. Miller (Oncologist)', 'Dr. Peterson (Radiologist)', 'Dr. Williams (Pathologist)'],
      content: 'MDT reviewed case of 62-year-old male with elevated PSA (4.5 ng/mL) and positive biopsy showing Gleason 7 (3+4) prostate cancer. Imaging shows localized disease with no evidence of metastasis.',
      recommendations: [
        'Recommend active surveillance with PSA monitoring every 3 months',
        'Consider MRI in 6 months to assess disease progression',
        'Patient suitable for radical prostatectomy if progression noted'
      ],
      actionItems: [
        'Schedule follow-up PSA in 3 months',
        'Arrange patient consultation to discuss surveillance plan',
        'Book MRI for 6 months time'
      ],
      documents: [
        { id: 1, name: 'Biopsy Report - Sept 2024.pdf', type: 'pdf', uploadDate: '2024-09-14', size: '2.4 MB' },
        { id: 2, name: 'MRI Scan Results.pdf', type: 'pdf', uploadDate: '2024-09-12', size: '5.1 MB' },
        { id: 3, name: 'PSA Trend Analysis.xlsx', type: 'excel', uploadDate: '2024-09-14', size: '156 KB' }
      ]
    },
    {
      date: '2024-07-22',
      time: '02:00 PM',
      author: 'Dr. Sarah Wilson',
      designation: 'Urologist',
      meetingDate: '2024-07-22',
      attendees: ['Dr. Wilson (Urologist)', 'Dr. Chen (Oncologist)', 'Dr. Anderson (Radiologist)'],
      content: 'Initial MDT discussion following biopsy results. Histopathology confirms adenocarcinoma with clear margins. No evidence of lymph node involvement on CT.',
      recommendations: [
        'Patient is a good candidate for robotic-assisted radical prostatectomy',
        'Alternative option: External beam radiotherapy with hormone therapy',
        'Discuss fertility preservation if relevant'
      ],
      actionItems: [
        'Schedule surgical consultation',
        'Provide patient information leaflets',
        'Arrange pre-operative assessment'
      ],
      documents: [
        { id: 4, name: 'Histopathology Report.pdf', type: 'pdf', uploadDate: '2024-07-20', size: '1.8 MB' },
        { id: 5, name: 'CT Scan - Abdomen & Pelvis.pdf', type: 'pdf', uploadDate: '2024-07-18', size: '8.2 MB' }
      ]
    },
    {
      date: '2024-06-10',
      time: '02:00 PM',
      author: 'Dr. Michael Chen',
      designation: 'Urologist',
      meetingDate: '2024-06-10',
      attendees: ['Dr. Chen (Urologist)', 'Dr. Rodriguez (Oncologist)', 'Dr. Kim (Pathologist)'],
      content: 'Pre-biopsy MDT discussion. Patient presents with persistently elevated PSA (6.8 ng/mL) and abnormal DRE findings. Family history of prostate cancer noted.',
      recommendations: [
        'Proceed with TRUS-guided biopsy',
        'Consider mpMRI before biopsy to target suspicious areas',
        'Counsel patient on biopsy risks and benefits'
      ],
      actionItems: [
        'Book mpMRI scan',
        'Schedule biopsy procedure',
        'Provide patient information about biopsy'
      ],
      documents: [
        { id: 6, name: 'PSA History Report.pdf', type: 'pdf', uploadDate: '2024-06-08', size: '892 KB' },
        { id: 7, name: 'Family History Assessment.docx', type: 'word', uploadDate: '2024-06-09', size: '245 KB' }
      ]
    }
  ];

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
  const psaHistory = psaResults.map(result => ({
    id: result.id,
    date: result.test_date || result.created_at,
    result: result.result_value || result.result,
    referenceRange: result.reference_range || '0.0 - 4.0 ng/mL',
    status: result.status || 'Available',
    statusColor: 'blue',
    notes: result.notes || result.comments || '',
    filePath: result.file_path
  }));

  // Latest other test results from API data
  const latestOtherTests = otherTestResults.map(result => ({
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
        return 'bg-green-100 text-green-700';
      case 'elevated':
      case 'high risk':
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


  return (
    <>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="bg-teal-50 text-teal-900 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">{patient.name}</h2>
                {patient.referredByGP && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-teal-800">Referred by</div>
                    <div className="text-sm text-teal-700">{patient.referredByGP} (GP)</div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 text-teal-700">
                <span>{patient.age}, {patient.gender}</span>
                <span>UPI: {patient.upi || patient.patientId}</span>
                <span>MRN: {patient.mrn}</span>
                {patient.appointmentTime && (
                  <span>Appointment: {patient.appointmentTime}</span>
                )}
                {patient.status && (
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    patient.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    patient.status === 'no_show' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {patient.status}
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
        {(patient.appointmentTime || patient.psa || patient.type) && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {patient.appointmentTime && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Appointment Time:</span>
                    <span className="text-sm font-semibold text-gray-900">{patient.appointmentTime}</span>
                  </div>
                )}
                {patient.psa && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">PSA:</span>
                    <span className="text-sm font-semibold text-gray-900">{patient.psa} ng/mL</span>
                  </div>
                )}
                {patient.type && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Type:</span>
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                      {patient.type}
                    </span>
                  </div>
                )}
              </div>
              {patient.urologist && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Urologist:</span> {patient.urologist}
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
              className={`px-4 py-3 font-medium text-sm relative flex items-center ${
                activeTab === 'clinicalNotes'
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
              className={`px-4 py-3 font-medium text-sm relative flex items-center ${
                activeTab === 'testResults'
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
            
            {/* MDT Notes tab - only visible for surgery-pathway and post-op-followup patients */}
            {(patient.category === 'surgery-pathway' || patient.category === 'post-op-followup') && (
              <button
                onClick={() => setActiveTab('mdtNotes')}
                className={`px-4 py-3 font-medium text-sm relative flex items-center ${
                  activeTab === 'mdtNotes'
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
            {patient.category === 'post-op-followup' && (
              <button
                onClick={() => setActiveTab('dischargeSummary')}
                className={`px-4 py-3 font-medium text-sm relative flex items-center ${
                  activeTab === 'dischargeSummary'
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
                  
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 flex flex-col min-h-0 mb-3">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                        Note Content
                      </label>
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Enter clinical note details..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none flex-1 min-h-[100px]"
                      />
                    </div>
                    
                    <div className="flex justify-between space-x-3 flex-shrink-0">
                      <button
                        onClick={() => {
                          setNoteContent('');
                        }}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleSaveNote}
                        disabled={savingNote || !noteContent.trim()}
                        className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingNote ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaNotesMedical className="mr-2" />
                            Save Note
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t border-gray-200 mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 flex-shrink-0">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsMDTSchedulingModalOpen(true)}
                        className="flex-1 px-3 py-3 text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors flex items-center justify-center"
                      >
                        <FaUserNurse className="mr-2" />
                        Schedule MDT
                      </button>
                      <button
                        onClick={() => setIsAddInvestigationModalOpen(true)}
                        className="flex-1 px-3 py-3 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                      >
                        <FaFlask className="mr-2" />
                        Add Investigation
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
                    Clinical Notes Timeline
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
                      {clinicalNotes.map((note, index) => {
                        const noteContent = note.content || '';
                        const isRescheduleNote = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');
                        
                        return (
                        <div key={note.id || index} className="flex gap-4">
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRescheduleNote ? 'bg-orange-100' : 'bg-teal-100'}`}>
                              {getNoteIcon(note.type)}
                            </div>
                            {index < clinicalNotes.length - 1 && (
                              <div className={`w-0.5 h-16 mt-2 ${isRescheduleNote ? 'bg-orange-100' : 'bg-teal-100'}`}></div>
                            )}
                          </div>
                          
                          {/* Note content */}
                          <div className="flex-1 pb-4">
                            <div className={`rounded-lg p-4 border ${isRescheduleNote ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                              {/* Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${isRescheduleNote ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>
                                    {note.type || 'Clinical Note'}
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
                                
                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  {/* Edit Appointment button - ALWAYS show for Surgery Pathway notes (not reschedule notes) */}
                                  {(() => {
                                    const noteContent = note.content || '';
                                    
                                    // Don't show button on reschedule notes
                                    const isRescheduleNote = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');
                                    if (isRescheduleNote) {
                                      return null;
                                    }
                                    
                                    // Check if note is a pathway transfer to Surgery Pathway
                                    // Be VERY lenient - check for ANY mention of Surgery Pathway in ANY form
                                    const noteContentLower = noteContent.toLowerCase();
                                    const hasSurgeryPathway = 
                                      noteContent.includes('Surgery Pathway') || 
                                      noteContentLower.includes('surgery pathway') ||
                                      (noteContent.includes('Transfer To:') && noteContentLower.includes('surgery')) ||
                                      (note.type === 'pathway_transfer' && noteContentLower.includes('surgery'));
                                    
                                    // ALWAYS show button if it mentions Surgery Pathway (and it's not a reschedule note)
                                    // This button MUST stay visible - no other conditions should hide it
                                    if (!hasSurgeryPathway) {
                                      console.log('❌ Edit Appointment button hidden - not a Surgery Pathway note:', {
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
                                            const appointmentsResult = await bookingService.getPatientAppointments(patient.id);
                                            if (appointmentsResult.success) {
                                              const appointments = appointmentsResult.data?.appointments || appointmentsResult.data || [];
                                              const surgeryAppointment = appointments.find(apt => {
                                                const aptType = (apt.appointmentType || apt.type || '').toLowerCase();
                                                // Check for various surgery appointment type formats
                                                return aptType === 'surgery' || 
                                                       aptType === 'surgical' || 
                                                       aptType.includes('surgery') ||
                                                       aptType.includes('surgical');
                                              });
                                              
                                              if (surgeryAppointment) {
                                                setSelectedSurgeryAppointment({
                                                  ...surgeryAppointment,
                                                  reason: parsedData.reason || '',
                                                  priority: parsedData.priority || 'normal',
                                                  clinicalRationale: parsedData.clinicalRationale || '',
                                                  additionalNotes: parsedData.additionalNotes || ''
                                                });
                                                setIsEditSurgeryAppointmentModalOpen(true);
                                              } else {
                                                showErrorModal('Appointment Not Found', 'No surgery appointment found for this patient. Please schedule a surgery appointment first.');
                                                // Refresh the appointment check
                                                await checkSurgeryAppointment();
                                              }
                                            } else {
                                              showErrorModal('Failed to Fetch', 'Failed to fetch appointment details.');
                                            }
                                          } catch (error) {
                                            console.error('Error fetching surgery appointment:', error);
                                            showErrorModal('Error', 'Error fetching appointment details.');
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1"
                                      >
                                        <IoCalendar className="w-3 h-3" />
                                        Edit Appointment
                                      </button>
                                    );
                                  })()}
                                  <button 
                                    onClick={() => handleDeleteClick(note.id)}
                                    disabled={deletingNote === note.id}
                                    className="p-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                  >
                                    {deletingNote === note.id ? (
                                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <Trash className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              
                              {/* Content */}
                              <div className="mb-4">
                                {renderPathwayTransferNote(note.content || 'No content available')}
                              </div>
                              
                              {/* Author */}
                              <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  {getDesignationIcon(note.authorRole || 'urologist')}
                                  <span className="text-sm font-medium text-gray-900">{note.authorName || 'Unknown'}</span>
                                </div>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-xs text-gray-500">{note.authorRole || 'Staff'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
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
                      <button
                        onClick={() => setIsPSAHistoryModalOpen(true)}
                        className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium"
                      >
                        View History
                      </button>
                    </div>
                  </div>
                </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                    {loadingInvestigations ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-gray-500">Loading investigations...</div>
                      </div>
                    ) : investigationsError ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-red-500">Error: {investigationsError}</div>
                      </div>
                    ) : latestPSA ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900">PSA (Prostate Specific Antigen)</h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(latestPSA.status)}`}>
                                  {latestPSA.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                Date: {latestPSA.date}
                              </div>
                            </div>
                            <button 
                              onClick={() => handleViewReport(latestPSA)}
                              className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                            >
                              View
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4 mb-3">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Result:</span>
                              <span className="ml-2 text-sm text-gray-900">{latestPSA.result}</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">Reference Range:</span>
                              <span className="ml-2 text-sm text-gray-600">{latestPSA.referenceRange}</span>
                            </div>
                          </div>
                          
                          {latestPSA.notes && (
                            <div className="pt-3 border-t border-gray-200">
                              <span className="text-sm font-medium text-gray-700">Notes:</span>
                              <p className="text-sm text-gray-600 mt-1">{latestPSA.notes}</p>
                            </div>
                          )}
                        </div>
                        
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
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <IoDocument className="mr-2 text-teal-600" />
                      Other Test Results & Reports
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsAddTestModalOpen(true)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Test</span>
                      </button>
                      <button
                        onClick={() => setIsOtherTestsHistoryModalOpen(true)}
                        className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium"
                      >
                        View History
                      </button>
                    </div>
                  </div>
                </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                    {(() => {
                      console.log('🎨 Rendering Other Test Results section:');
                      console.log('  - loadingInvestigations:', loadingInvestigations);
                      console.log('  - loadingRequests:', loadingRequests);
                      console.log('  - investigationsError:', investigationsError);
                      console.log('  - requestsError:', requestsError);
                      console.log('  - investigationRequests.length:', investigationRequests.length);
                      console.log('  - latestOtherTests.length:', latestOtherTests.length);
                      return null;
                    })()}
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
                    ) : (investigationRequests.length > 0 || latestOtherTests.length > 0) ? (
                      <div className="space-y-4">
                        {/* Investigation Requests */}
                        {investigationRequests.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center">
                              <IoCalendar className="mr-2" />
                              Pending Investigations
                            </h4>
                            {investigationRequests.map((request) => {
                              const getRequestStatusColor = (status) => {
                                switch (status?.toLowerCase()) {
                                  case 'urgent':
                                    return 'bg-red-100 text-red-700 border-red-200';
                                  case 'scheduled':
                                    return 'bg-blue-100 text-blue-700 border-blue-200';
                                  case 'completed':
                                    return 'bg-green-100 text-green-700 border-green-200';
                                  case 'pending':
                                    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                  default:
                                    return 'bg-gray-100 text-gray-700 border-gray-200';
                                }
                              };

                              return (
                                <div key={`request-${request.id}`} className="bg-purple-50 rounded-lg p-4 border border-purple-200 mb-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-semibold text-gray-900">{request.investigationName || request.investigation_name}</h5>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getRequestStatusColor(request.status)}`}>
                                          {request.status?.toUpperCase() || 'PENDING'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        <span className="font-medium">Scheduled:</span> {request.formattedDate || new Date(request.scheduledDate || request.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        <span className="font-medium">Type:</span> <span className="capitalize">{request.investigationType || request.investigation_type}</span>
                                      </div>
                                      {request.notes && (
                                        <div className="mt-2 text-xs text-gray-600">
                                          <span className="font-medium">Notes:</span> {request.notes}
                                        </div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        setSelectedInvestigationRequest(request);
                                        setIsAddResultModalOpen(true);
                                      }}
                                      className="ml-3 px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors font-medium whitespace-nowrap flex items-center gap-1"
                                    >
                                      <Upload className="w-3 h-3" />
                                      Add Results
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Completed Test Results */}
                        {latestOtherTests.length > 0 && (
                          <div>
                            {investigationRequests.length > 0 && (
                              <h4 className="text-sm font-semibold text-teal-700 mb-3 flex items-center mt-6">
                                <IoDocument className="mr-2" />
                                Completed Results
                              </h4>
                            )}
                            {latestOtherTests.map((test) => (
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
                                  Date: {test.date}
                                </div>
                              </div>
                              <button 
                                onClick={() => handleViewReport(test)}
                                className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                              >
                                View
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 mb-3">
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
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                          <IoDocument className="text-xl text-gray-400" />
                        </div>
                        <h4 className="text-base font-medium text-gray-900 mb-1">No Test Results</h4>
                        <p className="text-gray-500 text-sm">No other test results have been recorded for this patient yet.</p>
                      </div>
                    )}
                  </div>
                </div>
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
                    {mdtNotes.length > 0 ? (
                      mdtNotes.map((note, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
              {/* For New Patients: Active Monitoring, Surgery Pathway, Medication, Radiotherapy, Discharge */}
              {console.log('🔍 DEBUG: New patients check:', { category: patient?.category, isNew: patient?.category === 'new' || !patient?.category })}
              {patient && (patient.category === 'new' || !patient.category) && (
                <>
                  {/* Active Monitoring */}
                  <button
                    onClick={() => handleTransfer('Active Monitoring')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <IoHeart className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Active Monitoring</span>
                  </button>

                  {/* Surgery Pathway */}
                  <button
                    onClick={() => handleTransfer('Surgery Pathway')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <FaStethoscope className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Surgery Pathway</span>
                  </button>

                  {/* Medication */}
                  <button
                    onClick={() => handleTransfer('Medication')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <FaPills className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Medication</span>
                  </button>

                  {/* Radiotherapy */}
                  <button
                    onClick={() => handleTransfer('Radiotherapy')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <IoMedical className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Radiotherapy</span>
                  </button>

                  {/* Discharge */}
                  <button
                    onClick={() => handleTransfer('Discharge')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <IoCheckmark className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                  </button>
                </>
              )}

              {/* For Surgery Pathway Patients: Active Surveillance, Medication, Radiotherapy, Post-op Followup, Discharge */}
              {console.log('🔍 DEBUG: Patient data:', { patient, category: patient?.category, isSurgeryPathway: patient?.category === 'surgery-pathway' })}
              {patient && patient.category === 'surgery-pathway' && (
                <>
                  {/* Active Surveillance */}
                  <button
                    onClick={() => handleTransfer('Active Surveillance')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <IoHeart className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Active Surveillance</span>
                  </button>

                  {/* Medication */}
                  <button
                    onClick={() => handleTransfer('Medication')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <FaPills className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Medication</span>
                  </button>

                  {/* Radiotherapy */}
                  <button
                    onClick={() => handleTransfer('Radiotherapy')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <IoMedical className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Radiotherapy</span>
                  </button>

                  {/* Post-op Followup */}
                  <button
                    onClick={() => handleTransfer('Post-op Followup')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <FaStethoscope className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Post-op Followup</span>
                  </button>

                  {/* Discharge */}
                  <button
                    onClick={() => handleTransfer('Discharge')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <IoCheckmark className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                  </button>
                </>
              )}

              {/* For Post-op Followup Patients: Medication, Discharge only */}
              {patient && patient.category === 'post-op-followup' && (
                <>
                  {/* Medication */}
                  <button
                    onClick={() => handleTransfer('Medication')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <FaPills className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Medication</span>
                  </button>

                  {/* Discharge */}
                  <button
                    onClick={() => handleTransfer('Discharge')}
                    className="flex flex-col items-center p-3 bg-white rounded-md hover:bg-gray-50 transition-colors min-w-[110px] border border-gray-200"
                  >
                    <div className="w-8 h-8 bg-teal-50 rounded-md flex items-center justify-center mb-2">
                      <IoCheckmark className="text-teal-600 text-sm" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">Discharge</span>
                  </button>
                </>
              )}
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
                            <div key={i} className="absolute w-full border-t border-gray-200" style={{top: `${i * 20}%`}}></div>
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
      <AddInvestigationModal
        isOpen={isAddInvestigationModalOpen}
        onClose={() => setIsAddInvestigationModalOpen(false)}
        patient={patient}
        onSuccess={(message) => {
          setSuccessModalTitle('Investigation Requested');
          setSuccessModalMessage(message);
          setIsSuccessModalOpen(true);
          setIsAddInvestigationModalOpen(false);
          // Refresh investigations and requests lists after adding
          fetchInvestigationRequests();
          fetchNotes(); // Also refresh notes as a clinical note is created
        }}
      />

      {/* Add PSA Result Modal */}
      <AddPSAResultModal
        isOpen={isAddPSAModalOpen}
        onClose={() => setIsAddPSAModalOpen(false)}
        patient={patient}
        onSuccess={handleInvestigationSuccess}
      />

      {/* Add Test Result Modal */}
      <AddTestResultModal
        isOpen={isAddTestModalOpen}
        onClose={() => setIsAddTestModalOpen(false)}
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
        onSuccess={(message, requestId) => {
          setSuccessModalTitle('Result Added Successfully!');
          setSuccessModalMessage(message);
          setIsSuccessModalOpen(true);
          setIsAddResultModalOpen(false);
          setSelectedInvestigationRequest(null);
          // Refresh both investigation results and requests
          fetchInvestigations();
          fetchInvestigationRequests();
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title={successModalTitle}
        message={successModalMessage}
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
                      surgeryTime: ''
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
                                placeholder="e.g., 30 days"
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Surgery Time *
                        </label>
                        <input
                          type="time"
                          value={transferDetails.surgeryTime}
                          onChange={(e) => setTransferDetails(prev => ({ ...prev, surgeryTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                          required
                        />
                      </div>
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
                      surgeryTime: ''
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
                  }}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    // Special handling for Discharge and Post-op Transfer - require discharge summary
                    if (selectedPathway === 'Discharge' || selectedPathway === 'Post-op Transfer') {
                      // Close pathway modal and open discharge summary modal
                      setIsPathwayModalOpen(false);
                      setIsDischargeSummaryModalOpen(true);
                      return;
                    }
                    
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
                        showErrorModal('Validation Error', 'Please fill in all surgery scheduling fields (date and time)');
                        return;
                      }
                    } else {
                      if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                        showErrorModal('Validation Error', 'Please provide reason and clinical rationale');
                        return;
                      }
                    }

                    // First, handle manual appointment booking if needed (BEFORE pathway transfer)
                    let appointmentBooked = false;
                    const hasManualBooking = (selectedPathway === 'Active Monitoring' || selectedPathway === 'Active Surveillance') && 
                                             appointmentBooking.appointmentDate && appointmentBooking.appointmentTime;
                    
                    if (hasManualBooking) {
                      try {
                        console.log('🔍 Creating manual appointment BEFORE pathway transfer');
                        console.log('📋 Patient data:', patient);
                        console.log('📋 Appointment booking state:', appointmentBooking);
                        
                        const currentUser = authService.getCurrentUser();
                        console.log('👤 Current user:', currentUser);
                        
                        // Validate user data
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
                        
                        console.log('👤 Extracted urologist name:', urologistName);
                        
                        if (!urologistName || urologistName.trim() === '') {
                          throw new Error('Urologist name could not be determined. Please update your profile.');
                        }
                        
                        // Validate appointment data
                        if (!appointmentBooking.appointmentDate) {
                          throw new Error('Appointment date is required.');
                        }
                        if (!appointmentBooking.appointmentTime) {
                          throw new Error('Appointment time is required.');
                        }
                        
                        // Build appointment data with all required fields (matching backend expectations)
                        const appointmentData = {
                          appointmentDate: appointmentBooking.appointmentDate,  // Backend expects 'appointmentDate'
                          appointmentTime: appointmentBooking.appointmentTime,  // Backend expects 'appointmentTime'
                          urologistId: urologistId,
                          urologistName: urologistName.trim(),
                          appointmentType: 'urologist',  // Backend expects 'appointmentType'
                          notes: `Follow-up for ${selectedPathway} - Check-up frequency: Every ${recurringAppointments.interval} month(s)${transferDetails.additionalNotes ? `\n\nAdditional Notes: ${transferDetails.additionalNotes}` : ''}`,
                          patientName: patient.name || 'Unknown Patient',
                          upi: patient.upi || patient.patientId || 'N/A'
                        };
                        
                        console.log('📤 Final appointment data being sent:', JSON.stringify(appointmentData, null, 2));
                        console.log('🔍 Patient ID for booking:', patient.id);
                        
                        // Validate all required fields before sending
                        const requiredFields = ['appointmentDate', 'appointmentTime', 'urologistId', 'urologistName'];
                        const missingFields = requiredFields.filter(field => !appointmentData[field]);
                        
                        if (missingFields.length > 0) {
                          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                        }
                        
                        const appointmentResult = await bookingService.bookUrologistAppointment(patient.id, appointmentData);
                        
                        console.log('📥 Appointment booking result:', appointmentResult);
                        
                        if (appointmentResult.success) {
                          console.log('✅ Manual appointment created successfully');
                          appointmentBooked = true;
                          
                          // Create recurring appointments based on frequency
                          const intervalMonths = parseInt(recurringAppointments.interval) || 1;
                          const numberOfRecurringAppointments = 12 / intervalMonths; // Create appointments for 1 year
                          
                          console.log(`🔄 Creating ${numberOfRecurringAppointments - 1} additional recurring appointments (every ${intervalMonths} month(s))`);
                          
                          // Create recurring appointments (starting from the second one, first is already created)
                          for (let i = 1; i < numberOfRecurringAppointments; i++) {
                            try {
                              // Calculate next appointment date
                              const nextDate = new Date(appointmentBooking.appointmentDate);
                              nextDate.setMonth(nextDate.getMonth() + (intervalMonths * i));
                              
                              const nextDateStr = nextDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                              
                              const recurringAppointmentData = {
                                appointmentDate: nextDateStr,
                                appointmentTime: appointmentBooking.appointmentTime,
                                urologistId: urologistId,
                                urologistName: urologistName.trim(),
                                appointmentType: 'urologist',
                                notes: `Recurring follow-up for ${selectedPathway} - Appointment ${i + 1}/${numberOfRecurringAppointments} (Every ${intervalMonths} month(s))${transferDetails.additionalNotes ? `\n\nAdditional Notes: ${transferDetails.additionalNotes}` : ''}`,
                                patientName: patient.name || 'Unknown Patient',
                                upi: patient.upi || patient.patientId || 'N/A'
                              };
                              
                              console.log(`🔄 Creating recurring appointment ${i + 1}/${numberOfRecurringAppointments - 1} for ${nextDateStr}`);
                              
                              const recurringResult = await bookingService.bookUrologistAppointment(patient.id, recurringAppointmentData);
                              
                              if (recurringResult.success) {
                                console.log(`✅ Recurring appointment ${i + 1} created successfully`);
                              } else {
                                console.error(`⚠️ Failed to create recurring appointment ${i + 1}:`, recurringResult.error);
                                // Continue creating other appointments even if one fails
                              }
                            } catch (recurringError) {
                              console.error(`⚠️ Error creating recurring appointment ${i + 1}:`, recurringError);
                              // Continue creating other appointments
                            }
                          }
                          
                          console.log('✅ All recurring appointments processed');
                          
                        } else {
                          console.error('❌ Failed to create manual appointment:', appointmentResult.error);
                          // Show error and STOP the entire process
                          showErrorModal('Appointment Scheduling Failed', `Failed to schedule appointment: ${appointmentResult.error}\n\nPathway transfer has been cancelled. Please try again.`);
                          return; // Exit early - don't proceed with pathway transfer
                        }
                      } catch (appointmentError) {
                        console.error('❌ Error creating manual appointment:', appointmentError);
                        showErrorModal('Appointment Scheduling Error', `An error occurred while scheduling the appointment: ${appointmentError.message}\n\nPathway transfer has been cancelled. Please try again.`);
                        return; // Exit early - don't proceed with pathway transfer
                      }
                    }

                    // Handle surgery scheduling for Surgery Pathway (BEFORE pathway transfer)
                    let surgeryScheduled = false;
                    if (selectedPathway === 'Surgery Pathway') {
                      try {
                        console.log('🔍 Scheduling surgery BEFORE pathway transfer');
                        console.log('📋 Surgery details:', transferDetails);
                        
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
                          appointmentTime: transferDetails.surgeryTime,
                          urologistId: urologistId,
                          urologistName: urologistName.trim(),
                          appointmentType: 'surgery',
                          surgeryType: transferDetails.reason,
                          notes: `Surgery scheduled: ${transferDetails.reason}\nPriority: ${transferDetails.priority}\nClinical Rationale: ${transferDetails.clinicalRationale}${transferDetails.additionalNotes ? `\n\nAdditional Notes: ${transferDetails.additionalNotes}` : ''}`,
                          priority: transferDetails.priority
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
                    try {
                      const payload = {
                        pathway: selectedPathway,
                        reason: transferDetails.reason,
                        notes: transferDetails.clinicalRationale || transferDetails.additionalNotes || '',
                        skipAutoBooking: hasManualBooking || surgeryScheduled // Tell backend to skip auto-booking if we're doing manual booking or surgery scheduling
                      };
                      const res = await patientService.updatePatientPathway(patient.id, payload);
                      if (res.success) {
                        // If backend auto-booked an appointment and we didn't manually book, create recurring appointments
                        if (!appointmentBooked && res.data?.autoBookedAppointment && 
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
                            if (appointmentBooked && hasManualBooking) {
                              const frequencyText = recurringAppointments.interval === '1' ? 'Monthly' : 
                                                   recurringAppointments.interval === '3' ? 'Every 3 months' :
                                                   recurringAppointments.interval === '6' ? 'Every 6 months' : 'Annual';
                              appointmentSection = `
                              
Follow-up Appointment Scheduled:
- Date: ${appointmentBooking.appointmentDate}
- Time: ${appointmentBooking.appointmentTime}
- Frequency: ${frequencyText}`;
                            }
                            
                            // Add surgery appointment section if surgery was scheduled
                            let surgeryAppointmentSection = '';
                            if (surgeryScheduled && selectedPathway === 'Surgery Pathway') {
                              surgeryAppointmentSection = `

Surgery Appointment Scheduled:
- Date: ${transferDetails.surgeryDate}
- Time: ${transferDetails.surgeryTime}`;
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
                          const noteResult = await notesService.addNote(patient.id, noteData);
                          
                          if (noteResult.success) {
                            console.log('✅ Clinical note created successfully for pathway transfer');
                            // Update the clinical notes list in the UI
                            setClinicalNotes(prev => [noteResult.data, ...prev]);
                          } else {
                            console.error('❌ Failed to create clinical note for pathway transfer:', noteResult.error);
                          }
                        } catch (noteError) {
                          console.error('❌ Error creating clinical note for pathway transfer:', noteError);
                          // Don't fail the transfer if note creation fails
                        }

                        let message = `Patient successfully transferred to ${selectedPathway}`;
                        
                        // Show manual appointment confirmation if successfully created
                        if (appointmentBooked && hasManualBooking) {
                          const aptDate = new Date(appointmentBooking.appointmentDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          });
                          
                          const intervalMonths = parseInt(recurringAppointments.interval) || 1;
                          const numberOfAppointments = 12 / intervalMonths;
                          
                          const frequencyText = recurringAppointments.interval === '1' ? 'Monthly' : 
                                               recurringAppointments.interval === '3' ? 'Every 3 months' :
                                               recurringAppointments.interval === '6' ? 'Every 6 months' : 
                                               recurringAppointments.interval === '12' ? 'Annual' : `Every ${intervalMonths} months`;
                          
                          message += `\n\n✅ Follow-up appointments scheduled:\n📅 First appointment: ${aptDate}\n⏰ Time: ${appointmentBooking.appointmentTime}\n🔄 Frequency: ${frequencyText}\n📊 Total appointments: ${numberOfAppointments} (for the next 12 months)`;
                        } 
                        // Only show auto-booking notification if NO manual scheduling was attempted
                        else if (!hasManualBooking && selectedPathway === 'Active Monitoring' && res.data?.autoBookedAppointment) {
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
                          
                          message += `\n\n✅ Follow-up appointments scheduled:\n📅 First appointment: ${aptDate}\n⏰ Time: ${apt.time}\n👨‍⚕️ Urologist: ${apt.urologistName}\n🔄 Frequency: ${frequencyText}\n📊 Total appointments: ${numberOfAppointments} (for the next 12 months)`;
                        }
                        
                        setSuccessModalTitle('Transfer Successful');
                        setSuccessModalMessage(message);
                        setIsSuccessModalOpen(true);
                        
                        // Refresh appointment check, especially important for Surgery Pathway
                        checkSurgeryAppointment();
                        
                        // Refresh clinical notes to show the new transfer note
                        fetchNotes();
                        
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
                        setSuccessModalTitle('Error');
                        setSuccessModalMessage(res.error || 'Failed to update pathway');
                        setIsSuccessModalOpen(true);
                      }
                    } catch (e) {
                      setSuccessModalTitle('Error');
                      setSuccessModalMessage('Failed to update pathway');
                      setIsSuccessModalOpen(true);
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
    </>
  );
};

export default UrologistPatientDetailsModal;