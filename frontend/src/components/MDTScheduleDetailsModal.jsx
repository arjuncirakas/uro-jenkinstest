import React, { useState, useEffect } from 'react';
import { 
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Building2,
  ChevronRight,
  Edit,
  Trash2,
  Video,
  FileText,
  Stethoscope,
  Activity,
  CheckCircle,
  Plus,
  Upload,
  Eye,
  Download,
  Trash,
  AlertCircle,
  Save,
  Send
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';
import { patientService } from '../services/patientService';
import { mdtService } from '../services/mdtService';
import ConfirmModal from './ConfirmModal';

const MDTScheduleDetailsModal = ({ isOpen, onClose, schedule }) => {
  if (!isOpen || !schedule) return null;

  // State management
  const [showReschedule, setShowReschedule] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(schedule.date || '');
  const [rescheduleTime, setRescheduleTime] = useState(schedule.time || '');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [followUpActions, setFollowUpActions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newRecommendation, setNewRecommendation] = useState('');
  const [newFollowUpAction, setNewFollowUpAction] = useState('');
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [mdtOutcome, setMdtOutcome] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Add new recommendation
  const addRecommendation = () => {
    if (newRecommendation.trim()) {
      setRecommendations([...recommendations, {
        id: Date.now(),
        text: newRecommendation.trim(),
        timestamp: new Date().toISOString()
      }]);
      setNewRecommendation('');
    }
  };

  // Remove recommendation
  const removeRecommendation = (id) => {
    setRecommendations(recommendations.filter(rec => rec.id !== id));
  };

  // Add new follow-up action
  const addFollowUpAction = () => {
    if (newFollowUpAction.trim()) {
      const newAction = {
        id: Date.now(),
        text: newFollowUpAction.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
      setFollowUpActions([...followUpActions, newAction]);
      setNewFollowUpAction('');
    }
  };

  // Toggle follow-up action completion
  const toggleFollowUpAction = (id) => {
    setFollowUpActions(followUpActions.map(action => 
      action.id === id ? { ...action, completed: !action.completed } : action
    ));
  };

  // Remove follow-up action
  const removeFollowUpAction = (id) => {
    setFollowUpActions(followUpActions.filter(action => action.id !== id));
  };

  // Handle document upload
  const handleDocumentUpload = (event) => {
    const files = Array.from(event.target.files);
    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      uploadDate: new Date().toLocaleDateString('en-GB')
    }));
    setDocuments([...documents, ...newDocs]);
  };

  // Remove document
  const removeDocument = (id) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  // Meeting and patient info loaded from API
  const [meeting, setMeeting] = useState(null);
  const [patient, setPatient] = useState(null);
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    let mounted = true;
    const loadMeeting = async () => {
      if (!schedule?.id) return;
      const res = await mdtService.getMeetingById(schedule.id);
      if (mounted && res.success) {
        setMeeting(res.data);
        setAttendees(res.data.teamMembers || []);
        // Keep editor empty by default; existing notes will be shown in summary from meeting
        setDiscussionNotes('');
        // Initialize reschedule fields from loaded meeting
        if (res.data.meetingDate) setRescheduleDate(res.data.meetingDate);
        if (res.data.meetingTime) setRescheduleTime(res.data.meetingTime);
      }
    };
    loadMeeting();

    const loadPatient = async () => {
      if (!schedule?.patientId) {
        setPatient({
          name: schedule.patientName || 'Patient',
          id: schedule.patientId || 'N/A',
          age: 'N/A',
          gender: 'N/A',
          mrn: schedule.patientId || 'N/A',
          diagnosis: '—',
          psa: '—',
          lastImaging: '—',
          clinicalNotes: '—'
        });
        return;
      }
      const res = await patientService.getPatientById(schedule.patientId);
      if (mounted) {
        if (res.success && res.data) {
          const p = res.data;
          setPatient({
            name: `${p.first_name} ${p.last_name}`,
            id: p.upi || p.id,
            age: p.age || 'N/A',
            gender: p.gender || 'N/A',
            mrn: p.mrn || p.upi || p.id,
            diagnosis: p.diagnosis || '—',
            psa: p.initial_psa ? `${p.initial_psa} ng/mL` : '—',
            lastImaging: p.initial_psa_date || '—',
            clinicalNotes: p.medical_history || '—'
          });
        } else {
          setPatient({
            name: schedule.patientName || 'Patient',
            id: schedule.patientId || 'N/A',
            age: 'N/A',
            gender: 'N/A',
            mrn: schedule.patientId || 'N/A',
            diagnosis: '—',
            psa: '—',
            lastImaging: '—',
            clinicalNotes: '—'
          });
        }
      }
    };
    loadPatient();
    return () => { mounted = false; };
  }, [schedule]);

  // Format date for display (handle YYYY-MM-DD safely as local date) – no relative labels
  const formatDate = (dateString) => {
    if (!dateString) return '';
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateString))) {
      const [y, m, d] = String(dateString).split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateString);
    }
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time to 12-hour format
  const formatTime = (time24) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      upcoming: { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        label: 'Upcoming',
        icon: Clock 
      },
      completed: { 
        color: 'bg-green-50 text-green-700 border-green-200', 
        label: 'Completed',
        icon: CheckCircle 
      },
      scheduled: { 
        color: 'bg-purple-50 text-purple-700 border-purple-200', 
        label: 'Scheduled',
        icon: Calendar 
      },
      cancelled: { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        label: 'Cancelled',
        icon: AlertCircle 
      }
    };
    const config = statusConfig[status] || statusConfig.scheduled;
    const StatusIcon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${config.color}`}>
        <StatusIcon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  // Check if virtual meeting
  const isVirtual = schedule.location?.toLowerCase().includes('virtual') || 
                    schedule.location?.toLowerCase().includes('zoom') || 
                    schedule.location?.toLowerCase().includes('teams');

  // Handle save
  const handleSave = () => {
    const mdtData = {
      schedule,
      patient,
      discussionNotes,
      mdtOutcome,
      recommendations,
      followUpActions,
      documents,
      completedAt: new Date().toISOString()
    };
    console.log('Saving MDT meeting data:', mdtData);
    onClose();
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    console.log('MDTScheduleDetailsModal - handleClose called');
    console.log('MDTScheduleDetailsModal - hasUnsavedChanges:', hasUnsavedChanges);
    if (hasUnsavedChanges) {
      console.log('MDTScheduleDetailsModal - Setting showConfirmModal to true');
      setShowConfirmModal(true);
    } else {
      console.log('MDTScheduleDetailsModal - No unsaved changes, closing directly');
      onClose();
    }
  };

  // Handle confirmation modal actions
  const handleConfirmModalAction = (shouldSave) => {
    if (shouldSave) {
      handleSave();
    } else {
      onClose();
    }
    setShowConfirmModal(false);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = discussionNotes.trim() !== '' || 
                           mdtOutcome !== '' || 
                           recommendations.length > 0 || 
                           followUpActions.length > 0 || 
                           documents.length > 0;

  // Check if meeting is complete (has outcome and content entered)
  // Check both from meeting data and local state
  const getMeetingOutcome = () => {
    if (meeting?.mdtOutcome) return meeting.mdtOutcome;
    if (meeting?.notes) {
      try {
        const parsed = typeof meeting.notes === 'string' ? JSON.parse(meeting.notes) : meeting.notes;
        return parsed?.mdtOutcome || '';
      } catch {
        return '';
      }
    }
    return mdtOutcome || '';
  };

  const getMeetingContent = () => {
    if (meeting?.notes) {
      try {
        const parsed = typeof meeting.notes === 'string' ? JSON.parse(meeting.notes) : meeting.notes;
        return parsed?.content || '';
      } catch {
        return '';
      }
    }
    return discussionNotes || '';
  };

  const isMeetingComplete = (() => {
    const outcome = getMeetingOutcome();
    const content = getMeetingContent();
    return outcome && outcome.trim() !== '' && content && content.trim() !== '';
  })();

  // Handle save function for Escape key
  const handleSaveChanges = (e) => {
    if (e) e.preventDefault();
    handleSave();
  };

  // Handle Escape key with save confirmation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed in MDTScheduleDetailsModal!');
        console.log('hasUnsavedChanges:', hasUnsavedChanges);
        
        event.preventDefault();
        event.stopPropagation();

        // Call handleClose which will check for unsaved changes
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hasUnsavedChanges]);

  return (
    <>
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="mb-1">
                <h2 className="text-xl font-semibold text-white">
                  Multidisciplinary Team Meeting
                </h2>
              </div>
              <p className="text-teal-50 text-sm font-medium mb-2">
                {schedule.department} Department • {schedule.caseType || 'Patient Case Review'}
              </p>
              {(meeting?.meetingDate || schedule.date) && (meeting?.meetingTime || schedule.time) && (
                <div className="flex items-center gap-4 text-sm text-white/90">
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-md">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(meeting?.meetingDate || schedule.date)}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-md">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(meeting?.meetingTime || schedule.time)}
                  </span>
                  {isVirtual && (
                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-md">
                      <Video className="h-3.5 w-3.5" />
                      Virtual Meeting
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRescheduleModal(true)}
                disabled={isMeetingComplete}
                className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium ${
                  isMeetingComplete
                    ? 'bg-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title={isMeetingComplete ? 'Cannot reschedule: Meeting data has been entered' : 'Reschedule meeting'}
              >
                Reschedule
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white flex-shrink-0"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
          
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Reschedule Bar (removed for modal-based flow) */}
            
            {/* Patient Information */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-teal-600" />
                  Patient Information
                </h3>
              </div>
              <div className="p-6">
                {!patient ? (
                  <div className="text-sm text-gray-500">Loading patient details...</div>
                ) : (
                <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-1">{patient.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium">{patient.id}</span>
                      <span>•</span>
                      <span>{patient.age} years, {patient.gender}</span>
                      <span>•</span>
                      <span>MRN: {patient.mrn}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Diagnosis</p>
                    <p className="text-sm font-semibold text-gray-900">{patient.diagnosis}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">PSA Level</p>
                    <p className="text-sm font-semibold text-gray-900">{patient.psa}</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Clinical Summary
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{patient.clinicalNotes}</p>
                  {Boolean(meeting?.notes?.trim()) && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">Discussion Notes</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{meeting.notes}</p>
                    </div>
                  )}
                </div>
                </>
                )}
              </div>
            </section>

            {/* Team Members */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-600" />
                    Attending Clinicians
                  </h3>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {attendees.length} Members
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attendees.map((attendee, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/30 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-teal-100 text-teal-700 border-2 border-teal-200">
                        {(attendee.name || '').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {attendee.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{attendee.role || 'Specialist'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Discussion Notes */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Clinical Discussion Notes
                </h3>
              </div>
              <div className="p-6">
                <textarea
                  value={discussionNotes}
                  onChange={(e) => setDiscussionNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
                  rows="5"
                  placeholder="Document key discussion points, clinical findings, and team deliberations..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  {discussionNotes.length} characters
                </p>
              </div>
            </section>

            {/* MDT Outcome */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  MDT Decision & Outcome
                </h3>
              </div>
              <div className="p-6">
                <select
                  value={mdtOutcome}
                  onChange={(e) => setMdtOutcome(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium bg-white"
                >
                  <option value="">Select MDT Outcome</option>
                  <option value="treatment_approved">Treatment Plan Approved</option>
                  <option value="further_investigation">Further Investigation Required</option>
                  <option value="surgery_recommended">Surgical Intervention Recommended</option>
                  <option value="radiation_therapy">Radiation Therapy Recommended</option>
                  <option value="active_monitoring">Active Surveillance Protocol</option>
                  <option value="palliative_care">Palliative Care Pathway</option>
                  <option value="referral_required">Specialist Referral Required</option>
                  <option value="follow_up_scheduled">Follow-up Appointment Scheduled</option>
                </select>
              </div>
            </section>

            {/* Recommendations */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-teal-600" />
                  Clinical Recommendations
                </h3>
              </div>
              <div className="p-6">
                {recommendations.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {recommendations.map((recommendation) => (
                      <div 
                        key={recommendation.id} 
                        className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg group hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-800 flex-1 leading-relaxed">{recommendation.text}</p>
                        <button
                          onClick={() => removeRecommendation(recommendation.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          aria-label="Remove recommendation"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRecommendation}
                    onChange={(e) => setNewRecommendation(e.target.value)}
                    placeholder="Add clinical recommendation..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addRecommendation()}
                  />
                  <button
                    onClick={addRecommendation}
                    disabled={!newRecommendation.trim()}
                    className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            </section>

            {/* Follow-up Actions */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  Follow-up Action Items
                </h3>
              </div>
              <div className="p-6">
                {followUpActions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {followUpActions.map((action) => (
                      <div 
                        key={action.id} 
                        className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg group hover:border-teal-300 transition-all"
                      >
                        <button
                          onClick={() => toggleFollowUpAction(action.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            action.completed 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300 hover:border-teal-400'
                          }`}
                          aria-label={action.completed ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {action.completed && <CheckCircle className="h-3 w-3 text-white" />}
                        </button>
                        <span className={`flex-1 text-sm ${action.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                          {action.text}
                        </span>
                        <button
                          onClick={() => removeFollowUpAction(action.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          aria-label="Remove action"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFollowUpAction}
                    onChange={(e) => setNewFollowUpAction(e.target.value)}
                    placeholder="Add follow-up action item..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addFollowUpAction()}
                  />
                  <button
                    onClick={addFollowUpAction}
                    disabled={!newFollowUpAction.trim()}
                    className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            </section>

            {/* Documents */}
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Supporting Documentation
                </h3>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dcm"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    id="document-upload"
                  />
                  <label
                    htmlFor="document-upload"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition-all font-medium text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Documents
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG, DICOM • Maximum file size: 10MB
                  </p>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg group hover:border-teal-300 hover:bg-teal-50/30 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.type} • {doc.size} • {doc.uploadDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button 
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            aria-label="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-all"
                            aria-label="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeDocument(doc.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                            aria-label="Delete document"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRescheduleModal(true)}
              disabled={isMeetingComplete}
              className={`px-4 py-2.5 text-sm font-medium rounded-lg ${
                isMeetingComplete
                  ? 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-50'
              }`}
              title={isMeetingComplete ? 'Cannot reschedule: Meeting data has been entered' : 'Reschedule meeting'}
            >
              Reschedule
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Meeting Record
            </button>
          </div>
        </div>
      </div>
    </div>
    
    {/* Confirmation Modal */}
    <ConfirmModal
      isOpen={showConfirmModal}
      onConfirm={handleConfirmModalAction}
      onCancel={() => setShowConfirmModal(false)}
      title="Unsaved Changes"
      message="You have unsaved changes. Do you want to save before closing?"
    />

    {/* Reschedule Modal */}
    {showRescheduleModal && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Reschedule MDT Meeting</h3>
            <button onClick={() => setShowRescheduleModal(false)} className="p-1.5 rounded hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Date</label>
              <input
                type="date"
                value={(rescheduleDate || '').toString().slice(0,10)}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Time</label>
              <input
                type="time"
                value={rescheduleTime || ''}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            {rescheduleError && <p className="text-xs text-red-600">{rescheduleError}</p>}
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
            <button onClick={() => setShowRescheduleModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm">Cancel</button>
            <button
              onClick={async () => {
                setIsRescheduling(true);
                setRescheduleError('');
                const payload = { meetingDate: rescheduleDate, meetingTime: rescheduleTime };
                const id = meeting?.id || schedule.id;
                const res = await mdtService.rescheduleMDTMeeting(id, payload);
                setIsRescheduling(false);
                if (res.success) {
                  setMeeting((prev) => ({ ...(prev || {}), meetingDate: res.data.meetingDate, meetingTime: res.data.meetingTime }));
                  setShowRescheduleModal(false);
                } else {
                  setRescheduleError(res.error || 'Failed to reschedule');
                }
              }}
              disabled={isRescheduling || !rescheduleDate || !rescheduleTime}
              className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm disabled:opacity-50"
            >
              {isRescheduling ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default MDTScheduleDetailsModal;
