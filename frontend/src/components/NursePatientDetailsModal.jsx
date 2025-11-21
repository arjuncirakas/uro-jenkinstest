import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoTimeSharp, IoMedical, IoCheckmarkCircle, IoDocumentText, IoAnalytics, IoDocument, IoHeart, IoCheckmark, IoAlertCircle, IoCalendar } from 'react-icons/io5';
import { FaNotesMedical, FaUserMd, FaUserNurse, FaFileMedical, FaFlask, FaPills, FaStethoscope } from 'react-icons/fa';
import { BsClockHistory } from 'react-icons/bs';
import { Plus, Upload, Eye, Download, Trash, Edit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import SuccessModal from './SuccessModal';
import ConfirmationModal from './modals/ConfirmationModal';
import AddPSAResultModal from './modals/AddPSAResultModal';
import EditPSAResultModal from './modals/EditPSAResultModal';
import AddTestResultModal from './modals/AddTestResultModal';
import MDTSchedulingModal from './MDTSchedulingModal';
import AddClinicalInvestigationModal from './AddClinicalInvestigationModal';
import ImageViewerModal from './ImageViewerModal';
import EditSurgeryAppointmentModal from './EditSurgeryAppointmentModal';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { notesService } from '../services/notesService';
import { investigationService } from '../services/investigationService';
import { bookingService } from '../services/bookingService';
import { patientService } from '../services/patientService';
import EditPatientModal from './EditPatientModal';

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
  
  // Full patient data state
  const [fullPatientData, setFullPatientData] = useState(null);
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Notes API state
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
  
  // Confirmation modal state
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'note' or 'investigation'
  
  // Investigation modals state
  const [isAddPSAModalOpen, setIsAddPSAModalOpen] = useState(false);
  const [isEditPSAModalOpen, setIsEditPSAModalOpen] = useState(false);
  const [selectedPSAResult, setSelectedPSAResult] = useState(null);
  const [isAddTestModalOpen, setIsAddTestModalOpen] = useState(false);
  
  // Edit Surgery Appointment Modal state
  const [isEditSurgeryAppointmentModalOpen, setIsEditSurgeryAppointmentModalOpen] = useState(false);
  const [selectedSurgeryAppointment, setSelectedSurgeryAppointment] = useState(null);
  
  // Image viewer modal state
  const [isImageViewerModalOpen, setIsImageViewerModalOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState(null);
  const [imageViewerFileName, setImageViewerFileName] = useState(null);
  const [imageViewerBlobUrl, setImageViewerBlobUrl] = useState(null);
  
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
        const invTypeValue = trimmedLine.replace('Investigation Type:', '').trim();
        // Handle comma-separated investigation types (for multi-select)
        data.investigationType = invTypeValue;
        data.investigationTypes = invTypeValue.includes(',') 
          ? invTypeValue.split(',').map(t => t.trim()).filter(t => t)
          : [invTypeValue];
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
        {/* Investigation Type and Test Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Investigation Type</div>
            {data.investigationTypes && data.investigationTypes.length > 1 ? (
              <div className="space-y-1">
                {data.investigationTypes.map((type, index) => (
                  <div key={index} className="text-base font-semibold text-gray-900">
                    • {type}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-base font-semibold text-gray-900">{data.investigationType || 'Not specified'}</div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Test/Procedure Name</div>
            {data.testNamesByType ? (
              // Display tests grouped by investigation type
              <div className="space-y-2">
                {Object.entries(data.testNamesByType).map(([type, tests]) => (
                  <div key={type}>
                    {data.investigationTypes && data.investigationTypes.length > 1 && (
                      <div className="text-xs font-semibold text-gray-600 mb-1">{type}:</div>
                    )}
                    <div className="space-y-1 ml-2">
                      {tests.map((test, index) => (
                        <div key={index} className="text-base text-gray-900">
                          • {test}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : data.testNames && data.testNames.length > 1 ? (
              <div className="space-y-1">
                {data.testNames.map((test, index) => (
                  <div key={index} className="text-base text-gray-900">
                    • {test}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-base text-gray-900">{data.testName || 'Not specified'}</div>
            )}
          </div>
        </div>

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

  // Fetch full patient details
  const fetchFullPatientData = useCallback(async () => {
    if (!patient?.id) {
      console.log('❌ NursePatientDetailsModal: No patient ID, cannot fetch full details');
      return;
    }
    
    try {
      setLoadingPatientData(true);
      console.log('🔍 NursePatientDetailsModal: Fetching full patient details for ID:', patient.id);
      const result = await patientService.getPatientById(patient.id);
      
      if (result.success && result.data) {
        console.log('✅ NursePatientDetailsModal: Fetched full patient details:', result.data);
        setFullPatientData(result.data);
      } else {
        console.error('❌ NursePatientDetailsModal: Failed to fetch patient details:', result.error);
      }
    } catch (error) {
      console.error('❌ NursePatientDetailsModal: Error fetching patient details:', error);
    } finally {
      setLoadingPatientData(false);
    }
  }, [patient?.id]);

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
          
          return true;
        });
        
        console.log('✅ NursePatientDetailsModal: Processed notes:', filteredNotes);
        setClinicalNotes(filteredNotes);
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
    setDeleteType('note');
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
        // Show error in modal
        setSuccessModalTitle('Cannot Delete Note');
        setSuccessModalMessage(result.error || result.message || 'Failed to delete note');
        setIsSuccessModalOpen(true);
        console.error('Error deleting note:', result.error);
      }
    } catch (error) {
      // Show error in modal
      setSuccessModalTitle('Error');
      setSuccessModalMessage(error.response?.data?.message || error.message || 'Failed to delete note');
      setIsSuccessModalOpen(true);
      console.error('Error deleting note:', error);
    } finally {
      setDeletingNote(null);
      setNoteToDelete(null);
      setDeleteType(null);
    }
  };

  // Cancel delete
  const cancelDeleteNote = () => {
    setIsConfirmationModalOpen(false);
    setNoteToDelete(null);
    setDeleteType(null);
  };

  // Handle edit note
  const handleEditNote = (note) => {
    setEditingNote(note);
    setEditNoteContent(note.content || '');
    setIsEditNoteModalOpen(true);
  };

  // Handle update note
  const handleUpdateNote = async () => {
    if (!editingNote || !editNoteContent.trim()) {
      setNotesError('Note content is required');
      return;
    }

    setSavingNote(true);
    setNotesError(null);

    try {
      const result = await notesService.updateNote(editingNote.id, {
        content: editNoteContent.trim()
      });

      if (result.success) {
        // Update the note in the list
        setClinicalNotes(prev => prev.map(note => 
          note.id === editingNote.id 
            ? { ...note, content: editNoteContent.trim(), updatedAt: result.data.updatedAt }
            : note
        ));

        // Close modal and reset state
        setIsEditNoteModalOpen(false);
        setEditingNote(null);
        setEditNoteContent('');

        // Show success message
        setSuccessModalTitle('Note Updated Successfully!');
        setSuccessModalMessage('The clinical note has been updated in the patient timeline.');
        setIsSuccessModalOpen(true);
      } else {
        setNotesError(result.error || 'Failed to update note');
        console.error('Error updating note:', result.error);
      }
    } catch (error) {
      setNotesError('Failed to update note');
      console.error('Error updating note:', error);
    } finally {
      setSavingNote(false);
    }
  };

  // Cancel edit
  const cancelEditNote = () => {
    setIsEditNoteModalOpen(false);
    setEditingNote(null);
    setEditNoteContent('');
    setNotesError(null);
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
        
        // Normalize results to ensure consistent property names
        const normalizeResult = (result) => ({
          ...result,
          filePath: (result.filePath || result.file_path || '').trim() || null,
          fileName: (result.fileName || result.file_name || '').trim() || null,
          testType: result.testType || result.test_type || null,
          testName: result.testName || result.test_name || null,
          formattedDate: result.formattedDate || (result.testDate ? new Date(result.testDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }) : null),
          referenceRange: result.referenceRange || result.reference_range || null
        });
        
        // Filter PSA results and normalize
        const psaResults = results
          .filter(result => {
            const testType = result.testType || result.test_type || '';
            return testType.toLowerCase() === 'psa';
          })
          .map(normalizeResult);
        setPsaResults(psaResults);
        
        // Filter non-PSA results and normalize
        const otherResults = results
          .filter(result => {
            const testType = result.testType || result.test_type || '';
            return testType.toLowerCase() !== 'psa';
          })
          .map(normalizeResult);
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
      investigationService.viewFile(filePath);
    }
  };

  // Fetch PSA history for modal
  const fetchPSAHistory = useCallback(async () => {
    if (!patient?.id) return;
    
    setLoadingPSAHistory(true);
    setPsaHistoryError(null);
    
    try {
      const result = await investigationService.getInvestigationResults(patient.id);
      
      if (result.success) {
        // Handle different response structures
        const results = Array.isArray(result.data) 
          ? result.data 
          : (result.data.results || result.data.investigations || []);
        
        // Filter only PSA results and format for display
        const psaResults = results
          .filter(investigation => {
            const testType = investigation.testType || investigation.test_type || '';
            return testType.toLowerCase() === 'psa';
          })
          .map(investigation => {
            // Get original date for sorting and charting
            const originalDate = investigation.testDate || investigation.test_date;
            const dateObj = originalDate ? new Date(originalDate) : new Date();
            
            // Get the raw result value from API (e.g., "9", "5", "8")
            const resultValue = investigation.result || '';
            
            // Parse the numeric value directly from the API response
            // The API returns result as a string like "9", "5", "8"
            let numericValue = 0;
            if (typeof resultValue === 'number') {
              numericValue = resultValue;
            } else if (typeof resultValue === 'string') {
              // Remove any "ng/mL" text and parse
              const cleaned = resultValue.replace(/ ng\/mL/gi, '').trim();
              numericValue = parseFloat(cleaned) || 0;
            }
            
            // Format for display
            const formattedResult = resultValue.toString().includes('ng/mL') 
              ? resultValue 
              : `${resultValue} ng/mL`;
            
            return {
              id: investigation.id,
              date: investigation.formattedDate || (originalDate ? dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              }) : ''),
              dateObj: dateObj, // Store date object for proper sorting and charting
              result: formattedResult, // Display format
              numericValue: numericValue, // Store the numeric value directly from API
              referenceRange: investigation.referenceRange || investigation.reference_range || '',
              status: investigation.status,
              notes: investigation.notes || 'No notes',
              filePath: (investigation.filePath || investigation.file_path || '').trim() || null,
              fileName: (investigation.fileName || investigation.file_name || '').trim() || null,
              isInitialPSA: investigation.isInitialPSA || false
            };
          })
          .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()); // Sort by date descending
          
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
        // Handle different response structures
        const results = Array.isArray(result.data) 
          ? result.data 
          : (result.data.results || result.data.investigations || []);
        
        // Filter only non-PSA results and format for display
        const testResults = results
          .filter(investigation => {
            const testType = investigation.testType || investigation.test_type || '';
            return testType.toLowerCase() !== 'psa';
          })
          .map(investigation => ({
            id: investigation.id,
            date: investigation.formattedDate || (investigation.testDate ? new Date(investigation.testDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }) : ''),
            testName: investigation.testName || investigation.test_name || '',
            result: investigation.result,
            referenceRange: investigation.referenceRange || investigation.reference_range || '',
            status: investigation.status,
            notes: investigation.notes || 'No notes',
            filePath: investigation.filePath || investigation.file_path || null,
            fileName: investigation.fileName || investigation.file_name || null
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
      
      if (result.success && result.data) {
        // Parse JSON fields if they are strings (PostgreSQL JSON fields might be strings)
        const summary = { ...result.data };
        
        // Parse JSON fields if needed
        if (typeof summary.diagnosis === 'string') {
          try {
            summary.diagnosis = JSON.parse(summary.diagnosis);
          } catch (e) {
            console.warn('Failed to parse diagnosis JSON:', e);
          }
        }
        // Normalize diagnosis structure - ensure secondary is an array
        if (summary.diagnosis) {
          if (!summary.diagnosis.primary) summary.diagnosis.primary = '';
          if (!summary.diagnosis.secondary) {
            summary.diagnosis.secondary = [];
          } else if (typeof summary.diagnosis.secondary === 'string') {
            // If secondary is a string, try to parse it or convert to array
            try {
              const parsed = JSON.parse(summary.diagnosis.secondary);
              summary.diagnosis.secondary = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              // If it's just a string, convert to array
              summary.diagnosis.secondary = summary.diagnosis.secondary ? [summary.diagnosis.secondary] : [];
            }
          } else if (!Array.isArray(summary.diagnosis.secondary)) {
            // If it's not an array, convert to array
            summary.diagnosis.secondary = summary.diagnosis.secondary ? [summary.diagnosis.secondary] : [];
          }
        }
        
        if (typeof summary.procedure === 'string') {
          try {
            summary.procedure = JSON.parse(summary.procedure);
          } catch (e) {
            console.warn('Failed to parse procedure JSON:', e);
          }
        }
        // Normalize procedure structure
        if (summary.procedure) {
          if (!summary.procedure.name) summary.procedure.name = '';
          if (!summary.procedure.date) summary.procedure.date = '';
          if (!summary.procedure.surgeon) summary.procedure.surgeon = '';
          if (!summary.procedure.findings) summary.procedure.findings = '';
        }
        
        if (typeof summary.investigations === 'string') {
          try {
            summary.investigations = JSON.parse(summary.investigations);
          } catch (e) {
            console.warn('Failed to parse investigations JSON:', e);
          }
        }
        // Ensure investigations is an array
        if (!Array.isArray(summary.investigations)) {
          summary.investigations = summary.investigations ? [summary.investigations] : [];
        }
        
        if (typeof summary.medications === 'string') {
          try {
            summary.medications = JSON.parse(summary.medications);
          } catch (e) {
            console.warn('Failed to parse medications JSON:', e);
          }
        }
        // Normalize medications structure
        if (summary.medications) {
          if (!summary.medications.discharged) {
            // Check if it's the old format (discharge, changes, instructions)
            if (summary.medications.discharge) {
              summary.medications.discharged = [];
            } else {
              summary.medications.discharged = Array.isArray(summary.medications.discharged) 
                ? summary.medications.discharged 
                : [];
            }
          } else if (!Array.isArray(summary.medications.discharged)) {
            summary.medications.discharged = [];
          }
          if (!summary.medications.stopped) {
            summary.medications.stopped = [];
          } else if (!Array.isArray(summary.medications.stopped)) {
            summary.medications.stopped = [];
          }
        }
        
        if (typeof summary.followUp === 'string') {
          try {
            summary.followUp = JSON.parse(summary.followUp);
          } catch (e) {
            console.warn('Failed to parse followUp JSON:', e);
          }
        }
        // Normalize followUp structure
        if (summary.followUp) {
          if (!summary.followUp.catheterRemoval) {
            summary.followUp.catheterRemoval = { date: '', location: '', instructions: '' };
          }
          if (!summary.followUp.postOpReview) {
            summary.followUp.postOpReview = { date: '', location: '', instructions: '' };
          }
          if (!summary.followUp.additionalInstructions) {
            summary.followUp.additionalInstructions = [];
          } else if (!Array.isArray(summary.followUp.additionalInstructions)) {
            summary.followUp.additionalInstructions = [summary.followUp.additionalInstructions];
          }
        }
        
        if (typeof summary.gpActions === 'string') {
          try {
            summary.gpActions = JSON.parse(summary.gpActions);
          } catch (e) {
            console.warn('Failed to parse gpActions JSON:', e);
          }
        }
        // Ensure gpActions is an array
        if (!Array.isArray(summary.gpActions)) {
          summary.gpActions = summary.gpActions ? [summary.gpActions] : [];
        }
        
        if (typeof summary.documents === 'string') {
          try {
            summary.documents = JSON.parse(summary.documents);
          } catch (e) {
            console.warn('Failed to parse documents JSON:', e);
          }
        }
        // Ensure documents is an array
        if (!Array.isArray(summary.documents)) {
          summary.documents = summary.documents ? [summary.documents] : [];
        }
        
        setDischargeSummary(summary);
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
    setDeleteType('investigation');
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
      setDeleteType(null);
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

  // Check if patient is a post-op followup patient
  const isPostOpFollowupPatient = useCallback(() => {
    if (!patient) return false;
    const pathway = patient.carePathway || patient.care_pathway || patient.pathway || '';
    const category = patient.category || '';
    return category === 'post-op-followup' || 
           pathway === 'Post-op Transfer' || 
           pathway === 'Post-op Followup' || 
           pathway === 'Discharge';
  }, [patient]);

  // Load notes and investigations when patient changes - MUST be before early return
  useEffect(() => {
    console.log('🔍 NursePatientDetailsModal: useEffect triggered, isOpen:', isOpen, 'patient:', patient);
    if (isOpen && patient?.id) {
      console.log('✅ NursePatientDetailsModal: Fetching notes and investigations for patient ID:', patient.id);
      fetchFullPatientData();
      fetchNotes();
      fetchInvestigations();
      fetchInvestigationRequests();
      fetchMDTMeetings();
      // Fetch discharge summary for post-op followup patients
      if (isPostOpFollowupPatient()) {
        fetchDischargeSummary();
      }
    } else {
      console.log('❌ NursePatientDetailsModal: Cannot fetch data - isOpen:', isOpen, 'patient?.id:', patient?.id);
    }
  }, [isOpen, patient?.id, fetchFullPatientData, fetchNotes, fetchInvestigations, fetchInvestigationRequests, fetchMDTMeetings, fetchDischargeSummary, isPostOpFollowupPatient]);

  // Listen for image viewer events
  useEffect(() => {
    const handleOpenImageViewer = (event) => {
      const { imageUrl, fileName, blobUrl } = event.detail;
      setImageViewerUrl(imageUrl);
      setImageViewerFileName(fileName);
      setImageViewerBlobUrl(blobUrl);
      setIsImageViewerModalOpen(true);
    };

    window.addEventListener('openImageViewer', handleOpenImageViewer);

    return () => {
      window.removeEventListener('openImageViewer', handleOpenImageViewer);
    };
  }, []);

  // Handle closing image viewer modal and cleanup
  const handleCloseImageViewer = () => {
    setIsImageViewerModalOpen(false);
    // Clean up blob URL if it exists
    if (imageViewerBlobUrl) {
      URL.revokeObjectURL(imageViewerBlobUrl);
      setImageViewerBlobUrl(null);
    }
    // Clear state after a delay to allow modal to close smoothly
    setTimeout(() => {
      setImageViewerUrl(null);
      setImageViewerFileName(null);
    }, 300);
  };

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
  const handleViewDocument = async (doc) => {
    console.log('Viewing document:', doc);
    
    // Check if document has a URL or path
    if (doc.url) {
      // If it's an image, use ImageViewerModal
      if (doc.type?.includes('image')) {
        setImageViewerUrl(doc.url);
        setImageViewerFileName(doc.name);
        setIsImageViewerModalOpen(true);
      } else if (doc.type?.includes('pdf')) {
        // For PDFs, open in new tab
        window.open(doc.url, '_blank');
      } else {
        // For other file types, try to download or open
        const link = document.createElement('a');
        link.href = doc.url;
        link.target = '_blank';
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else if (doc.path) {
      // If document has a path, construct URL
      const documentUrl = `/api/files/${doc.path}`;
      if (doc.type?.includes('image')) {
        setImageViewerUrl(documentUrl);
        setImageViewerFileName(doc.name);
        setIsImageViewerModalOpen(true);
      } else if (doc.type?.includes('pdf')) {
        window.open(documentUrl, '_blank');
      } else {
        window.open(documentUrl, '_blank');
      }
    } else if (doc.id || doc.name) {
      // Try to construct URL from document metadata or fetch from API
      try {
        // First, try to fetch from a potential API endpoint
        const apiUrl = `/api/patients/${patient.id}/discharge-summary/document/${doc.id || doc.name}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          if (doc.type?.includes('image')) {
            setImageViewerUrl(blobUrl);
            setImageViewerFileName(doc.name);
            setImageViewerBlobUrl(blobUrl);
            setIsImageViewerModalOpen(true);
          } else if (doc.type?.includes('pdf')) {
            // Open PDF in new tab with blob URL
            const newWindow = window.open(blobUrl, '_blank');
            if (!newWindow) {
              // If popup blocked, create download link
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = doc.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          } else {
            // Download other file types
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = doc.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }
        } else {
          // If API endpoint doesn't exist, try to construct URL from document name
          // This assumes documents might be stored in a public/uploads folder
          const possibleUrl = `/uploads/discharge-summaries/${doc.name}`;
          
          if (doc.type?.includes('image')) {
            setImageViewerUrl(possibleUrl);
            setImageViewerFileName(doc.name);
            setIsImageViewerModalOpen(true);
          } else if (doc.type?.includes('pdf')) {
            window.open(possibleUrl, '_blank');
          } else {
            // Show error if we can't find the document
            setSuccessModalTitle('Document Not Available');
            setSuccessModalMessage(`Unable to retrieve ${doc.name}. The document may not be available. Please check if the file exists.`);
            setIsSuccessModalOpen(true);
          }
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        // Fallback: try to open as data URL if document has file data
        if (doc.file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (doc.type?.includes('image')) {
              setImageViewerUrl(e.target.result);
              setImageViewerFileName(doc.name);
              setIsImageViewerModalOpen(true);
            } else if (doc.type?.includes('pdf')) {
              window.open(e.target.result, '_blank');
            }
          };
          reader.readAsDataURL(doc.file);
        } else {
          setSuccessModalTitle('Document Not Available');
          setSuccessModalMessage(`Unable to retrieve ${doc.name}. Please contact support if this issue persists.`);
          setIsSuccessModalOpen(true);
        }
      }
    } else {
      // No URL, path, or ID - show error
      setSuccessModalTitle('Document Not Available');
      setSuccessModalMessage(`Unable to view ${doc.name || 'document'}. Document location not specified.`);
      setIsSuccessModalOpen(true);
    }
  };

  // Handle view test report
  const handleViewReport = (test) => {
    const testNameUpper = (test.testName || '').toUpperCase();
    console.log('Viewing report for:', testNameUpper);
    // In a real app, this would open a report viewer or modal
    setSuccessModalTitle('View Report');
    setSuccessModalMessage(`Opening report for ${testNameUpper}...`);
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
            {isPostOpFollowupPatient() && (
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
            
            {/* General Info tab - always last */}
            <button
              onClick={() => setActiveTab('generalInfo')}
              className={`px-4 py-3 font-medium text-sm relative flex items-center ${
                activeTab === 'generalInfo'
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
                        Add Clinical Investigation
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
                              </div>
                              
                              {/* Content */}
                              <div className="mb-4">
                                {renderPathwayTransferNote(note.content || 'No content available', note.type)}
                              </div>
                              
                              {/* Author and Actions */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                  {getDesignationIcon(note.authorRole || 'urologist')}
                                  <span className="text-sm font-medium text-gray-900">{note.authorName || 'Unknown'}</span>
                                  <span className="text-xs text-gray-500">•</span>
                                  <span className="text-xs text-gray-500">{note.authorRole || 'Staff'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Edit Appointment button - ONLY show on clinical notes with Surgery Pathway */}
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
                                      return null;
                                    }
                                    
                                    return (
                                      <button
                                        onClick={async () => {
                                          try {
                                            // Parse note content to extract appointment details
                                            const parsedData = {};
                                            const lines = noteContent.split('\n');
                                            let currentKey = null;
                                            let currentValue = [];
                                            
                                            lines.forEach(line => {
                                              const trimmedLine = line.trim();
                                              if (trimmedLine.includes('Transfer To:')) {
                                                currentKey = 'transferTo';
                                                parsedData[currentKey] = trimmedLine.replace('Transfer To:', '').trim();
                                              } else if (trimmedLine.includes('Reason for Transfer:')) {
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
                                              } else if (trimmedLine.startsWith('- Date:')) {
                                                parsedData.surgeryDate = trimmedLine.replace('- Date:', '').trim();
                                              } else if (trimmedLine.startsWith('- Time:')) {
                                                parsedData.surgeryTime = trimmedLine.replace('- Time:', '').trim();
                                              } else if (currentKey && trimmedLine) {
                                                currentValue.push(trimmedLine);
                                              }
                                            });
                                            
                                            if (currentKey && currentValue.length > 0) {
                                              parsedData[currentKey] = currentValue.join('\n');
                                            }
                                            
                                            // Fetch appointments for this patient
                                            const appointmentsResult = await bookingService.getPatientAppointments(patient.id);
                                            
                                            if (appointmentsResult.success) {
                                              const appointments = appointmentsResult.data?.appointments || appointmentsResult.data || [];
                                              
                                              // Find surgery appointment
                                              const surgeryAppointment = appointments.find(apt => {
                                                const aptType = (apt.appointmentType || apt.type || '').toLowerCase();
                                                const hasSurgeryType = !!(apt.surgeryType || apt.surgery_type);
                                                return hasSurgeryType || aptType.includes('surgery') || aptType.includes('surgical');
                                              });
                                              
                                              if (surgeryAppointment) {
                                                setSelectedSurgeryAppointment({
                                                  ...surgeryAppointment,
                                                  reason: parsedData.reason || surgeryAppointment.surgeryType || surgeryAppointment.surgery_type || '',
                                                  priority: parsedData.priority || surgeryAppointment.priority || 'normal',
                                                  clinicalRationale: parsedData.clinicalRationale || '',
                                                  additionalNotes: parsedData.additionalNotes || ''
                                                });
                                                setIsEditSurgeryAppointmentModalOpen(true);
                                              } else {
                                                alert('No surgery appointment found for this patient. Please schedule a surgery appointment first.');
                                              }
                                            } else {
                                              alert(`Failed to fetch appointment details: ${appointmentsResult.error || 'Unknown error'}`);
                                            }
                                          } catch (error) {
                                            console.error('Error fetching appointment details:', error);
                                            alert(`Error fetching appointment details: ${error.message}`);
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1"
                                        title="Edit Surgery Appointment"
                                      >
                                        <IoCalendar className="w-3 h-3" />
                                        Edit Appointment
                                      </button>
                                    );
                                  })()}
                                  {/* Don't show edit button for pathway transfer notes or reschedule notes */}
                                  {(() => {
                                    const noteContent = note.content || '';
                                    const noteType = note.type || '';
                                    const isPathwayTransfer = noteType === 'pathway_transfer' || noteContent.includes('PATHWAY TRANSFER');
                                    const isRescheduleNote = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');
                                    
                                    // Only show edit button if it's not a pathway transfer note and not a reschedule note
                                    if (isPathwayTransfer || isRescheduleNote) {
                                      return null;
                                    }
                                    
                                    return (
                                      <button
                                        onClick={() => handleEditNote(note)}
                                        disabled={deletingNote === note.id}
                                        className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Edit note"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                    );
                                  })()}
                                  {/* Don't show delete button for pathway transfer notes or reschedule notes */}
                                  {(() => {
                                    const noteContent = note.content || '';
                                    const noteType = note.type || '';
                                    const isPathwayTransfer = noteType === 'pathway_transfer' || noteContent.includes('PATHWAY TRANSFER');
                                    const isRescheduleNote = noteContent.includes('SURGERY APPOINTMENT RESCHEDULED');
                                    
                                    // Only show delete button if it's not a pathway transfer note and not a reschedule note
                                    if (isPathwayTransfer || isRescheduleNote) {
                                      return null;
                                    }
                                    
                                    return (
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
                                    );
                                  })()}
                                </div>
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
                        {psaResults.map((psa, index) => {
                          // Use ID if available, otherwise use index and date as key
                          const psaKey = psa.id || `initial-psa-${psa.testDate}-${index}`;
                          const isInitialPSA = psa.isInitialPSA || !psa.id;
                          
                          return (
                          <div key={psaKey} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-semibold text-gray-900">{(psa.testName || '').toUpperCase()}</h4>
                                  {isInitialPSA && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                                      Initial PSA
                                    </span>
                                  )}
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(psa.status)}`}>
                                    {psa.status}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                  Date: {psa.formattedDate}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isInitialPSA && (
                                  <button 
                                    onClick={() => {
                                      setSelectedPSAResult(psa);
                                      setIsEditPSAModalOpen(true);
                                    }}
                                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                                    title="Edit PSA Result"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}
                                {(() => {
                                  const filePath = psa.filePath || psa.file_path;
                                  const hasFile = filePath && filePath.trim() !== '';
                                  return hasFile ? (
                                    <button 
                                      onClick={() => {
                                        handleViewFile(filePath);
                                      }}
                                      className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors whitespace-nowrap"
                                    >
                                      View File
                                    </button>
                                  ) : (
                                    <span className="text-sm text-gray-500 italic">No files uploaded</span>
                                  );
                                })()}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 mb-3">
                              <div>
                                <span className="text-sm font-medium text-gray-700">Result:</span>
                                <span className="ml-2 text-sm text-gray-900">
                                  {psa.result && psa.result.toString().includes('ng/mL') 
                                    ? psa.result 
                                    : `${psa.result} ng/mL`}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-700">Reference Range:</span>
                                <span className="ml-2 text-sm text-gray-600">{psa.referenceRange}</span>
                              </div>
                            </div>
                            
                            {psa.notes && (
                              <div className="pt-3 border-t border-gray-200">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-700">Notes:</span>
                                    <p className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap overflow-wrap-anywhere">{psa.notes}</p>
                                  </div>
                                  {!isInitialPSA && (
                                    <button
                                      onClick={() => handleDeleteInvestigation(psa.id)}
                                      disabled={deletingInvestigation === psa.id}
                                      className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                      title="Delete PSA result"
                                    >
                                      {deletingInvestigation === psa.id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                                      ) : (
                                        <Trash className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {!psa.notes && !isInitialPSA && (
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
                          );
                        })}
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
                                  <h4 className="font-semibold text-gray-900">{(test.testName || '').toUpperCase()}</h4>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                  Date: {test.formattedDate}
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const filePath = test.filePath || test.file_path;
                                  if (filePath) {
                                    handleViewFile(filePath);
                                  } else {
                                    handleViewReport(test);
                                  }
                                }}
                                className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                              >
                                {(test.filePath || test.file_path) ? 'View File' : 'View'}
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4 mb-3">
                              {test.result && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Result:</span>
                                  <span className="ml-2 text-sm text-gray-900">{test.result}</span>
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
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-700">Notes:</span>
                                    <p className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap overflow-wrap-anywhere">{test.notes}</p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteInvestigation(test.id)}
                                    disabled={deletingInvestigation === test.id}
                                    className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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
          {activeTab === 'dischargeSummary' && isPostOpFollowupPatient() && (
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
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Test</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Result</th>
                            <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dischargeSummary.investigations.map((inv, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-3 px-4 text-sm text-gray-900">{inv?.test || 'N/A'}</td>
                              <td className="py-3 px-4 text-sm text-gray-900">{inv?.result || 'N/A'}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{inv?.date || 'N/A'}</td>
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
                      Medications on Discharge
                    </h3>
                    <div className="space-y-4">
                      {dischargeSummary.medications.discharged && 
                       Array.isArray(dischargeSummary.medications.discharged) && 
                       dischargeSummary.medications.discharged.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Current Medications:</p>
                          <div className="space-y-2">
                            {dischargeSummary.medications.discharged.map((med, idx) => (
                              <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {med?.name || 'N/A'} - {med?.dose || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {med?.frequency || 'N/A'} for {med?.duration || 'N/A'}
                                    </p>
                                    {med?.instructions && (
                                      <p className="text-xs text-gray-600 mt-1 italic">{med.instructions}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {dischargeSummary.medications.stopped && 
                       Array.isArray(dischargeSummary.medications.stopped) && 
                       dischargeSummary.medications.stopped.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Medications Stopped:</p>
                          <div className="space-y-2">
                            {dischargeSummary.medications.stopped.map((med, idx) => (
                              <div key={idx} className="bg-red-50 p-3 rounded border border-red-200">
                                <p className="text-sm font-semibold text-gray-900">{med?.name || 'N/A'}</p>
                                {med?.reason && (
                                  <p className="text-xs text-gray-600 mt-1">Reason: {med.reason}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Follow-up Arrangements */}
                {dischargeSummary.followUp && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <IoCalendar className="mr-2 text-teal-600" />
                      Follow-up Arrangements
                    </h3>
                    <div className="space-y-4">
                      {dischargeSummary.followUp.catheterRemoval && (
                        <div className="bg-blue-50 p-4 rounded border border-blue-200">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Catheter Removal</p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Date:</span> {dischargeSummary.followUp.catheterRemoval?.date || 'Not specified'}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Location:</span> {dischargeSummary.followUp.catheterRemoval?.location || 'Not specified'}
                          </p>
                          {dischargeSummary.followUp.catheterRemoval?.instructions && (
                            <p className="text-sm text-gray-700 mt-2">{dischargeSummary.followUp.catheterRemoval.instructions}</p>
                          )}
                        </div>
                      )}
                      
                      {dischargeSummary.followUp.postOpReview && (
                        <div className="bg-green-50 p-4 rounded border border-green-200">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Post-Operative Review</p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Date:</span> {dischargeSummary.followUp.postOpReview?.date || 'Not specified'}
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Location:</span> {dischargeSummary.followUp.postOpReview?.location || 'Not specified'}
                          </p>
                          {dischargeSummary.followUp.postOpReview?.instructions && (
                            <p className="text-sm text-gray-700 mt-2">{dischargeSummary.followUp.postOpReview.instructions}</p>
                          )}
                        </div>
                      )}

                      {dischargeSummary.followUp.additionalInstructions && 
                       Array.isArray(dischargeSummary.followUp.additionalInstructions) && 
                       dischargeSummary.followUp.additionalInstructions.length > 0 && (
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
                      )}
                    </div>
                  </div>
                )}

                {/* GP Actions */}
                {dischargeSummary.gpActions && 
                 Array.isArray(dischargeSummary.gpActions) && 
                 dischargeSummary.gpActions.length > 0 && (
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
                )}

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

          {/* General Info Tab - always visible */}
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

                          {/* Personal Information */}
                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <IoHeart className="mr-2 text-teal-600" />
                              Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <span className="ml-2 font-medium text-gray-900">{displayPatient.phone || displayPatient.phoneNumber || 'N/A'}</span>
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
                                <span className="text-gray-600">Assigned Urologist:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {displayPatient.assignedUrologist || displayPatient.assigned_urologist || 'Not assigned'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Priority:</span>
                                <span className="ml-2">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    (displayPatient.priority || 'normal').toLowerCase() === 'urgent' 
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
                                <span className="ml-2 font-medium text-gray-900">
                                  {displayPatient.medicalHistory || displayPatient.medical_history || 'No prior medical conditions'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Current Medications:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {displayPatient.currentMedications || displayPatient.current_medications || 'None'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Allergies:</span>
                                <span className={`ml-2 font-medium ${displayPatient.allergies ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {displayPatient.allergies || 'None'}
                                </span>
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
                                  
                                  return triageSymptoms && triageSymptoms.length > 0 ? (
                                    <div className="space-y-3">
                                      {triageSymptoms.map((symptom, index) => (
                                        <div key={index} className={`border border-gray-200 rounded-lg p-4 ${symptom.isCustom ? 'bg-blue-50' : 'bg-gray-50'}`}>
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <span className="font-medium text-gray-900">{symptom.name}</span>
                                                {symptom.isCustom && <span className="text-xs text-blue-600">(Custom)</span>}
                                              </div>
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                                <div>
                                                  <span className="text-gray-600">IPSS Score:</span>
                                                  <span className="ml-2 font-medium text-gray-900">{symptom.ipssScore || 'N/A'}</span>
                                                </div>
                                                <div>
                                                  <span className="text-gray-600">Duration:</span>
                                                  <span className="ml-2 font-medium text-gray-900">
                                                    {symptom.duration ? `${symptom.duration} ${symptom.durationUnit || 'months'}` : 'N/A'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
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
                              <IoDocumentText className="mr-2 text-teal-600" />
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
                      <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          // Get the last 5 PSA results for the chart, sorted by date (oldest first for chart)
                          const chartData = psaHistory.slice(0, 5).reverse();
                          
                          // Build chart data directly from API response
                          // Each point will have its unique PSA value from the API
                          const rechartsData = chartData.map((psaItem, index) => {
                            // Use the numericValue we stored from the API response
                            // This is the actual value from the API (9, 5, 8, etc.)
                            const psaValue = psaItem.numericValue || 0;
                            
                            // Get date
                            const date = psaItem.dateObj || (psaItem.date ? new Date(psaItem.date) : new Date());
                            
                            // Format date string
                            const dateStr = date && !isNaN(date.getTime()) 
                              ? date.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric' 
                                })
                              : psaItem.date || 'N/A';
                            
                            // Create data point with unique PSA value for each point
                            return {
                              id: psaItem.id, // Use actual ID from API (56, 55, 54)
                              date: dateStr,
                              dateObj: date,
                              psa: psaValue, // This is the key field - unique value for each point
                              // Store additional info for tooltip
                              originalResult: psaItem.result,
                              numericValue: psaValue
                            };
                          });
                          
                          // Calculate Y-axis domain
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
                              margin={{ top: 5, right: 20, left: 10, bottom: 30 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis 
                                dataKey="date" 
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                                tick={{ fill: '#6b7280' }}
                              />
                              <YAxis 
                                domain={yDomain}
                                stroke="#6b7280"
                                style={{ fontSize: '12px' }}
                                tick={{ fill: '#6b7280' }}
                                label={{ 
                                  value: 'PSA Value (ng/mL)', 
                                  angle: -90, 
                                  position: 'insideLeft', 
                                  style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' } 
                                }}
                              />
                              <Tooltip 
                                formatter={(value, name, props) => {
                                  // This formatter is called for EACH point individually
                                  // value is the Y-axis value (PSA) for THIS specific hovered point
                                  // props.payload contains the full data object for THIS point from our API response
                                  const dataPoint = props.payload || {};
                                  
                                  // Use the value parameter - this is the Y-axis value for THIS point
                                  // This is calculated by Recharts from dataKey="psa" for this specific data point
                                  // For points with values 9, 5, 8 - this will correctly show 9, 5, or 8
                                  const psaValue = value !== undefined && value !== null ? value : 
                                                  (dataPoint.psa !== undefined ? dataPoint.psa : 
                                                   dataPoint.numericValue !== undefined ? dataPoint.numericValue : 0);
                                  
                                  const numValue = typeof psaValue === 'number' && !isNaN(psaValue) 
                                    ? psaValue 
                                    : parseFloat(String(psaValue)) || 0;
                                  
                                  // Return formatted value - this will be displayed in the tooltip
                                  return [`${numValue.toFixed(1)} ng/mL`, 'PSA Value'];
                                }}
                                labelFormatter={(label) => {
                                  // Return the date label
                                  return label || 'Date';
                                }}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '0.5rem',
                                  padding: '12px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '3 3' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="psa" 
                                stroke="#0d9488" 
                                strokeWidth={2}
                                dot={{ fill: '#0d9488', r: 5, strokeWidth: 2, stroke: 'white' }}
                                activeDot={{ r: 7, fill: '#0d9488', stroke: '#0d9488', strokeWidth: 2 }}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          );
                        })()}
                      </ResponsiveContainer>
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
                                {(() => {
                                  const filePath = psa.filePath || psa.file_path;
                                  const hasFile = filePath && filePath.trim() !== '';
                                  return hasFile ? (
                                    <button 
                                      onClick={() => {
                                        handleViewFile(filePath);
                                      }}
                                      className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors whitespace-nowrap"
                                    >
                                      View File
                                    </button>
                                  ) : (
                                    <span className="text-sm text-gray-500 italic">No files uploaded</span>
                                  );
                                })()}
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
                                  <h4 className="font-semibold text-gray-900">{(test.testName || '').toUpperCase()}</h4>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                  Time: {test.date}
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const filePath = test.filePath || test.file_path;
                                  if (filePath) {
                                    handleViewFile(filePath);
                                  } else {
                                    handleViewReport(test);
                                  }
                                }}
                                className="px-3 py-1 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                              >
                                {(test.filePath || test.file_path) ? 'View File' : 'View'}
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              {test.result && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Result:</span>
                                  <span className="ml-2 text-sm text-gray-900">{test.result}</span>
                                </div>
                              )}
                            </div>
                            
                            {test.notes && (
                              <div className="pt-3 border-t border-gray-200">
                                <span className="text-sm font-medium text-gray-700">Notes:</span>
                                <p className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap overflow-wrap-anywhere">{test.notes}</p>
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
      <AddClinicalInvestigationModal
        isOpen={isAddInvestigationModalOpen}
        onClose={() => setIsAddInvestigationModalOpen(false)}
        patient={patient}
        onSuccess={(message) => {
          setSuccessModalTitle('Clinical Investigation Added');
          setSuccessModalMessage(message);
          setIsSuccessModalOpen(true);
          setIsAddInvestigationModalOpen(false);
          // Refresh notes to show the new clinical investigation instantly
          fetchNotes();
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
                              min={new Date().toISOString().split('T')[0]}
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
      onConfirm={deleteType === 'note' ? confirmDeleteNote : confirmDeleteInvestigation}
      title={deleteType === 'note' ? "Delete Clinical Note" : "Delete Investigation Result"}
      message={deleteType === 'note' 
        ? "Are you sure you want to delete this clinical note? This action cannot be undone."
        : "Are you sure you want to delete this investigation result? This action cannot be undone."
      }
      confirmText={deleteType === 'note' ? "Delete Note" : "Delete Result"}
      cancelText="Cancel"
      type="danger"
      isLoading={deletingNote !== null || deletingInvestigation !== null}
    />

    {/* Add PSA Result Modal */}
    <AddPSAResultModal
      isOpen={isAddPSAModalOpen}
      onClose={() => setIsAddPSAModalOpen(false)}
      patient={patient}
      onSuccess={handleInvestigationSuccess}
    />

    {/* Edit PSA Result Modal */}
    <EditPSAResultModal
      isOpen={isEditPSAModalOpen}
      onClose={() => {
        setIsEditPSAModalOpen(false);
        setSelectedPSAResult(null);
      }}
      patient={patient}
      psaResult={selectedPSAResult}
      onSuccess={handleInvestigationSuccess}
    />

    {/* Add Test Result Modal */}
    <AddTestResultModal
      isOpen={isAddTestModalOpen}
      onClose={() => setIsAddTestModalOpen(false)}
      patient={patient}
      onSuccess={handleInvestigationSuccess}
    />

    {/* Image Viewer Modal */}
    <ImageViewerModal
      isOpen={isImageViewerModalOpen}
      onClose={handleCloseImageViewer}
      imageUrl={imageViewerUrl}
      fileName={imageViewerFileName}
    />

    {/* Edit Note Modal */}
    {isEditNoteModalOpen && (
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-slideUp">
          {/* Modal Header */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Clinical Note</h2>
                <p className="text-sm text-gray-500 mt-0.5">Update the clinical note content</p>
              </div>
              <button
                onClick={cancelEditNote}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                aria-label="Close modal"
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Note Content */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <IoDocumentText className="w-4 h-4 text-teal-600" />
                  Note Content
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editNoteContent}
                  onChange={(e) => setEditNoteContent(e.target.value)}
                  placeholder="Enter clinical note details..."
                  rows={8}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200 text-gray-900 resize-none"
                  required
                />
              </div>

              {/* Error Message */}
              {notesError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {notesError}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelEditNote}
                disabled={savingNote}
                className="px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNote}
                disabled={!editNoteContent.trim() || savingNote}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
              >
                {savingNote ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <IoCheckmarkCircle className="w-4 h-4" />
                    <span>Update Note</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    
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
        // Refresh clinical notes after appointment update
        await fetchNotes();
        // Dispatch event to refresh other components
        window.dispatchEvent(new CustomEvent('surgery:updated'));
      }}
    />

    {/* Edit Patient Modal */}
    <EditPatientModal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      patient={fullPatientData || patient}
      onPatientUpdated={async (updatedPatient) => {
        // Refresh patient data
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

export default NursePatientDetailsModal;