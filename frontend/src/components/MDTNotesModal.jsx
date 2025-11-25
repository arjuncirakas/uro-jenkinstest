import React, { useState, useEffect } from 'react';
import { 
  X,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  Download,
  Eye,
  Trash,
  Plus,
  Upload,
  Edit3,
  Save,
  Search,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';
import { mdtService } from '../services/mdtService';
import { patientService } from '../services/patientService';
import { doctorsService } from '../services/doctorsService';
import SuccessModal from './modals/SuccessModal';
import ErrorModal from './modals/ErrorModal';

const MDTNotesModal = ({ isOpen, onClose, patientName, outcome, meetingId }) => {
  // Handle Escape key to close modal (read-only, no unsaved changes check)
  useEscapeKey(onClose, isOpen);

  // State for editing mode
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    author: '',
    designation: '',
    department: 'MDT',
    meetingType: '',
    attendees: [],
    patientInfo: {
      name: '',
      patientId: '',
      age: '',
      gender: '',
      mrn: '',
      diagnosis: '',
      psaLevel: '',
      lastImagingDate: ''
    },
    clinicalSummary: '',
    content: '',
    mdtOutcome: '',
    decisions: [],
    outcomes: [],
    recommendations: [],
    actionItems: [],
    documents: []
  });

  // Existing saved notes to show in summary while keeping editor blank
  const [existingNotes, setExistingNotes] = useState('');
  // Local input states for controlled inputs
  const [recommendationInput, setRecommendationInput] = useState('');
  const [actionItemInput, setActionItemInput] = useState('');
  // Save feedback toast
  const [saveToast, setSaveToast] = useState({ visible: false, type: 'success', message: '' });

  // Initialize form data when modal opens
  useEffect(() => {
    const load = async () => {
      if (!isOpen) return;
      if (meetingId) {
        const res = await mdtService.getMeetingById(meetingId);
        if (res.success && res.data) {
          const m = res.data;
          // Fetch patient detailed info
          let pInfo = { name: m.patient?.name || patientName || 'Patient', patientId: m.patient?.upi || m.patient?.id || '', age: '', gender: '', mrn: m.patient?.upi || '', diagnosis: '', psaLevel: '', lastImagingDate: '' };
          let patientNotesText = '';
          if (m.patient?.id) {
            const pRes = await patientService.getPatientById(m.patient.id);
            if (pRes.success && pRes.data) {
              const p = pRes.data;
              const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.name || patientName || 'Patient';
              pInfo = {
                name: fullName,
                patientId: p.upi || p.id,
                age: p.age ?? '',
                gender: p.gender || '',
                mrn: p.mrn || p.upi || p.id,
                diagnosis: p.diagnosis || '',
                psaLevel: (p.latest_psa ?? p.initial_psa) ? `${(p.latest_psa ?? p.initial_psa)} ng/mL` : '',
                lastImagingDate: p.latest_psa_date || p.initial_psa_date || ''
              };
              patientNotesText = p.notes || '';
            }
          }
          // Extract content (discussion) and clinical summary from notes
          let discussionText = '';
          let summaryFromNotes = '';
          const rawNotes = m.notes;
          if (rawNotes) {
            if (typeof rawNotes === 'string') {
              try {
                const parsed = JSON.parse(rawNotes);
                discussionText = parsed?.content || '';
                summaryFromNotes = parsed?.clinicalSummary || '';
              } catch {
                // For meetings created via scheduling, notes is plain text -> treat as clinical summary
                summaryFromNotes = rawNotes || '';
              }
            } else if (typeof rawNotes === 'object') {
              discussionText = rawNotes?.content || '';
              summaryFromNotes = rawNotes?.clinicalSummary || '';
            }
          }
          setExistingNotes(discussionText);
          // Prefer top-level fields from API, fallback to parsed notes
          const recs = Array.isArray(m.recommendations) && m.recommendations.length
            ? m.recommendations
            : ((() => { try { const p = rawNotes && typeof rawNotes === 'string' ? JSON.parse(rawNotes) : (rawNotes || {}); return Array.isArray(p.recommendations) ? p.recommendations : []; } catch { return []; } })());
          const acts = Array.isArray(m.actionItems) && m.actionItems.length
            ? m.actionItems
            : ((() => { try { const p = rawNotes && typeof rawNotes === 'string' ? JSON.parse(rawNotes) : (rawNotes || {}); return Array.isArray(p.actionItems) ? p.actionItems : []; } catch { return []; } })());
          const decs = Array.isArray(m.decisions) && m.decisions.length
            ? m.decisions
            : ((() => { try { const p = rawNotes && typeof rawNotes === 'string' ? JSON.parse(rawNotes) : (rawNotes || {}); return Array.isArray(p.decisions) ? p.decisions : []; } catch { return []; } })());
          const outs = Array.isArray(m.outcomes) && m.outcomes.length
            ? m.outcomes
            : ((() => { try { const p = rawNotes && typeof rawNotes === 'string' ? JSON.parse(rawNotes) : (rawNotes || {}); return Array.isArray(p.outcomes) ? p.outcomes : []; } catch { return []; } })());
          
          // Load attendees - prefer from parsed notes (attendees field), fallback to teamMembers
          let loadedAttendees = [];
          if (Array.isArray(m.attendees) && m.attendees.length > 0) {
            // Use attendees from parsed notes (what was saved)
            loadedAttendees = m.attendees;
          } else {
            // Fallback to teamMembers from database relationships
            try {
              const parsed = rawNotes && typeof rawNotes === 'string' ? JSON.parse(rawNotes) : (rawNotes || {});
              if (Array.isArray(parsed.attendees) && parsed.attendees.length > 0) {
                loadedAttendees = parsed.attendees;
              } else if (Array.isArray(m.teamMembers) && m.teamMembers.length > 0) {
                loadedAttendees = m.teamMembers.map(tm => `${tm.name}${tm.role ? ` (${tm.role})` : ''}`);
              }
            } catch {
              // If parsing fails, try teamMembers
              if (Array.isArray(m.teamMembers) && m.teamMembers.length > 0) {
                loadedAttendees = m.teamMembers.map(tm => `${tm.name}${tm.role ? ` (${tm.role})` : ''}`);
              }
            }
          }
          
          setFormData({
            date: toLocalYmd(m.meetingDate),
            time: (m.meetingTime || '00:00').slice(0,5),
            author: m.createdBy?.name || '',
            designation: m.createdBy?.role || '',
            department: 'MDT',
            meetingType: '',
            attendees: loadedAttendees,
            patientInfo: pInfo,
            clinicalSummary: summaryFromNotes || patientNotesText || (pInfo.diagnosis ? `Diagnosis: ${pInfo.diagnosis}` : ''),
            content: discussionText,
            mdtOutcome: m.mdtOutcome || '',
            decisions: decs,
            outcomes: outs,
            recommendations: recs,
            actionItems: acts,
            documents: []
          });
          setIsEditing(true);
          return;
        }
      }
      // Fallback minimal when no meetingId
      setFormData(prev => ({
        ...prev,
        department: 'MDT',
        meetingType: '',
        patientInfo: { ...prev.patientInfo, name: patientName || '' },
      }));
      setIsEditing(true);
    };
    load();
  }, [isOpen, meetingId, patientName]);

  // Helper functions for form handling
  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addDecision = () => {
    const newDecision = {
      id: Date.now(),
      decision: '',
      rationale: '',
      priority: 'Medium',
      status: 'Pending'
    };
    setFormData(prev => ({
      ...prev,
      decisions: [...prev.decisions, newDecision]
    }));
  };

  const updateDecision = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      decisions: prev.decisions.map(decision =>
        decision.id === id ? { ...decision, [field]: value } : decision
      )
    }));
  };

  const removeDecision = (id) => {
    setFormData(prev => ({
      ...prev,
      decisions: prev.decisions.filter(decision => decision.id !== id)
    }));
  };

  const addOutcome = () => {
    const newOutcome = {
      id: Date.now(),
      outcome: '',
      status: 'Scheduled',
      date: '',
      responsible: ''
    };
    setFormData(prev => ({
      ...prev,
      outcomes: [...prev.outcomes, newOutcome]
    }));
  };

  const updateOutcome = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      outcomes: prev.outcomes.map(outcome =>
        outcome.id === id ? { ...outcome, [field]: value } : outcome
      )
    }));
  };

  const removeOutcome = (id) => {
    setFormData(prev => ({
      ...prev,
      outcomes: prev.outcomes.filter(outcome => outcome.id !== id)
    }));
  };

  const addRecommendation = () => {
    setFormData(prev => ({
      ...prev,
      recommendations: [...prev.recommendations, '']
    }));
  };

  const updateRecommendation = (index, value) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.map((rec, i) => i === index ? value : rec)
    }));
  };

  const removeRecommendation = (index) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index)
    }));
  };

  const addActionItem = () => {
    setFormData(prev => ({
      ...prev,
      actionItems: [...prev.actionItems, '']
    }));
  };

  const updateActionItem = (index, value) => {
    setFormData(prev => ({
      ...prev,
      actionItems: prev.actionItems.map((item, i) => i === index ? value : item)
    }));
  };

  const removeActionItem = (index) => {
    setFormData(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newDocuments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type.split('/')[1] || 'unknown',
      uploadDate: new Date().toISOString().split('T')[0],
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      file: file
    }));
    
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocuments]
    }));
  };

  const removeDocument = (id) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
  };

  const handleSave = async () => {
    if (!meetingId) {
      console.warn('Cannot save MDT notes without meetingId');
      setIsEditing(false);
      return;
    }
    const payload = {
      content: formData.content,
      mdtOutcome: formData.mdtOutcome,
      recommendations: formData.recommendations,
      actionItems: formData.actionItems,
      decisions: formData.decisions,
      outcomes: formData.outcomes,
      attendees: formData.attendees,
      clinicalSummary: formData.clinicalSummary,
      patientInfo: formData.patientInfo,
      meta: {
        author: formData.author,
        designation: formData.designation,
        department: formData.department,
        date: formData.date,
        time: formData.time
      }
    };
    const res = await mdtService.saveMDTNotes(meetingId, payload);
    if (res.success) {
      // Apply returned data immediately for instant UI update
      const m = res.data || {};
      let discussionText = m.content || '';
      let summaryFromNotes = m.clinicalSummary || '';
      if (!discussionText || !summaryFromNotes) {
        try {
          const parsed = m.notes ? (typeof m.notes === 'string' ? JSON.parse(m.notes) : m.notes) : {};
          discussionText = discussionText || parsed.content || '';
          summaryFromNotes = summaryFromNotes || parsed.clinicalSummary || '';
        } catch {}
      }
      setExistingNotes(discussionText);
      setFormData(prev => {
        // Get attendees from response - prefer top-level field, then parsed notes, then keep current
        let savedAttendees = prev.attendees;
        if (Array.isArray(m.attendees) && m.attendees.length > 0) {
          savedAttendees = m.attendees;
        } else {
          try {
            const parsed = m.notes ? (typeof m.notes === 'string' ? JSON.parse(m.notes) : m.notes) : {};
            if (Array.isArray(parsed.attendees) && parsed.attendees.length > 0) {
              savedAttendees = parsed.attendees;
            }
          } catch {}
        }
        
        return {
          ...prev,
          date: toLocalYmd(m.meetingDate || prev.date),
          time: (m.meetingTime || prev.time || '00:00').slice(0,5),
          clinicalSummary: summaryFromNotes || prev.clinicalSummary,
          content: discussionText,
          mdtOutcome: m.mdtOutcome ?? prev.mdtOutcome,
          recommendations: Array.isArray(m.recommendations) ? m.recommendations : prev.recommendations,
          actionItems: Array.isArray(m.actionItems) ? m.actionItems : prev.actionItems,
          decisions: Array.isArray(m.decisions) ? m.decisions : prev.decisions,
          outcomes: Array.isArray(m.outcomes) ? m.outcomes : prev.outcomes,
          attendees: savedAttendees
        };
      });
      setIsEditing(false);
      setSaveToast({ visible: true, type: 'success', message: 'Meeting record saved successfully' });
      setTimeout(() => setSaveToast(s => ({ ...s, visible: false })), 2000);
    } else {
      setSaveToast({ visible: true, type: 'error', message: res.error || 'Failed to save MDT notes' });
      setTimeout(() => setSaveToast(s => ({ ...s, visible: false })), 2500);
    }
  };

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  // Team member dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [availableTeamMembers, setAvailableTeamMembers] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [newTeamMember, setNewTeamMember] = useState({
    name: '',
    department: '',
    email: '',
    phone: ''
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showAddMemberSuccessModal, setShowAddMemberSuccessModal] = useState(false);
  const [showAddMemberErrorModal, setShowAddMemberErrorModal] = useState(false);
  const [addMemberSuccessMessage, setAddMemberSuccessMessage] = useState('');
  const [addMemberErrorMessage, setAddMemberErrorMessage] = useState('');
  
  // Department dropdown state
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);

  // Check if meeting is complete (has outcome and content entered)
  const isMeetingComplete = formData.mdtOutcome && formData.mdtOutcome.trim() !== '' && 
                           formData.content && formData.content.trim() !== '';

  // Prefill reschedule fields when opening
  useEffect(() => {
    if (isOpen) {
      setRescheduleDate((formData.date || '').toString().slice(0, 10));
      setRescheduleTime((formData.time || '00:00').slice(0, 5));
    }
  }, [isOpen, formData.date, formData.time]);

  // Fetch doctors and departments
  const fetchDoctorsAndDepartments = async () => {
    setLoadingDoctors(true);
    try {
      const [doctorsResponse, departmentsResponse] = await Promise.all([
        doctorsService.getDoctorsForDropdown(),
        doctorsService.getAllDepartments({ is_active: true })
      ]);
      
      setAvailableTeamMembers(doctorsResponse);
      setDepartments(departmentsResponse.success ? departmentsResponse.data : []);
    } catch (error) {
      console.error('Error fetching doctors and departments:', error);
      setAvailableTeamMembers([]);
      setDepartments([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDoctorsAndDepartments();
    }
  }, [isOpen]);

  // Filter team members based on search and exclude already added
  const filteredTeamMembers = availableTeamMembers.filter(member => {
    const memberName = member.name || '';
    const isAlreadyAdded = formData.attendees.some(attendee => 
      attendee.toLowerCase().includes(memberName.toLowerCase()) ||
      memberName.toLowerCase().includes(attendee.toLowerCase())
    );
    return !isAlreadyAdded && 
           memberName.toLowerCase().includes(dropdownSearchTerm.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close department dropdown when clicking outside
  useEffect(() => {
    if (!isDepartmentDropdownOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.department-dropdown-container')) {
        setIsDepartmentDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDepartmentDropdownOpen]);

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSelectTeamMember = (member) => {
    const memberName = member.name || '';
    if (memberName && !formData.attendees.includes(memberName)) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, memberName]
      }));
    }
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleAddNewTeamMember = async () => {
    if (newTeamMember.name && newTeamMember.department) {
      setIsAddingMember(true);
      setAddMemberErrorMessage('');
      setAddMemberSuccessMessage('');
      
      try {
        // Find the department ID
        const department = departments.find(dept => 
          dept.name.toLowerCase() === newTeamMember.department.toLowerCase()
        );
        
        if (!department) {
          setAddMemberErrorMessage('Department not found. Please select a valid department.');
          setShowAddMemberErrorModal(true);
          setIsAddingMember(false);
          return;
        }
        
        // Create the doctor
        const doctorData = {
          first_name: newTeamMember.name.split(' ')[0] || newTeamMember.name,
          last_name: newTeamMember.name.split(' ').slice(1).join(' ') || '',
          email: newTeamMember.email || null,
          phone: newTeamMember.phone || null,
          department_id: department.id,
          specialization: newTeamMember.department
        };
        
        const response = await doctorsService.createDoctor(doctorData);
        
        if (response.success) {
          // Prepare the object used by the dropdown immediately
          const newDoctor = {
            id: response.data.id,
            name: doctorsService.formatDoctorName(response.data),
            first_name: response.data.first_name,
            last_name: response.data.last_name,
            specialization: response.data.specialization,
            department_name: department.name
          };

          // Optimistically add to the available list
          setAvailableTeamMembers(prev => {
            const exists = prev.some(m => m.id === newDoctor.id);
            return exists ? prev : [newDoctor, ...prev];
          });

          // Add the new doctor to the current attendees
          if (newDoctor.name && !formData.attendees.includes(newDoctor.name)) {
            setFormData(prev => ({
              ...prev,
              attendees: [...prev.attendees, newDoctor.name]
            }));
          }

          // Refresh the doctors/department lists in the background
          fetchDoctorsAndDepartments();
          setNewTeamMember({ name: '', department: '', email: '', phone: '' });
          setShowAddTeamMemberModal(false);
          
          // Show success modal
          setAddMemberSuccessMessage(`${newDoctor.name} has been added successfully and is now available as a team member.`);
          setShowAddMemberSuccessModal(true);
        } else {
          setAddMemberErrorMessage(response.error || 'Failed to create team member. Please try again.');
          setShowAddMemberErrorModal(true);
        }
      } catch (error) {
        console.error('Error creating new team member:', error);
        setAddMemberErrorMessage(error.message || 'Failed to create new team member. Please try again.');
        setShowAddMemberErrorModal(true);
      } finally {
        setIsAddingMember(false);
      }
    }
  };

  // Convert any date string to local YYYY-MM-DD
  const toLocalYmd = (dateString) => {
    if (!dateString) return '';
    let d;
    const str = String(dateString);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, day] = str.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(str);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };


  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format date for header display (shorter) with safe YYYY-MM-DD parsing
  const formatHeaderDate = (dateString) => {
    if (!dateString) return '';
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateString))) {
      const [y, m, d] = String(dateString).split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateString);
    }
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
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

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="mb-2">
                <h2 className="text-xl font-semibold text-white">
                  Multidisciplinary Team Meeting
                </h2>
                <p className="text-teal-50 text-sm font-medium">
                  {formData.department} • {formData.meetingType || 'New MDT Discussion'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/90">
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-md">
                  <Calendar className="h-4 w-4" />
                  {formatHeaderDate(formData.date)}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-md">
                  <Clock className="h-4 w-4" />
                  {formData.time ? `${formData.time} (${formatTime(formData.time)})` : formatTime(formData.time)}
                </span>
              </div>
              {outcome && (
                <div className="flex items-center gap-2 text-sm text-white/90 mt-2">
                  <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-md">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Latest Outcome: {outcome}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && !isMeetingComplete && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white flex items-center gap-2"
                  aria-label="Edit MDT notes"
                >
                  <Edit3 className="h-4 w-4" />
                  <span className="text-sm">Edit</span>
                </button>
              )}
              <button
                onClick={onClose}
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
          <div className="p-6">
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Note Header (date/time/author already in modal header) */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900">MDT Discussion</h3>
                </div>

                {/* Note Content */}
                <div className="p-6 space-y-6">
                  {/* Patient Information - Read Only */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-600" />
                      Patient Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 mb-2">{formData.patientInfo.name}</h5>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{formData.patientInfo.patientId}</p>
                          <p>{formData.patientInfo.age} years, {formData.patientInfo.gender}</p>
                          <p>MRN: {formData.patientInfo.mrn}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">PSA LEVEL</div>
                          <div className="text-sm font-semibold text-gray-900">{formData.patientInfo.psaLevel || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Summary */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      CLINICAL SUMMARY
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">
                      {formData.clinicalSummary}
                    </p>
                    {/* Intentionally do not show discussion notes inside Clinical Summary */}
                    {/* Removed last imaging from summary per request */}
                  </div>

                  {/* Attendees */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-600" />
                      Attending Clinicians
                    </h4>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={handleDropdownToggle}
                            className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-gray-500">Select team member to add</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-80 overflow-hidden">
                              {/* Search Field */}
                              <div className="p-3 border-b border-gray-200">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                  <input
                                    type="text"
                                    placeholder="Search team members..."
                                    value={dropdownSearchTerm}
                                    onChange={(e) => setDropdownSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              
                              {/* Add New Button */}
                              <div className="p-2 border-b border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddTeamMemberModal(true);
                                    setIsDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add New Team Member
                                </button>
                              </div>
                              
                              {/* Team Members List */}
                              <div className="max-h-48 overflow-y-auto">
                                {loadingDoctors ? (
                                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                    Loading doctors...
                                  </div>
                                ) : filteredTeamMembers.length > 0 ? (
                                  filteredTeamMembers.map((member, index) => (
                                    <button
                                      key={member.id || index}
                                      type="button"
                                      onClick={() => handleSelectTeamMember(member)}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                                    >
                                      {member.name}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                    {dropdownSearchTerm ? 'No team members found matching your search' : 'No available team members'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.attendees.map((attendee, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200 flex items-center gap-1"
                            >
                              {attendee}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData(prev => ({
                                    ...prev,
                                    attendees: prev.attendees.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="ml-1 hover:text-red-600 cursor-pointer"
                                aria-label={`Remove ${attendee}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.attendees.map((attendee, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-200"
                            >
                              {attendee}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{formData.attendees.length} Members</span>
                      </div>
                    )}
                  </div>

                  {/* Clinical Discussion Notes */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-teal-600" />
                      Clinical Discussion Notes
                    </h4>
                    <textarea
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      className="w-full text-sm text-gray-700 leading-relaxed bg-white p-4 rounded-lg border border-gray-300 resize-none"
                      rows={6}
                      placeholder="Document key discussion points, clinical findings, and team deliberations..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.content.length} characters</p>
                  </div>

                  {/* MDT Decision & Outcome */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      MDT Decision & Outcome
                    </h4>
                    <select
                      value={formData.mdtOutcome || ''}
                      onChange={(e) => handleInputChange('mdtOutcome', e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                    >
                      <option value="">Select MDT Outcome</option>
                      <option value="Continue Active Surveillance">Continue Active Surveillance</option>
                      <option value="Schedule for Biopsy">Schedule for Biopsy</option>
                      <option value="Proceed to Surgery">Proceed to Surgery</option>
                      <option value="Continue Current Treatment">Continue Current Treatment</option>
                      <option value="Modify Treatment Plan">Modify Treatment Plan</option>
                      <option value="Refer to Specialist">Refer to Specialist</option>
                      <option value="Discharge from MDT">Discharge from MDT</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Clinical Recommendations */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-teal-600" />
                      Clinical Recommendations
                    </h4>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add clinical recommendation..."
                        className="flex-1 text-sm border border-gray-300 rounded px-3 py-2"
                        value={recommendationInput}
                        onChange={(e) => setRecommendationInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = recommendationInput.trim();
                            if (val) {
                              setFormData(prev => ({
                                ...prev,
                                recommendations: [...prev.recommendations, val]
                              }));
                              setRecommendationInput('');
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const val = recommendationInput.trim();
                          if (val) {
                            setFormData(prev => ({
                              ...prev,
                              recommendations: [...prev.recommendations, val]
                            }));
                            setRecommendationInput('');
                          }
                        }}
                        className="px-3 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    {formData.recommendations.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No recommendations added yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {formData.recommendations.map((recommendation, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                            <CheckCircle className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                            <span className="flex-1">{recommendation}</span>
                            <button
                              onClick={() => removeRecommendation(idx)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Follow-up Action Items */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-teal-600" />
                      Follow-up Action Items
                    </h4>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add follow-up action item..."
                        className="flex-1 text-sm border border-gray-300 rounded px-3 py-2"
                        value={actionItemInput}
                        onChange={(e) => setActionItemInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = actionItemInput.trim();
                            if (val) {
                              setFormData(prev => ({
                                ...prev,
                                actionItems: [...prev.actionItems, val]
                              }));
                              setActionItemInput('');
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const val = actionItemInput.trim();
                          if (val) {
                            setFormData(prev => ({
                              ...prev,
                              actionItems: [...prev.actionItems, val]
                            }));
                            setActionItemInput('');
                          }
                        }}
                        className="px-3 py-2 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    {formData.actionItems.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No action items added yet</p>
                    ) : (
                      <ul className="space-y-2">
                        {formData.actionItems.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                            <div className="w-4 h-4 border-2 border-teal-300 rounded mt-0.5 flex-shrink-0"></div>
                            <span className="flex-1">{action}</span>
                            <button
                              onClick={() => removeActionItem(idx)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all"
            >
              {isEditing ? 'Cancel' : 'Close'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Meeting Record
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    
    {/* Save Toast */}
    {saveToast.visible && (
      <div className={`fixed bottom-5 right-5 z-[70] px-4 py-3 rounded-lg shadow-lg text-white text-sm ${saveToast.type === 'success' ? 'bg-teal-600' : 'bg-red-600'}`}>
        {saveToast.message}
      </div>
    )}

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
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Time</label>
              <input
                type="time"
                value={rescheduleTime}
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
                if (!meetingId) {
                  setRescheduleError('Meeting ID unavailable');
                  setIsRescheduling(false);
                  return;
                }
                const res = await mdtService.rescheduleMDTMeeting(meetingId, payload);
                setIsRescheduling(false);
                if (res.success) {
                  setShowRescheduleModal(false);
                  setFormData(prev => ({
                    ...prev,
                    date: toLocalYmd(res.data.meetingDate),
                    time: (res.data.meetingTime || '00:00').slice(0,5)
                  }));
                  // Dispatch event to refresh dashboard MDT schedules
                  window.dispatchEvent(new CustomEvent('mdt:updated'));
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

    {/* Add Team Member Modal */}
    {showAddTeamMemberModal && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Add New Team Member</h2>
            <button
              onClick={() => setShowAddTeamMemberModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={newTeamMember.name}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department/Specialization
              </label>
              <div className="relative department-dropdown-container">
                <button
                  type="button"
                  onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <span className={newTeamMember.department ? 'text-gray-900' : 'text-gray-500'}>
                    {newTeamMember.department || 'Select Department'}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isDepartmentDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-80 overflow-hidden">
                    {/* Departments List */}
                    <div className="max-h-64 overflow-y-auto">
                      {departments.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-gray-500 text-center">
                          No departments available
                        </div>
                      ) : (
                        departments.map((dept) => (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => {
                              setNewTeamMember(prev => ({ ...prev, department: dept.name }));
                              setIsDepartmentDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            {dept.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={newTeamMember.email}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.smith@hospital.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={newTeamMember.phone}
                onChange={(e) => setNewTeamMember(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
            <button
              onClick={handleAddNewTeamMember}
              disabled={!newTeamMember.name || !newTeamMember.department || isAddingMember}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold py-2 px-4 rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isAddingMember ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </button>
            <button
              onClick={() => setShowAddTeamMemberModal(false)}
              disabled={isAddingMember}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Add Member Success Modal */}
    <SuccessModal
      isOpen={showAddMemberSuccessModal}
      onClose={() => {
        setShowAddMemberSuccessModal(false);
        setAddMemberSuccessMessage('');
      }}
      title="Team Member Added Successfully!"
      message={addMemberSuccessMessage}
    />

    {/* Add Member Error Modal */}
    <ErrorModal
      isOpen={showAddMemberErrorModal}
      onClose={() => {
        setShowAddMemberErrorModal(false);
        setAddMemberErrorMessage('');
      }}
      title="Error Adding Team Member"
      message={addMemberErrorMessage}
    />
    </>
  );
};

export default MDTNotesModal;
