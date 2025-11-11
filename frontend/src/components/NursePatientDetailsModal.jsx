import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoTimeSharp, IoMedical, IoCheckmarkCircle, IoDocumentText, IoAnalytics, IoDocument, IoHeart, IoCheckmark, IoAlertCircle, IoCalendar } from 'react-icons/io5';
import { FaNotesMedical, FaUserMd, FaUserNurse, FaFileMedical, FaFlask, FaPills, FaStethoscope } from 'react-icons/fa';
import { BsClockHistory } from 'react-icons/bs';
import { Plus, Upload, Eye, Download, Trash } from 'lucide-react';
import SuccessModal from './SuccessModal';
import ConfirmationModal from './modals/ConfirmationModal';
import AddPSAResultModal from './modals/AddPSAResultModal';
import AddTestResultModal from './modals/AddTestResultModal';
import MDTSchedulingModal from './MDTSchedulingModal';
import AddInvestigationModal from './AddInvestigationModal';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import ImageViewerModal from './modals/ImageViewerModal';
import { notesService } from '../services/notesService';
import { investigationService } from '../services/investigationService';

const NursePatientDetailsModal = ({ isOpen, onClose, patient }) => {
  const [activeTab, setActiveTab] = useState('clinicalNotes');
  const [noteContent, setNoteContent] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [isPSAHistoryModalOpen, setIsPSAHistoryModalOpen] = useState(false);
  const [isOtherTestsHistoryModalOpen, setIsOtherTestsHistoryModalOpen] = useState(false);
  const [isMDTSchedulingModalOpen, setIsMDTSchedulingModalOpen] = useState(false);
  const [isAddInvestigationModalOpen, setIsAddInvestigationModalOpen] = useState(false);
  
  // Notes API state
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(null);
  
  // Confirmation modal state
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  
  // Investigation modals state
  const [isAddPSAModalOpen, setIsAddPSAModalOpen] = useState(false);
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);
  
  // Image viewer modal state
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFileName, setImageFileName] = useState('');
  const [imageBlobUrl, setImageBlobUrl] = useState(null);
  
  // Investigation data state
  const [psaResults, setPsaResults] = useState([]);
  const [otherTestResults, setOtherTestResults] = useState([]);
  const [investigationRequests, setInvestigationRequests] = useState([]);
  const [loadingInvestigations, setLoadingInvestigations] = useState(false);
  const [investigationsError, setInvestigationsError] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState(null);
  const [deletingInvestigation, setDeletingInvestigation] = useState(null);
  
  // PSA history state for modal
  const [psaHistory, setPsaHistory] = useState([]);
  const [loadingPSAHistory, setLoadingPSAHistory] = useState(false);
  const [psaHistoryError, setPsaHistoryError] = useState(null);
  
  // Test results history state for modal
  const [testHistory, setTestHistory] = useState([]);
  const [loadingTestHistory, setLoadingTestHistory] = useState(false);
  const [testHistoryError, setTestHistoryError] = useState(null);

  // MDT meetings state
  const [mdtMeetings, setMdtMeetings] = useState([]);
  const [loadingMdtMeetings, setLoadingMdtMeetings] = useState(false);
  const [mdtMeetingsError, setMdtMeetingsError] = useState(null);

  // Discharge summary state
  const [dischargeSummary, setDischargeSummary] = useState(null);
  const [loadingDischargeSummary, setLoadingDischargeSummary] = useState(false);
  const [dischargeSummaryError, setDischargeSummaryError] = useState(null);
  
  
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

  // Fetch notes for the patient
  const fetchNotes = useCallback(async () => {
    if (!patient?.id) {
      console.log('❌ NursePatientDetailsModal: fetchNotes - No patient ID');
      return;
    }
    
    console.log('🔍 NursePatientDetailsModal: Fetching notes for patient ID:', patient.id);
    setLoadingNotes(true);
    setNotesError(null);
    
    try {
      const result = await notesService.getPatientNotes(patient.id);
      console.log('🔍 NursePatientDetailsModal: Notes response:', result);
      
      if (result.success) {
        // Handle different response structures
        const notes = Array.isArray(result.data) 
          ? result.data 
          : (result.data.notes || []);
        
        console.log('✅ NursePatientDetailsModal: Processed notes:', notes);
        setClinicalNotes(notes);
      } else {
        setNotesError(result.error || 'Failed to fetch notes');
        console.error('❌ NursePatientDetailsModal: Error fetching notes:', result.error);
      }
    } catch (error) {
      setNotesError('Failed to fetch notes');
      console.error('❌ NursePatientDetailsModal: Exception fetching notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  }, [patient?.id]);

  // Save a new note
  const saveNote = async () => {
    if (!patient?.id || !noteContent.trim()) return;
    
    setSavingNote(true);
    
    try {
      const result = await notesService.addNote(patient.id, {
        noteContent: noteContent.trim(),
        noteType: 'clinical'
      });
      
      if (result.success) {
        // Add the new note to the beginning of the list (backend now provides correct format)
        console.log('New note data:', result.data);
        setClinicalNotes(prev => [result.data, ...prev]);
        setNoteContent('');
        
        // Show success message
        setSuccessModalTitle('Note Saved Successfully!');
        setSuccessModalMessage('Your clinical note has been saved and added to the patient timeline.');
        setIsSuccessModalOpen(true);
      } else {
        setNotesError(result.error || 'Failed to save note');
        console.error('Error saving note:', result.error);
      }
    } catch (error) {
      setNotesError('Failed to save note');
      console.error('Error saving note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  // Show delete confirmation modal
  const handleDeleteNote = (noteId) => {
    setNoteToDelete(noteId);
    setIsConfirmationModalOpen(true);
  };

  // Confirm delete note
  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    
    setDeletingNote(noteToDelete);
    setIsConfirmationModalOpen(false);
    
    try {
      const result = await notesService.deleteNote(noteToDelete);
      
      if (result.success) {
        // Remove the note from the list
        setClinicalNotes(prev => prev.filter(note => note.id !== noteToDelete));
        
        // Show success message
        setSuccessModalTitle('Note Deleted Successfully!');
        setSuccessModalMessage('The clinical note has been removed from the patient timeline.');
        setIsSuccessModalOpen(true);
      } else {
        setNotesError(result.error || 'Failed to delete note');
        console.error('Error deleting note:', result.error);
      }
    } catch (error) {
      setNotesError('Failed to delete note');
      console.error('Error deleting note:', error);
    } finally {
      setDeletingNote(null);
      setNoteToDelete(null);
    }
  };

  // Cancel delete
  const cancelDeleteNote = () => {
    setIsConfirmationModalOpen(false);
    setNoteToDelete(null);
  };

  // Fetch investigation results
  const fetchInvestigations = useCallback(async () => {
    if (!patient?.id) {
      console.log('❌ NursePatientDetailsModal: fetchInvestigations - No patient ID');
      return;
    }
    
    console.log('🔍 NursePatientDetailsModal: Fetching investigations for patient ID:', patient.id);
    setLoadingInvestigations(true);
    setInvestigationsError(null);
    
    try {
      // Fetch all investigation results
      const allResults = await investigationService.getInvestigationResults(patient.id);
      console.log('🔍 NursePatientDetailsModal: Investigation results response:', allResults);
      
      if (allResults.success) {
        // Handle different response structures
        const results = Array.isArray(allResults.data) 
          ? allResults.data 
          : (allResults.data.results || allResults.data.investigations || []);
        
        console.log('✅ NursePatientDetailsModal: Processed results:', results);
        
        // Filter PSA results
        const psaResults = results.filter(result => 
          result.testType === 'psa' || result.test_type === 'PSA' || result.test_type === 'psa'
        );
        setPsaResults(psaResults);
        
        // Filter non-PSA results
        const otherResults = results.filter(result => 
          result.testType !== 'psa' && result.test_type !== 'PSA' && result.test_type !== 'psa'
        );
        setOtherTestResults(otherResults);
      } else {
        setInvestigationsError(allResults.error || 'Failed to fetch investigation results');
        console.error('❌ NursePatientDetailsModal: Error fetching investigations:', allResults.error);
      }
    } catch (error) {
      setInvestigationsError('Failed to fetch investigation results');
      console.error('❌ NursePatientDetailsModal: Exception fetching investigations:', error);
    } finally {
      setLoadingInvestigations(false);
    }
  }, [patient?.id]);

  const fetchInvestigationRequests = useCallback(async () => {
    if (!patient?.id) {
      console.log('❌ NursePatientDetailsModal: fetchInvestigationRequests - No patient ID');
      return;
    }
    
    console.log('🔍 NursePatientDetailsModal: Fetching investigation requests for patient ID:', patient.id);
    setLoadingRequests(true);
    setRequestsError(null);
    
    try {
      const result = await investigationService.getInvestigationRequests(patient.id);
      console.log('🔍 NursePatientDetailsModal: Investigation requests response:', result);
      
      if (result.success) {
        const requests = Array.isArray(result.data) 
          ? result.data 
          : (result.data?.requests || []);
        
        console.log('✅ NursePatientDetailsModal: Parsed investigation requests:', requests);
        console.log('✅ Number of requests:', requests.length);
        setInvestigationRequests(requests);
      } else {
        setRequestsError(result.error || 'Failed to fetch investigation requests');
        console.error('❌ NursePatientDetailsModal: Error fetching investigation requests:', result.error);
      }
    } catch (error) {
      setRequestsError('Failed to fetch investigation requests');
      console.error('❌ NursePatientDetailsModal: Exception fetching investigation requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  }, [patient?.id]);

  // Handle investigation success
  const handleInvestigationSuccess = (message) => {
    setSuccessModalTitle('Success!');
    setSuccessModalMessage(message);
    setIsSuccessModalOpen(true);
    fetchInvestigations(); // Refresh data
    fetchInvestigationRequests(); // Also refresh investigation requests
  };

  // Handle viewing files
  const handleViewFile = (filePath) => {
    if (filePath) {
      // For images, use modal; for others, open in new tab
      investigationService.viewFile(filePath, (dataUrl, fileName, blobUrl) => {
        // This callback is called for images
        setImageUrl(dataUrl);
        setImageFileName(fileName);
        setImageBlobUrl(blobUrl);
        setIsImageViewerOpen(true);
      });
    }
  };

  // Handle closing image viewer
  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
    // Clean up blob URL after a delay
    if (imageBlobUrl) {
      setTimeout(() => {
        URL.revokeObjectURL(imageBlobUrl);
        setImageBlobUrl(null);
      }, 1000);
    }
    setImageUrl(null);
    setImageFileName('');
  };

  // Fetch PSA history for modal
  const fetchPSAHistory = useCallback(async () => {
    if (!patient?.id) return;
    
    setLoadingPSAHistory(true);
    setPsaHistoryError(null);
    
    try {
      const result = await investigationService.getInvestigationResults(patient.id);
      
      if (result.success) {
        // Filter only PSA results and format for display
        const psaResults = result.data.results // Access the results array from the API response
          .filter(investigation => investigation.testType === 'psa')
          .map(investigation => ({
            id: investigation.id,
            date: investigation.formattedDate,
            result: `${investigation.result} ng/mL`,
            referenceRange: investigation.referenceRange,
            status: investigation.status,
            notes: investigation.notes || 'No notes',
            filePath: investigation.filePath,
            fileName: investigation.fileName
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
          
        setPsaHistory(psaResults);
      } else {
        setPsaHistoryError(result.error || 'Failed to fetch PSA history');
        setPsaHistory([]);
      }
    } catch (error) {
      console.error('Error fetching PSA history:', error);
      setPsaHistoryError('Failed to fetch PSA history');
      setPsaHistory([]);
    } finally {
      setLoadingPSAHistory(false);
    }
  }, [patient?.id]);

  // Fetch test results history for modal
  const fetchTestHistory = useCallback(async () => {
    if (!patient?.id) return;
    
    setLoadingTestHistory(true);
    setTestHistoryError(null);
    
    try {
      const result = await investigationService.getInvestigationResults(patient.id);
      
      if (result.success) {
        // Filter only non-PSA results and format for display
        const testResults = result.data.results
          .filter(investigation => investigation.testType !== 'psa')
          .map(investigation => ({
            id: investigation.id,
            date: investigation.formattedDate,
            testName: investigation.testName,
            result: investigation.result,
            referenceRange: investigation.referenceRange,
            status: investigation.status,
            notes: investigation.notes || 'No notes',
            filePath: investigation.filePath,
            fileName: investigation.fileName
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
          
        setTestHistory(testResults);
      } else {
        setTestHistoryError(result.error || 'Failed to fetch test history');
        setTestHistory([]);
      }
    } catch (error) {
      console.error('Error fetching test history:', error);
      setTestHistoryError('Failed to fetch test history');
      setTestHistory([]);
    } finally {
      setLoadingTestHistory(false);
    }
  }, [patient?.id]);

  // Fetch MDT meetings for patient
  const fetchMDTMeetings = useCallback(async () => {
    if (!patient?.id) return;
    
    setLoadingMdtMeetings(true);
    setMdtMeetingsError(null);
    
    try {
      const { patientService } = await import('../services/patientService');
      const result = await patientService.getPatientMDTMeetings(patient.id);
      
      if (result.success) {
        setMdtMeetings(result.data || []);
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

  // Fetch discharge summary for patient
  const fetchDischargeSummary = useCallback(async () => {
    if (!patient?.id) return;
    
    setLoadingDischargeSummary(true);
    setDischargeSummaryError(null);
    
    try {
      const { patientService } = await import('../services/patientService');
      const result = await patientService.getDischargeSummary(patient.id);
      
      if (result.success) {
        setDischargeSummary(result.data);
      } else {
        setDischargeSummaryError(result.error || 'Failed to fetch discharge summary');
        setDischargeSummary(null);
      }
    } catch (error) {
      console.error('Error fetching discharge summary:', error);
      setDischargeSummaryError('Failed to fetch discharge summary');
      setDischargeSummary(null);
    } finally {
      setLoadingDischargeSummary(false);
    }
  }, [patient?.id]);

  // Handle deleting investigation result
  const handleDeleteInvestigation = (resultId) => {
    setNoteToDelete(resultId);
    setIsConfirmationModalOpen(true);
  };

  // Confirm delete investigation result
  const confirmDeleteInvestigation = async () => {
    if (!noteToDelete) return;
    
    setDeletingInvestigation(noteToDelete);
    setIsConfirmationModalOpen(false);
    
    try {
      const result = await investigationService.deleteInvestigationResult(noteToDelete);
      
      if (result.success) {
        // Remove from both PSA and other test results
        setPsaResults(prev => prev.filter(result => result.id !== noteToDelete));
        setOtherTestResults(prev => prev.filter(result => result.id !== noteToDelete));
        
        // Show success message
        setSuccessModalTitle('Investigation Result Deleted!');
        setSuccessModalMessage('The investigation result has been successfully removed.');
        setIsSuccessModalOpen(true);
      } else {
        setInvestigationsError(result.error || 'Failed to delete investigation result');
        console.error('Error deleting investigation result:', result.error);
      }
    } catch (error) {
      setInvestigationsError('Failed to delete investigation result');
      console.error('Error deleting investigation result:', error);
    } finally {
      setDeletingInvestigation(null);
      setNoteToDelete(null);
    }
  };

  // Handle deleting investigation request
  const handleDeleteInvestigationRequest = async (requestId) => {
    if (!confirm('Are you sure you want to delete this investigation request? This action cannot be undone.')) {
      return;
    }
    
    setDeletingInvestigation(requestId);
    
    try {
      const result = await investigationService.deleteInvestigationRequest(requestId);
      
      if (result.success) {
        // Remove from investigation requests list
        setInvestigationRequests(prev => prev.filter(request => request.id !== requestId));
        
        // Show success message
        setSuccessModalTitle('Investigation Request Deleted!');
        setSuccessModalMessage('The investigation request has been successfully removed.');
        setIsSuccessModalOpen(true);
      } else {
        setRequestsError(result.error || 'Failed to delete investigation request');
        console.error('Error deleting investigation request:', result.error);
      }
    } catch (error) {
      setRequestsError('Failed to delete investigation request');
      console.error('Error deleting investigation request:', error);
    } finally {
      setDeletingInvestigation(null);
    }
  };

  // Handle Escape key with unsaved changes check
  const [showConfirmModal, closeConfirmModal] = useEscapeKey(onClose, isOpen, hasUnsavedChanges, handleSaveChanges);

  // Load notes and investigations when patient changes - MUST be before early return
  useEffect(() => {
    console.log('🔍 NursePatientDetailsModal: useEffect triggered, isOpen:', isOpen, 'patient:', patient);
    if (isOpen && patient?.id) {
      console.log('✅ NursePatientDetailsModal: Fetching notes and investigations for patient ID:', patient.id);
      fetchNotes();
      fetchInvestigations();
      fetchInvestigationRequests();
      fetchMDTMeetings();
      fetchDischargeSummary();
    } else {
      console.log('❌ NursePatientDetailsModal: Cannot fetch data - isOpen:', isOpen, 'patient?.id:', patient?.id);
    }
  }, [isOpen, patient?.id, fetchNotes, fetchInvestigations, fetchInvestigationRequests, fetchMDTMeetings, fetchDischargeSummary]);

  if (!isOpen || !patient) return null;

  // Latest PSA result - conditional based on patient category
  const latestPSA = (() => {
    // For new patients, use patient data or dummy data
    if (patient?.category === 'new') {
      return patient?.vitals?.latestPSA && patient.vitals.latestPSA !== '-' ? {
        id: 1,
        date: patient.vitals.psaDate || 'N/A',
        result: patient.vitals.latestPSA,
        referenceRange: '0.0 - 4.0 ng/mL',
        status: 'Available',
        statusColor: 'blue',
        notes: 'Latest PSA result from patient data.'
      } : {
        id: 1,
        date: '2024-08-01',
        result: '3.2 ng/mL',
        referenceRange: '0.0 - 4.0 ng/mL',
        status: 'Normal',
        statusColor: 'green',
        notes: 'Initial PSA screening result.'
      };
    }
    
    // For existing patients, use patient data or default
    return patient?.vitals?.latestPSA && patient.vitals.latestPSA !== '-' ? {
      id: 1,
      date: patient.vitals.psaDate || 'N/A',
      result: patient.vitals.latestPSA,
      referenceRange: '0.0 - 4.0 ng/mL',
      status: 'Available',
      statusColor: 'blue',
      notes: 'Latest PSA result from patient data.'
    } : {
      id: 1,
      date: '2024-09-05',
      result: '4.2 ng/mL',
      referenceRange: '0.0 - 4.0 ng/mL',
      status: 'Elevated',
      statusColor: 'red',
      notes: 'Slightly elevated PSA level. Recommend follow-up in 3 months.'
    };
  })();

  // Note: Dummy test data removed - all test results are now fetched from API
  // PSA results are stored in psaResults state
  // Other test results are stored in otherTestResults state
  // Investigation requests are stored in investigationRequests state

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
    console.log('Viewing report for:', test.testName);
    // In a real app, this would open a report viewer or modal
    setSuccessModalTitle('View Report');
    setSuccessModalMessage(`Opening report for ${test.testName}...`);
    setIsSuccessModalOpen(true);
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
                <h2 className="text-2xl font-bold">{patient.patientName || patient.fullName || patient.name || 'Unknown Patient'}</h2>
                <div className="text-right">
                  <div className="text-sm font-medium text-teal-800">Referred by</div>
                  <div className="text-sm text-teal-700">{patient.referringDepartment || patient.referringDoctor || 'Not Specified'}</div>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-teal-700">
                <span>{patient.age || '0'}, {patient.gender || 'Unknown'}</span>
                <span>UPI: {patient.upi || 'Unknown'}</span>
                <span>Phone: {patient.phone || patient.phoneNumber || 'Unknown'}</span>
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
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading notes...</span>
                      </div>
                    </div>
                  ) : notesError ? (
                    <div className="text-center py-8">
                      <div className="text-red-600 text-sm mb-2">{notesError}</div>
                      <button
                        onClick={fetchNotes}
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : clinicalNotes.length > 0 ? (
                    <div className="space-y-6">
                      {clinicalNotes.map((note, index) => (
                        <div key={note.id} className="flex gap-4">
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                              <IoDocumentText className="text-teal-600" />
                            </div>
                            {index < clinicalNotes.length - 1 && (
                              <div className="w-0.5 h-16 bg-teal-100 mt-2"></div>
                            )}
                          </div>
                          
                          {/* Note content */}
                          <div className="flex-1 pb-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                                    {note.authorRole || 'Staff'}
                                  </span>
                                </div>
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
                              
                              {/* Content */}
                              <div className="mb-4">
                                {renderPathwayTransferNote(note.content || 'No content available')}
                              </div>
                              
                              {/* Author and Actions */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  {getDesignationIcon(note.authorRole)}
                                  <span className="text-sm font-medium text-gray-900">{note.authorName || 'Unknown'}</span>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-500">{note.authorRole || 'Staff'}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  disabled={deletingNote === note.id}
                                  className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete note"
                                >
                                  {deletingNote === note.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                  ) : (
                                    <Trash className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
                        onClick={() => {
                          setIsPSAHistoryModalOpen(true);
                          fetchPSAHistory();
                        }}
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
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                          <span className="text-gray-600 text-sm">Loading PSA results...</span>
                        </div>
                      </div>
                    ) : investigationsError ? (
                      <div className="text-center py-8">
                        <div className="text-red-600 text-sm mb-2">{investigationsError}</div>
                        <button
                          onClick={fetchInvestigations}
                          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : psaResults.length > 0 ? (
                      <div className="space-y-4">
                        {psaResults.map((psa) => (
                          <div key={psa.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900">{psa.testName}</h4>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(psa.status)}`}>
                                    {psa.status}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                  Date: {psa.formattedDate}
                                </div>
                              </div>
                              <button 
                                onClick={() => psa.filePath ? handleViewFile(psa.filePath) : handleViewReport(psa)}
                                className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                              >
                                {psa.filePath ? 'View File' : 'View'}
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 mb-3">
                              <div>
                                <span className="text-sm font-medium text-gray-700">Result:</span>
                                <span className="ml-2 text-sm text-gray-900">{psa.result} ng/mL</span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-700">Reference Range:</span>
                                <span className="ml-2 text-sm text-gray-600">{psa.referenceRange}</span>
                              </div>
                            </div>
                            
                            {psa.notes && (
                              <div className="pt-3 border-t border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-700">Notes:</span>
                                    <p className="text-sm text-gray-600 mt-1">{psa.notes}</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteInvestigation(psa.id)}
                                    disabled={deletingInvestigation === psa.id}
                                    className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed ml-2 flex-shrink-0"
                                    title="Delete PSA result"
                                  >
                                    {deletingInvestigation === psa.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                    ) : (
                                      <Trash className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {!psa.notes && (
                              <div className="pt-3 border-t border-gray-200 flex justify-end">
                                <button
                                  onClick={() => handleDeleteInvestigation(psa.id)}
                                  disabled={deletingInvestigation === psa.id}
                                  className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete PSA result"
                                >
                                  {deletingInvestigation === psa.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                  ) : (
                                    <Trash className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                          <IoAnalytics className="text-xl text-gray-400" />
                        </div>
                        <h4 className="text-base font-medium text-gray-900 mb-1">No PSA Results</h4>
                        <p className="text-gray-500 text-sm">No PSA results have been recorded for this patient yet.</p>
                        <button
                          onClick={() => setIsAddPSAModalOpen(true)}
                          className="mt-3 px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                        >
                          Add First PSA Result
                        </button>
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
                        onClick={() => {
                          setIsOtherTestsHistoryModalOpen(true);
                          fetchTestHistory();
                        }}
                        className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium"
                      >
                        View History
                      </button>
                    </div>
                  </div>
                </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                    {(loadingInvestigations || loadingRequests) ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="text-gray-600 text-sm">Loading...</span>
                        </div>
                      </div>
                    ) : (investigationsError || requestsError) ? (
                      <div className="text-center py-8">
                        <div className="text-red-600 text-sm mb-2">{investigationsError || requestsError}</div>
                        <button
                          onClick={() => {
                            fetchInvestigations();
                            fetchInvestigationRequests();
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : otherTestResults.length > 0 ? (
                      <div className="space-y-4">
                        {/* Only Show Completed Test Results - Pending investigations and NO_SHOW entries are excluded */}
                        {otherTestResults.map((test) => (
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
                                  Date: {test.formattedDate}
                                </div>
                              </div>
                              <button 
                                onClick={() => test.filePath ? handleViewFile(test.filePath) : handleViewReport(test)}
                                className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                              >
                                {test.filePath ? 'View File' : 'View'}
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 mb-3">
                              {test.result && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Result:</span>
                                  <span className="ml-2 text-sm text-gray-900">{test.result}</span>
                                </div>
                              )}
                              {test.referenceRange && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Reference Range:</span>
                                  <span className="ml-2 text-sm text-gray-600">{test.referenceRange}</span>
                                </div>
                              )}
                              {test.fileName && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">File:</span>
                                  <span className="ml-2 text-sm text-blue-600">{test.fileName}</span>
                                </div>
                              )}
                            </div>
                            
                            {test.notes && (
                              <div className="pt-3 border-t border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-700">Notes:</span>
                                    <p className="text-sm text-gray-600 mt-1">{test.notes}</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteInvestigation(test.id)}
                                    disabled={deletingInvestigation === test.id}
                                    className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed ml-2 flex-shrink-0"
                                    title="Delete test result"
                                  >
                                    {deletingInvestigation === test.id ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                    ) : (
                                      <Trash className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {!test.notes && (
                              <div className="pt-3 border-t border-gray-200 flex justify-end">
                                <button
                                  onClick={() => handleDeleteInvestigation(test.id)}
                                  disabled={deletingInvestigation === test.id}
                                  className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Delete test result"
                                >
                                  {deletingInvestigation === test.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                  ) : (
                                    <Trash className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                              </div>
                            ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                          <IoDocument className="text-xl text-gray-400" />
                        </div>
                        <h4 className="text-base font-medium text-gray-900 mb-1">No Test Results</h4>
                        <p className="text-gray-500 text-sm">No completed test results have been recorded yet.</p>
                        <button
                          onClick={() => setIsAddTestModalOpen(true)}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add Test Result
                        </button>
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
                    {loadingMdtMeetings ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
                        <p className="text-gray-600 text-sm">Loading MDT meetings...</p>
                      </div>
                    ) : mdtMeetingsError ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                          <IoAlertCircle className="text-2xl text-red-600" />
                        </div>
                        <h4 className="text-base font-medium text-gray-900 mb-1">Error Loading MDT Meetings</h4>
                        <p className="text-red-600 text-sm mb-3">{mdtMeetingsError}</p>
                        <button
                          onClick={fetchMDTMeetings}
                          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : mdtMeetings.length > 0 ? (
                      mdtMeetings.map((note, index) => (
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
                {loadingDischargeSummary ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
                    <p className="text-gray-600 text-base">Loading discharge summary...</p>
                  </div>
                ) : dischargeSummaryError ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                      <IoAlertCircle className="text-3xl text-red-600" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Error Loading Discharge Summary</h4>
                    <p className="text-red-600 text-sm mb-4">{dischargeSummaryError}</p>
                    <button
                      onClick={fetchDischargeSummary}
                      className="px-6 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : !dischargeSummary ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <IoDocumentText className="text-3xl text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Discharge Summary Available</h4>
                    <p className="text-gray-500 text-sm">No discharge summary has been created for this patient yet.</p>
                  </div>
                ) : (
                  <>
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
                </>
                )}
              </div>
            </div>
          )}
        </div>

      </div>


      {/* Success Modal */}
      <SuccessModal 
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title={successModalTitle}
        message={successModalMessage}
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
                  <p className="text-teal-100 mt-1">PSA monitoring history for {patient.patientName || patient.name}</p>
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
                    {loadingPSAHistory ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        <span className="ml-3 text-gray-600">Loading chart data...</span>
                      </div>
                    ) : psaHistoryError ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <IoAlertCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Unable to load chart data</p>
                        </div>
                      </div>
                    ) : psaHistory.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <IoDocument className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">No data available for chart</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-full">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
                          {(() => {
                            if (psaHistory.length === 0) {
                              return [10, 8, 6, 4, 2, 0].map(val => <span key={val}>{val}</span>);
                            }
                            
                            const chartData = psaHistory.slice(0, 5).reverse();
                            const maxValue = Math.max(...chartData.map(d => parseFloat(d.result.replace(' ng/mL', ''))));
                            const minValue = Math.min(...chartData.map(d => parseFloat(d.result.replace(' ng/mL', ''))));
                            const range = maxValue - minValue || 1;
                            
                            // Generate 6 Y-axis labels based on actual data range
                            const labels = [];
                            for (let i = 5; i >= 0; i--) {
                              const value = minValue + (range * i / 5);
                              labels.push(
                                <span key={i}>{value.toFixed(1)}</span>
                              );
                            }
                            return labels;
                          })()}
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
                            <svg className="w-full h-full">
                              {(() => {
                                if (psaHistory.length === 0) return null;
                                
                                // Get the last 5 PSA results for the chart
                                const chartData = psaHistory.slice(0, 5).reverse();
                                const maxValue = Math.max(...chartData.map(d => parseFloat(d.result.replace(' ng/mL', ''))));
                                const minValue = Math.min(...chartData.map(d => parseFloat(d.result.replace(' ng/mL', ''))));
                                const range = maxValue - minValue || 1;
                                
                                // Ensure we have at least 2 points for a proper line
                                if (chartData.length < 2) {
                                  // For single point, create a small range around it
                                  const singleValue = parseFloat(chartData[0].result.replace(' ng/mL', ''));
                                  const adjustedMin = Math.max(0, singleValue - 1);
                                  const adjustedMax = singleValue + 1;
                                  const adjustedRange = adjustedMax - adjustedMin;
                                  
                                  // Calculate points for single data point
                                  const points = `${20},${100}`; // Center point
                                  const circles = [{ cx: 20, cy: 100, value: singleValue }];
                                  
                                  return (
                                    <>
                                      {/* Single point circle */}
                                      <circle 
                                        cx="20" 
                                        cy="100" 
                                        r="6" 
                                        fill="#0d9488"
                                        className="hover:fill-teal-700 cursor-pointer"
                                        title={`${chartData[0].date}: ${singleValue} ng/mL`}
                                      />
                                    </>
                                  );
                                }
                                
                                // Calculate points
                                const points = chartData.map((psa, index) => {
                                  const value = parseFloat(psa.result.replace(' ng/mL', ''));
                                  const x = (index / (chartData.length - 1)) * 200 + 20; // 20px margin
                                  const y = 200 - ((value - minValue) / range) * 160; // 200px height - 40px margin
                                  return `${x},${y}`;
                                }).join(' ');
                                
                                // Calculate circle positions
                                const circles = chartData.map((psa, index) => {
                                  const value = parseFloat(psa.result.replace(' ng/mL', ''));
                                  const x = (index / (chartData.length - 1)) * 200 + 20;
                                  const y = 200 - ((value - minValue) / range) * 160;
                                  return { cx: x, cy: y, value: value };
                                });
                                
                                return (
                                  <>
                                    {/* Line connecting points */}
                                    <polyline
                                      fill="none"
                                      stroke="#0d9488"
                                      strokeWidth="2"
                                      points={points}
                                    />
                                    {/* Data points */}
                                    {circles.map((circle, index) => (
                                      <circle 
                                        key={index}
                                        cx={circle.cx} 
                                        cy={circle.cy} 
                                        r="4" 
                                        fill="#0d9488"
                                        className="hover:fill-teal-700 cursor-pointer"
                                        title={`${chartData[index].date}: ${circle.value} ng/mL`}
                                      />
                                    ))}
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                          
                          {/* X-axis labels */}
                          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                            {psaHistory.slice(0, 5).reverse().map((psa, index) => (
                              <span key={index} className="text-center">
                                {new Date(psa.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PSA Test History Table */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">PSA Test History</h3>
                  <div className="overflow-x-auto">
                    {loadingPSAHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                        <span className="ml-3 text-gray-600">Loading PSA history...</span>
                      </div>
                    ) : psaHistoryError ? (
                      <div className="text-center py-8">
                        <div className="text-red-500 mb-2">
                          <IoAlertCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">{psaHistoryError}</p>
                        </div>
                        <button
                          onClick={fetchPSAHistory}
                          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm"
                        >
                          Retry
                        </button>
                      </div>
                    ) : psaHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-2">
                          <IoDocument className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">No PSA results found</p>
                        </div>
                      </div>
                    ) : (
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
                              <td className="py-3 px-4 text-sm text-gray-600">{psa.notes}</td>
                              <td className="py-3 px-4">
                                <button 
                                  onClick={() => psa.filePath ? handleViewFile(psa.filePath) : handleViewReport(psa)}
                                  className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                                >
                                  {psa.filePath ? 'View File' : 'View'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
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
              <p className="text-teal-100 mt-1">for {patient.patientName || patient.name}</p>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingTestHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <span className="ml-3 text-gray-600">Loading test history...</span>
                </div>
              ) : testHistoryError ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-2">
                    <IoAlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">{testHistoryError}</p>
                  </div>
                  <button
                    onClick={fetchTestHistory}
                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : testHistory.length > 0 ? (
                <div className="space-y-6">
                  {/* Group tests by date */}
                {(() => {
                  // Group tests by date
                  const groupedTests = testHistory.reduce((groups, test) => {
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
              ) : (
                /* Empty State for No Test Results */
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <IoDocument className="text-3xl text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Test Results Available</h3>
                  <p className="text-center text-gray-500 max-w-md">
                    No other test results have been recorded for this patient yet. 
                    Test results will appear here once they are added to the patient's record.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MDT Scheduling Modal */}
      <MDTSchedulingModal
        isOpen={isMDTSchedulingModalOpen}
        onClose={() => setIsMDTSchedulingModalOpen(false)}
        onScheduled={(mdtData) => {
          console.log('MDT Scheduled:', mdtData);
          // Handle successful MDT scheduling
        }}
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
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title={successModalTitle}
        message={successModalMessage}
      />

      {/* Pathway Transfer Confirmation Modal - REMOVED FOR NURSE VERSION */}
      {false && (
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
                    <p className="text-sm font-semibold text-gray-900">{patient.patientName || patient.name}</p>
                    <p className="text-xs text-gray-600">ID: {patient.patientId || patient.upi}</p>
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

              {/* Default content for other pathways */}
              {selectedPathway !== 'Medication' && 
               selectedPathway !== 'Discharge' && 
               selectedPathway !== 'Surgery Pathway' && 
               selectedPathway !== 'Radiotherapy' && 
               selectedPathway !== 'Post-op Transfer' && (
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
                  {selectedPathway === 'Active Monitoring' && (
                    <div className="mb-6">
                      <div className="bg-white border border-gray-200 rounded p-4">
                        <div className="flex items-center mb-4">
                          <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center mr-3">
                            <IoCalendar className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-gray-900">Schedule Follow-up</h4>
                            <p className="text-sm text-gray-600">Required for Active Monitoring</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Date *
                            </label>
                            <input
                              type="date"
                              value={appointmentBooking.appointmentDate}
                              onChange={(e) => setAppointmentBooking(prev => ({ ...prev, appointmentDate: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Time *
                            </label>
                            <input
                              type="time"
                              value={appointmentBooking.appointmentTime}
                              onChange={(e) => setAppointmentBooking(prev => ({ ...prev, appointmentTime: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Check-up Frequency *
                          </label>
                          <select
                            value={recurringAppointments.interval}
                            onChange={(e) => setRecurringAppointments(prev => ({ ...prev, interval: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                            required
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
                  }}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Validation
                    if (selectedPathway === 'Medication') {
                      const hasValidMedications = medicationDetails.medications.every(med => 
                        med.name.trim() && med.dosage.trim() && med.frequency.trim()
                      );
                      if (!hasValidMedications) {
                        alert('Please fill in all required medication fields');
                        return;
                      }
                      setIsDischargeSummaryModalOpen(true);
                      setIsPathwayModalOpen(false);
                    } else if (selectedPathway === 'Discharge') {
                      if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                        alert('Please provide discharge reason and clinical summary');
                        return;
                      }
                      setIsDischargeSummaryModalOpen(true);
                      setIsPathwayModalOpen(false);
                    } else if (selectedPathway === 'Surgery Pathway') {
                      if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                        alert('Please provide reason and clinical rationale for surgery pathway');
                        return;
                      }
                      setSuccessModalTitle('Transfer Successful');
                      setSuccessModalMessage(`Patient successfully transferred to ${selectedPathway}`);
                      setIsPathwayModalOpen(false);
                      setIsSuccessModalOpen(true);
                    } else if (selectedPathway === 'Radiotherapy') {
                      if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                        alert('Please provide reason and clinical rationale for radiotherapy');
                        return;
                      }
                      setSuccessModalTitle('Transfer Successful');
                      setSuccessModalMessage(`Patient successfully transferred to ${selectedPathway}`);
                      setIsPathwayModalOpen(false);
                      setIsSuccessModalOpen(true);
                    } else if (selectedPathway === 'Post-op Transfer') {
                      if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                        alert('Please provide reason and post-operative notes');
                        return;
                      }
                      setSuccessModalTitle('Transfer Successful');
                      setSuccessModalMessage(`Patient successfully transferred to ${selectedPathway}`);
                      setIsPathwayModalOpen(false);
                      setIsSuccessModalOpen(true);
                    } else if (selectedPathway === 'Active Monitoring') {
                      if (!transferDetails.reason || !transferDetails.clinicalRationale.trim() || 
                          !appointmentBooking.appointmentDate || !appointmentBooking.appointmentTime) {
                        alert('Please fill in all required fields');
                        return;
                      }
                      setSuccessModalTitle('Transfer Successful');
                      setSuccessModalMessage(`Patient successfully transferred to ${selectedPathway}`);
                      setIsPathwayModalOpen(false);
                      setIsSuccessModalOpen(true);
                    } else {
                      if (!transferDetails.reason || !transferDetails.clinicalRationale.trim()) {
                        alert('Please provide reason and clinical rationale');
                        return;
                      }
                      setSuccessModalTitle('Transfer Successful');
                      setSuccessModalMessage(`Patient successfully transferred to ${selectedPathway}`);
                      setIsPathwayModalOpen(false);
                      setIsSuccessModalOpen(true);
                    }
                    
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
                              : selectedPathway === 'Active Monitoring'
                                ? !transferDetails.reason || !transferDetails.clinicalRationale.trim() || 
                                  !appointmentBooking.appointmentDate || !appointmentBooking.appointmentTime
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

      {/* Discharge Summary Modal - REMOVED FOR NURSE VERSION */}
      {false && (
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
                        <span className="font-medium">Name:</span> {patient.patientName || patient.name}
                      </div>
                      <div>
                        <span className="font-medium">ID:</span> {patient.patientId || patient.upi}
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
    
    {/* Confirmation Modal */}
    <ConfirmModal
      isOpen={showConfirmModal}
      onConfirm={closeConfirmModal}
      onCancel={() => closeConfirmModal(false)}
      title="Unsaved Changes"
      message="You have unsaved changes. Do you want to save before closing?"
    />

    {/* Delete Confirmation Modal */}
    <ConfirmationModal
      isOpen={isConfirmationModalOpen}
      onClose={cancelDeleteNote}
      onConfirm={deletingNote !== null ? confirmDeleteNote : confirmDeleteInvestigation}
      title={deletingNote !== null ? "Delete Clinical Note" : "Delete Investigation Result"}
      message={deletingNote !== null 
        ? "Are you sure you want to delete this clinical note? This action cannot be undone."
        : "Are you sure you want to delete this investigation result? This action cannot be undone."
      }
      confirmText={deletingNote !== null ? "Delete Note" : "Delete Result"}
      cancelText="Cancel"
      type="danger"
      isLoading={deletingNote !== null || deletingInvestigation !== null}
    />

    {/* Image Viewer Modal */}
    <ImageViewerModal
      isOpen={isImageViewerOpen}
      onClose={handleCloseImageViewer}
      imageUrl={imageUrl}
      fileName={imageFileName}
      blobUrl={imageBlobUrl}
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
    </>
  );
};

export default NursePatientDetailsModal;