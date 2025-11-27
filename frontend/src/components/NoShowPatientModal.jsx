import React, { useState, useEffect } from 'react';
import { 
  FiX, 
  FiCalendar, 
  FiClock, 
  FiUser, 
  FiPhone, 
  FiMail, 
  FiAlertCircle, 
  FiCheck, 
  FiPlus,
  FiEdit3,
  FiRefreshCw,
  FiMessageSquare,
  FiPhoneCall,
  FiMail as FiEmail,
  FiClock as FiTime,
  FiTrash2,
  FiUserX
} from 'react-icons/fi';
import RescheduleConfirmationModal from './RescheduleConfirmationModal';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import { bookingService } from '../services/bookingService';

const NoShowPatientModal = ({ isOpen, onClose, patient, appointmentId, appointmentType, onReschedule, onAddTimelineEntry, onSuccess }) => {
  const [timelineEntries, setTimelineEntries] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [error, setError] = useState(null);
  const [showExpireConfirmModal, setShowExpireConfirmModal] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && patient && appointmentId) {
      // Load existing timeline entries for this patient
      loadTimelineEntries();
      setNewNote('');
      setError(null);
    }
  }, [isOpen, patient, appointmentId]);

  const loadTimelineEntries = async () => {
    if (!appointmentId) {
      return;
    }
    
    setLoadingNotes(true);
    setError(null);
    
    try {
      const result = await bookingService.getNoShowNotes(appointmentId, appointmentType);
      
      if (result.success) {
        setTimelineEntries(result.data.notes || []);
      } else {
        setError(result.error || 'Failed to load notes');
        console.error('Error loading notes:', result.error);
      }
    } catch (error) {
      setError('Failed to load notes');
      console.error('Error loading notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Format date for display (DD/MM/YYYY format)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle different date formats
      let date;
      if (dateString.includes('T')) {
        // ISO format
        date = new Date(dateString);
      } else {
        // YYYY-MM-DD format
        date = new Date(dateString + 'T00:00:00');
      }
      
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
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
      
      // If it's an ISO time string, extract time part
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      }
      
      return timeString;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !appointmentId) {
      return;
    }

    setIsAddingNote(true);
    setError(null);
    
    try {
      const result = await bookingService.addNoShowNote(appointmentId, {
        noteContent: newNote.trim(),
        type: appointmentType
      });
      
      if (result.success) {
        // Reload notes to get the latest data
        await loadTimelineEntries();
        
        // Call parent callback if provided
        if (onAddTimelineEntry) {
          onAddTimelineEntry(patient.id, result.data.note);
        }
        
        // Reset form
        setNewNote('');
      } else {
        setError(result.error || 'Failed to add note');
        console.error('Error adding note:', result.error);
      }
      
    } catch (error) {
      setError('Failed to add note');
      console.error('Error adding note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = (noteId) => {
    if (!noteId) return;
    
    // Find the note to get its content for confirmation
    const note = timelineEntries.find(entry => entry.id === noteId);
    setNoteToDelete(note);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      const result = await bookingService.removeNoShowNote(noteToDelete.id);
      
      if (result.success) {
        // Reload notes to get the latest data
        await loadTimelineEntries();
        setShowDeleteConfirmModal(false);
        setNoteToDelete(null);
      } else {
        setError(result.error || 'Failed to delete note');
        console.error('Error deleting note:', result.error);
      }
    } catch (error) {
      setError('Failed to delete note');
      console.error('Error deleting note:', error);
    }
  };

  const cancelDeleteNote = () => {
    setShowDeleteConfirmModal(false);
    setNoteToDelete(null);
  };

  const handleReschedule = () => {
    setIsRescheduleModalOpen(true);
  };

  const handleExpirePatient = () => {
    setShowExpireConfirmModal(true);
  };

  const confirmExpirePatient = async () => {
    if (!patient || !patient.id) {
      setError('Patient information is missing');
      return;
    }

    setIsExpiring(true);
    setError(null);

    try {
      const result = await bookingService.expirePatient(patient.id, {
        reason: 'Patient marked as expired from no-show management',
        notes: `Patient expired due to no-show. Original appointment: ${formatDate(patient.scheduledDate)} at ${formatTime(patient.scheduledTime)}`
      });

      if (result.success) {
        // Call onSuccess callback if provided to refresh data
        if (onSuccess) {
          onSuccess();
        }
        // Close modal
        setShowExpireConfirmModal(false);
        onClose();
      } else {
        setError(result.error || 'Failed to expire patient');
        console.error('Error expiring patient:', result.error);
      }
    } catch (error) {
      setError('Failed to expire patient');
      console.error('Error expiring patient:', error);
    } finally {
      setIsExpiring(false);
    }
  };

  const handleRescheduleConfirm = async (appointmentId, newDate, newTime, selectedDoctor) => {
    setIsSubmitting(true);
    
    try {
      // Call parent callback with doctor information
      if (onReschedule) {
        onReschedule(patient.id, {
          appointmentId,
          newDate,
          newTime,
          doctorId: selectedDoctor?.id,
          doctorName: selectedDoctor?.name,
          reason: 'No-show reschedule'
        });
      }
      
      setIsRescheduleModalOpen(false);
      onClose();
      
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = newNote.trim() !== '';

  // Handle save function for Escape key
  const handleSaveChanges = (e) => {
    if (e) e.preventDefault();
    if (newNote.trim()) {
      handleAddNote();
    }
  };

  // Handle Escape key with save confirmation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed in NoShowPatientModal!');
        console.log('hasUnsavedChanges:', hasUnsavedChanges);
        
        event.preventDefault();
        event.stopPropagation();

        // Call handleClose which will check for unsaved changes
        if (hasUnsavedChanges) {
          setShowConfirmModal(true);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hasUnsavedChanges]);

  if (!isOpen || !patient) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] border border-gray-200 flex flex-col">
          
          {/* Header */}
          <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center">
                <FiAlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">No-Show Patient Details</h3>
                <p className="text-teal-50 text-sm mt-0.5">Track follow-up actions and reschedule appointment</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <FiX className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Patient Information */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 border border-red-200 rounded flex items-center justify-center">
                  <FiUser className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-900">{patient.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span className="flex items-center gap-1.5">
                      <FiUser className="w-3.5 h-3.5" />
                      UPI: {patient.upi}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiTime className="w-3.5 h-3.5" />
                      Age: {patient.age} • {patient.gender}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FiAlertCircle className="w-3.5 h-3.5" />
                      PSA: {patient.psa} ng/mL
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">Missed Appointment</div>
                  <div className="text-xs text-gray-600">
                    {formatDate(patient.scheduledDate)} at {formatTime(patient.scheduledTime)}
                  </div>
                  <div className="text-xs text-red-600 font-medium mt-1">
                    {patient.appointmentType === 'investigation' ? 'Investigation' : 'Urologist'} Appointment
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <FiMessageSquare className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Follow-up Notes</h4>
                    <p className="text-sm text-gray-600">Add notes about contact attempts and follow-up actions</p>
                  </div>
                </div>
              </div>

              {/* Add New Note Form */}
              <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Add Note</h5>
                <div className="space-y-3">
                  <div>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                      placeholder="Add details about follow-up actions, phone calls, messages sent, etc..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isAddingNote}
                      className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isAddingNote ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          <FiCheck className="w-4 h-4" />
                          Add Note
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setNewNote('')}
                      className="px-4 py-2 text-gray-600 text-sm rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Notes Timeline */}
              <div className="space-y-3">
                {loadingNotes ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm">Loading notes...</p>
                  </div>
                ) : timelineEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FiMessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No notes yet</p>
                    <p className="text-xs text-gray-400">Add notes to track follow-up actions</p>
                  </div>
                ) : (
                  timelineEntries.map((entry, index) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiMessageSquare className="w-4 h-4 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h6 className="text-sm font-medium text-gray-900">Note</h6>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(entry.created_at)}
                            </span>
                            <button
                              onClick={() => handleDeleteNote(entry.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete note"
                            >
                              <FiTrash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{entry.note_content}</p>
                        <p className="text-xs text-gray-500">by {entry.author_name} ({entry.author_role})</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Fixed Footer */}
          <div className="bg-gray-50 border-t border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-semibold text-gray-900">Next Actions</h5>
                <p className="text-xs text-gray-600">Choose what to do next with this patient</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReschedule}
                  className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Reschedule
                </button>
                <button
                  onClick={handleExpirePatient}
                  disabled={isExpiring}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isExpiring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Expiring...
                    </>
                  ) : (
                    <>
                      <FiUserX className="w-4 h-4" />
                      Expire Patient
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      <RescheduleConfirmationModal
        isOpen={isRescheduleModalOpen}
        onCancel={() => setIsRescheduleModalOpen(false)}
        onConfirm={handleRescheduleConfirm}
        appointment={{
          id: appointmentId,
          patientName: patient.name,
          date: patient.scheduledDate,
          time: patient.scheduledTime,
          type: patient.appointmentType === 'investigation' ? 'Investigation' : 'Urologist',
          typeColor: patient.appointmentType === 'investigation' ? 'purple' : 'teal',
          urologist: patient.doctorName // Pass the original doctor name for pre-selection
        }}
        newDate=""
        newTime=""
      />
      
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onConfirm={() => {
          handleSaveChanges();
          setShowConfirmModal(false);
          onClose();
        }}
        onCancel={() => setShowConfirmModal(false)}
        title="Unsaved Changes"
        message="You have unsaved changes. Do you want to save before closing?"
      />

      {/* Delete Note Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirmModal}
        onConfirm={() => confirmDeleteNote()}
        onCancel={cancelDeleteNote}
        title="Delete Note"
        message={`Are you sure you want to delete this note? This action cannot be undone.${
          noteToDelete ? `\n\nNote: "${noteToDelete.note_content.substring(0, 100)}${noteToDelete.note_content.length > 100 ? '...' : ''}"` : ''
        }`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        showSaveButton={false}
      />

      {/* Expire Patient Confirmation Modal */}
      <ConfirmModal
        isOpen={showExpireConfirmModal}
        onConfirm={confirmExpirePatient}
        onCancel={() => setShowExpireConfirmModal(false)}
        title="Expire Patient"
        message={`Are you sure you want to expire this patient? This action will:\n\n• Mark the patient as expired\n• Cancel all future appointments\n• Prevent any future appointment bookings\n\nThis action cannot be undone.`}
        confirmText="Yes, Expire Patient"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        showSaveButton={false}
      />
    </>
  );
};

export default NoShowPatientModal;