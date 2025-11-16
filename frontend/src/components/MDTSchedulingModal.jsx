import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  X,
  Clock,
  Users,
  Plus,
  Search,
  CheckCircle,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';
import ConfirmModal from './ConfirmModal';
import SuccessModal from './modals/SuccessModal';
import ErrorModal from './modals/ErrorModal';
import { doctorsService } from '../services/doctorsService';

const MDTSchedulingModal = ({ isOpen, onClose, onScheduled, patient }) => {
  // Early return if patient is not provided
  if (!isOpen || !patient) return null;
  
  // Initialize form with current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const [mdtForm, setMdtForm] = useState({
    mdtDate: currentDate,
    time: currentTime,
    priority: 'Medium',
    teamMembers: [],
    notes: ''
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState({
    name: '',
    department: '',
    email: '',
    phone: ''
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scheduledMDTData, setScheduledMDTData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddMemberSuccessModal, setShowAddMemberSuccessModal] = useState(false);
  const [showAddMemberErrorModal, setShowAddMemberErrorModal] = useState(false);
  const [addMemberSuccessMessage, setAddMemberSuccessMessage] = useState('');
  const [addMemberErrorMessage, setAddMemberErrorMessage] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  // Department management states
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false);
  const [showDeleteDepartmentModal, setShowDeleteDepartmentModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [editDepartment, setEditDepartment] = useState({ name: '', description: '' });
  const [isManagingDepartment, setIsManagingDepartment] = useState(false);
  const [departmentError, setDepartmentError] = useState('');
  const [departmentSuccessMessage, setDepartmentSuccessMessage] = useState('');

  // Close confirmation modal
  const closeConfirmModal = (save = false) => {
    setShowConfirmModal(false);
    if (save) {
      // Handle saving logic here if needed
      console.log('Saving changes...');
    }
  };

  // Available team members for dropdown - will be fetched from API
  const [availableTeamMembers, setAvailableTeamMembers] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [departments, setDepartments] = useState([]);

  // Fetch doctors and departments
  const fetchDoctorsAndDepartments = async () => {
    setLoadingDoctors(true);
    try {
      console.log('Fetching doctors and departments...');
      const [doctorsResponse, departmentsResponse] = await Promise.all([
        doctorsService.getDoctorsForDropdown(),
        doctorsService.getAllDepartments({ is_active: true })
      ]);
      
      console.log('Doctors response:', doctorsResponse);
      console.log('Departments response:', departmentsResponse);
      
      setAvailableTeamMembers(doctorsResponse);
      setDepartments(departmentsResponse.success ? departmentsResponse.data : []);
      
      console.log('Updated available team members:', doctorsResponse);
      console.log('Updated departments:', departmentsResponse.success ? departmentsResponse.data : []);
    } catch (error) {
      console.error('Error fetching doctors and departments:', error);
      setAvailableTeamMembers([]);
      setDepartments([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Filter team members based on search
  const filteredTeamMembers = availableTeamMembers.filter(member => 
    !mdtForm.teamMembers.includes(member.name) && 
    member.name.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
  );

  // Reset form when modal opens and fetch doctors
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);
      
      setMdtForm({
        mdtDate: currentDate,
        time: currentTime,
        priority: 'Medium',
        teamMembers: [],
        notes: ''
      });
      
      // Fetch doctors and departments
      fetchDoctorsAndDepartments();
    }
  }, [isOpen]);

  // Close department dropdown when clicking outside
  useEffect(() => {
    if (!isDepartmentDropdownOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      // Check if click is outside the dropdown
      if (!target.closest('.department-dropdown-container')) {
        setIsDepartmentDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDepartmentDropdownOpen]);

  const handleMDTFormChange = (field, value) => {
    setMdtForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTeamMember = (selectedMember) => {
    if (selectedMember && !mdtForm.teamMembers.includes(selectedMember.name)) {
      setMdtForm(prev => ({
        ...prev,
        teamMembers: [...prev.teamMembers, selectedMember.name]
      }));
    }
  };

  const removeTeamMember = (index) => {
    setMdtForm(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index)
    }));
  };

  const handleSelectTeamMember = (member) => {
    addTeamMember(member);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleAddNewTeamMember = async () => {
    if (newTeamMember.name && newTeamMember.department) {
      setIsAddingMember(true);
      setAddMemberErrorMessage('');
      setAddMemberSuccessMessage('');
      
      try {
        console.log('Creating new team member:', newTeamMember);
        console.log('Available departments:', departments);
        
        // Find the department ID
        const department = departments.find(dept => 
          dept.name.toLowerCase() === newTeamMember.department.toLowerCase()
        );
        
        if (!department) {
          console.error('Department not found:', newTeamMember.department);
          setAddMemberErrorMessage('Department not found. Please select a valid department.');
          setShowAddMemberErrorModal(true);
          setIsAddingMember(false);
          return;
        }
        
        console.log('Found department:', department);
        
        // Create the doctor
        const doctorData = {
          first_name: newTeamMember.name.split(' ')[0] || newTeamMember.name,
          last_name: newTeamMember.name.split(' ').slice(1).join(' ') || '',
          email: newTeamMember.email || null,
          phone: newTeamMember.phone || null,
          department_id: department.id,
          specialization: newTeamMember.department
        };
        
        console.log('Doctor data to create:', doctorData);
        
        const response = await doctorsService.createDoctor(doctorData);
        console.log('Create doctor response:', response);
        
        if (response.success) {
          console.log('Doctor created successfully, updating dropdown and refreshing lists...');
          
          // Prepare the object used by the dropdown immediately
          const newDoctor = {
            id: response.data.id,
            name: doctorsService.formatDoctorName(response.data),
            first_name: response.data.first_name,
            last_name: response.data.last_name,
            specialization: response.data.specialization, // backend sends department name here
            department_name: department.name
          };

          // Optimistically add to the available list so it appears instantly
          setAvailableTeamMembers(prev => {
            const exists = prev.some(m => m.id === newDoctor.id);
            return exists ? prev : [newDoctor, ...prev];
          });

          // Add the new doctor to the current MDT team selection
          console.log('Adding new doctor to team:', newDoctor);
          addTeamMember(newDoctor);

          // Refresh the doctors/department lists in the background to stay in sync
          fetchDoctorsAndDepartments();
          setNewTeamMember({ name: '', department: '', email: '', phone: '' });
          setShowAddTeamMemberModal(false);
          
          // Show success modal
          setAddMemberSuccessMessage(`${newDoctor.name} has been added successfully and is now available as a team member.`);
          setShowAddMemberSuccessModal(true);
        } else {
          console.error('Failed to create doctor:', response);
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

  // Department management handlers
  const handleAddDepartment = async () => {
    if (!newDepartment.name || newDepartment.name.trim().length < 2) {
      setDepartmentError('Department name must be at least 2 characters');
      return;
    }

    setIsManagingDepartment(true);
    setDepartmentError('');
    
    try {
      const response = await doctorsService.createDepartment({
        name: newDepartment.name.trim(),
        description: newDepartment.description.trim() || null
      });

      if (response.success) {
        setDepartmentSuccessMessage('Department added successfully!');
        setNewDepartment({ name: '', description: '' });
        setShowAddDepartmentModal(false);
        setIsDepartmentDropdownOpen(false);
        // Refresh departments list
        await fetchDoctorsAndDepartments();
        // Show success message briefly
        setTimeout(() => setDepartmentSuccessMessage(''), 3000);
      } else {
        setDepartmentError(response.error || 'Failed to add department');
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to add department';
      setDepartmentError(errorMsg);
    } finally {
      setIsManagingDepartment(false);
    }
  };

  const handleEditDepartment = async () => {
    if (!editDepartment.name || editDepartment.name.trim().length < 2) {
      setDepartmentError('Department name must be at least 2 characters');
      return;
    }

    if (!selectedDepartment) return;

    setIsManagingDepartment(true);
    setDepartmentError('');
    
    try {
      const response = await doctorsService.updateDepartment(selectedDepartment.id, {
        name: editDepartment.name.trim(),
        description: editDepartment.description.trim() || null
      });

      if (response.success) {
        setDepartmentSuccessMessage('Department updated successfully!');
        setSelectedDepartment(null);
        setEditDepartment({ name: '', description: '' });
        setShowEditDepartmentModal(false);
        setIsDepartmentDropdownOpen(false);
        // Refresh departments list
        await fetchDoctorsAndDepartments();
        // Show success message briefly
        setTimeout(() => setDepartmentSuccessMessage(''), 3000);
      } else {
        setDepartmentError(response.error || 'Failed to update department');
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to update department';
      setDepartmentError(errorMsg);
    } finally {
      setIsManagingDepartment(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    setIsManagingDepartment(true);
    setDepartmentError('');
    
    try {
      const response = await doctorsService.deleteDepartment(selectedDepartment.id);

      if (response.success) {
        setDepartmentSuccessMessage('Department deleted successfully!');
        setSelectedDepartment(null);
        setShowDeleteDepartmentModal(false);
        setIsDepartmentDropdownOpen(false);
        // If the deleted department was selected, clear the selection
        if (newTeamMember.department === selectedDepartment.name) {
          setNewTeamMember(prev => ({ ...prev, department: '' }));
        }
        // Refresh departments list
        await fetchDoctorsAndDepartments();
        // Show success message briefly
        setTimeout(() => setDepartmentSuccessMessage(''), 3000);
      } else {
        setDepartmentError(response.error || 'Failed to delete department');
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to delete department';
      setDepartmentError(errorMsg);
    } finally {
      setIsManagingDepartment(false);
    }
  };

  const openEditDepartmentModal = (dept) => {
    setSelectedDepartment(dept);
    setEditDepartment({ name: dept.name, description: dept.description || '' });
    setDepartmentError('');
    setShowEditDepartmentModal(true);
    setIsDepartmentDropdownOpen(false);
  };

  const openDeleteDepartmentModal = (dept) => {
    setSelectedDepartment(dept);
    setDepartmentError('');
    setShowDeleteDepartmentModal(true);
    setIsDepartmentDropdownOpen(false);
  };

  const handleSubmit = async () => {
    if (!patient) {
      alert('Patient data is missing');
      return;
    }

    if (!mdtForm.mdtDate || !mdtForm.time) {
      alert('Please fill in all required fields (Date, Time)');
      return;
    }

    const mdtData = {
      id: `MDT${Date.now()}`,
      patient: patient,
      timestamp: new Date().toISOString(),
      ...mdtForm
    };

    console.log('Scheduling MDT:', mdtData);
    
    try {
      if (onScheduled) {
        // Let parent perform API call and handle success/error modals
        await onScheduled(mdtData);
      }
    } catch (e) {
      // Parent shows error modal; no local success modal
      console.error('MDT schedule submit failed:', e);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setScheduledMDTData(null);
    onClose();
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = mdtForm.notes.trim() !== '' || 
                           mdtForm.teamMembers.length > 4 || // More than default team
                           mdtForm.priority !== 'Medium' ||
                           mdtForm.mdtDate !== currentDate ||
                           mdtForm.time !== currentTime;

  // Handle save function for Escape key
  const handleSaveChanges = (e) => {
    if (e) e.preventDefault();
    handleSubmit();
  };

  // Handle Escape key with save confirmation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed in MDTSchedulingModal!');
        console.log('hasUnsavedChanges:', hasUnsavedChanges);
        
        event.preventDefault();
        event.stopPropagation();

        // Call handleCancel which will check for unsaved changes
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, hasUnsavedChanges]);

  if (!isOpen) return null;

  // Success Modal
  if (showSuccessModal && scheduledMDTData) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full z-[110] flex items-center justify-center p-4">
        <div className="relative mx-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-200 px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg mb-3 sm:mb-4 animate-pulse">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 text-center">MDT Meeting Scheduled Successfully!</h3>
              <p className="text-xs sm:text-sm text-gray-600 text-center mt-1 sm:mt-2">
                The multidisciplinary team meeting has been scheduled
              </p>
            </div>

            {/* Success Content */}
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="space-y-3 sm:space-y-4">
                {/* Meeting Details */}
                <div className="bg-gradient-to-r from-teal-50 to-gray-50 border border-teal-200 rounded-lg p-3 sm:p-5">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-teal-600" />
                    Meeting Details
                  </h4>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start">
                      <span className="font-semibold text-gray-700 w-20 sm:w-32 mb-1 sm:mb-0">Patient:</span>
                      <span className="text-gray-900">
                        {scheduledMDTData.patient.name} (ID: {scheduledMDTData.patient.id})
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start">
                      <span className="font-semibold text-gray-700 w-20 sm:w-32 mb-1 sm:mb-0">Date & Time:</span>
                      <span className="text-gray-900">
                        {new Date(scheduledMDTData.mdtDate).toLocaleDateString('en-AU', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })} at {scheduledMDTData.time}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start">
                      <span className="font-semibold text-gray-700 w-20 sm:w-32 mb-1 sm:mb-0">Priority:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        scheduledMDTData.priority === 'High' ? 'bg-red-100 text-red-800' :
                        scheduledMDTData.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-teal-100 text-teal-800'
                      }`}>
                        {scheduledMDTData.priority}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start">
                      <span className="font-semibold text-gray-700 w-20 sm:w-32 mb-1 sm:mb-0">Meeting ID:</span>
                      <span className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {scheduledMDTData.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-5">
                  <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                    Team Members ({scheduledMDTData.teamMembers.length})
                  </h4>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {scheduledMDTData.teamMembers.map((member, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                        {member}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                {scheduledMDTData.notes && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-5">
                    <h4 className="text-sm sm:text-md font-semibold text-gray-900 mb-2">Additional Notes</h4>
                    <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">{scheduledMDTData.notes}</p>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-5">
                  <h4 className="text-sm sm:text-md font-semibold text-blue-900 mb-2">Next Steps</h4>
                  <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-blue-800">
                    <li className="flex items-start">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Calendar invitations will be sent to all team members</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Patient records and imaging will be prepared for review</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Meeting details have been saved to the patient's timeline</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={handleCloseSuccessModal}
                className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg hover:from-teal-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 shadow-sm text-sm sm:text-base"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Scheduling Form
  return (
    <>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full z-[110] flex items-center justify-center p-4">
      <div className="relative mx-auto w-full max-w-5xl">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-50 to-gray-50 border-b border-gray-200 px-6 py-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-800 rounded-lg flex items-center justify-center shadow-sm">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Schedule MDT Meeting</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Schedule multidisciplinary team discussion for {patient?.name}
                  </p>
                  {mdtForm.mdtDate && mdtForm.time && (
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(mdtForm.mdtDate).toLocaleDateString('en-AU')}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {mdtForm.time}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 py-6 flex-1 overflow-y-auto">
            <div className="space-y-6">
              {/* Patient Information Display */}
              {patient && (
                <div className="bg-gradient-to-r from-teal-50 to-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-800 to-black rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {patient?.name ? patient.name.split(' ').map(n => n[0]).join('') : 'N/A'}
                        </span>
                      </div>
                      {patient?.priority === 'High' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{patient?.name || 'Unknown Patient'}</h4>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-1">
                        <span>ID: {patient?.id || 'N/A'}</span>
                        <span>Age: {patient?.age || 'N/A'}</span>
                        <span>PSA: {patient?.psa || 'N/A'} ng/mL</span>
                        {patient?.gleasonScore && (
                          <span>Gleason: {patient.gleasonScore}</span>
                        )}
                        {patient?.stage && (
                          <span>Stage: {patient.stage}</span>
                        )}
                      </div>
                      {patient?.clinicalNotes && (
                        <p className="text-sm text-gray-500 mt-1">Notes: {patient.clinicalNotes}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MDT Scheduling Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Meeting Details</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      MDT Date *
                    </label>
                    <input
                      type="date"
                      value={mdtForm.mdtDate}
                      onChange={(e) => handleMDTFormChange('mdtDate', e.target.value)}
                      min={(() => {
                        const now = new Date();
                        return now.getFullYear() + '-' + 
                               String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(now.getDate()).padStart(2, '0');
                      })()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={mdtForm.time}
                      onChange={(e) => handleMDTFormChange('time', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Priority
                    </label>
                    <select
                      value={mdtForm.priority}
                      onChange={(e) => handleMDTFormChange('priority', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Team Members</h4>
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={handleDropdownToggle}
                      className="flex items-center justify-between w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white hover:bg-gray-50 transition-colors"
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
                </div>
                <div className="space-y-3">
                  {mdtForm.teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        {member}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTeamMember(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove team member"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h4>
                <textarea
                  value={mdtForm.notes}
                  onChange={(e) => handleMDTFormChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Add any additional notes or information about this MDT meeting..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">Optional: Add any relevant notes for the MDT meeting</p>
              </div>

              {/* Summary */}
              {patient && mdtForm.mdtDate && mdtForm.time && (
                <div className="p-4 bg-gradient-to-r from-teal-50 to-teal-50 rounded-lg border border-teal-100">
                  <div className="flex items-center mb-3">
                    <div className="h-2 w-2 bg-teal-500 rounded-full mr-2"></div>
                    <h4 className="text-sm font-semibold text-teal-900">MDT Meeting Summary</h4>
                  </div>
                  <div className="text-sm text-teal-800 space-y-2">
                    <p><strong>Patient:</strong> {patient?.name || 'Unknown Patient'} ({patient?.id || 'N/A'})</p>
                    <p><strong>Date:</strong> {new Date(mdtForm.mdtDate).toLocaleDateString('en-AU', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {mdtForm.time}</p>
                    <p><strong>Priority:</strong> {mdtForm.priority}</p>
                    <p><strong>Team Members:</strong> {mdtForm.teamMembers.length} members</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <div className="flex space-x-3">
              <button
                onClick={handleSubmit}
                disabled={!patient || !mdtForm.mdtDate || !mdtForm.time}
                className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-teal-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Calendar className="h-4 w-4 mr-2 inline" />
                Schedule MDT Meeting
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

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
                      {/* Add Department Button */}
                      <div className="p-2 border-b border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddDepartmentModal(true);
                            setIsDepartmentDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Department
                        </button>
                      </div>
                      
                      {/* Departments List */}
                      <div className="max-h-64 overflow-y-auto">
                        {departments.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            No departments available
                          </div>
                        ) : (
                          departments.map((dept) => (
                            <div
                              key={dept.id}
                              className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTeamMember(prev => ({ ...prev, department: dept.name }));
                                  setIsDepartmentDropdownOpen(false);
                                }}
                                className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900"
                              >
                                {dept.name}
                              </button>
                              <div className="flex items-center space-x-1 ml-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDepartmentModal(dept);
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit department"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteDepartmentModal(dept);
                                  }}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Delete department"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {departmentSuccessMessage && (
                  <p className="text-xs text-green-600 mt-1">{departmentSuccessMessage}</p>
                )}
                {departmentError && (
                  <p className="text-xs text-red-600 mt-1">{departmentError}</p>
                )}
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
    </div>
    
    {/* Confirmation Modal */}
    <ConfirmModal
      isOpen={showConfirmModal}
      onConfirm={closeConfirmModal}
      onCancel={() => closeConfirmModal(false)}
      title="Unsaved Changes"
      message="You have unsaved changes. Do you want to save before closing?"
    />

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
      title="Failed to Add Team Member"
      message={addMemberErrorMessage}
    />

    {/* Add Department Modal */}
    {showAddDepartmentModal && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Add New Department</h2>
            <button
              onClick={() => {
                setShowAddDepartmentModal(false);
                setNewDepartment({ name: '', description: '' });
                setDepartmentError('');
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department Name *
              </label>
              <input
                type="text"
                value={newDepartment.name}
                onChange={(e) => {
                  setNewDepartment(prev => ({ ...prev, name: e.target.value }));
                  setDepartmentError('');
                }}
                placeholder="e.g., Cardiology"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={newDepartment.description}
                onChange={(e) => {
                  setNewDepartment(prev => ({ ...prev, description: e.target.value }));
                  setDepartmentError('');
                }}
                placeholder="Brief description of the department"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                maxLength={500}
              />
            </div>
            {departmentError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                {departmentError}
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
            <button
              onClick={handleAddDepartment}
              disabled={!newDepartment.name || newDepartment.name.trim().length < 2 || isManagingDepartment}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold py-2 px-4 rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isManagingDepartment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Department'
              )}
            </button>
            <button
              onClick={() => {
                setShowAddDepartmentModal(false);
                setNewDepartment({ name: '', description: '' });
                setDepartmentError('');
              }}
              disabled={isManagingDepartment}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Edit Department Modal */}
    {showEditDepartmentModal && selectedDepartment && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Department</h2>
            <button
              onClick={() => {
                setShowEditDepartmentModal(false);
                setSelectedDepartment(null);
                setEditDepartment({ name: '', description: '' });
                setDepartmentError('');
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department Name *
              </label>
              <input
                type="text"
                value={editDepartment.name}
                onChange={(e) => {
                  setEditDepartment(prev => ({ ...prev, name: e.target.value }));
                  setDepartmentError('');
                }}
                placeholder="e.g., Cardiology"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={editDepartment.description}
                onChange={(e) => {
                  setEditDepartment(prev => ({ ...prev, description: e.target.value }));
                  setDepartmentError('');
                }}
                placeholder="Brief description of the department"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                maxLength={500}
              />
            </div>
            {departmentError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                {departmentError}
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
            <button
              onClick={handleEditDepartment}
              disabled={!editDepartment.name || editDepartment.name.trim().length < 2 || isManagingDepartment}
              className="flex-1 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold py-2 px-4 rounded-lg hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isManagingDepartment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Department'
              )}
            </button>
            <button
              onClick={() => {
                setShowEditDepartmentModal(false);
                setSelectedDepartment(null);
                setEditDepartment({ name: '', description: '' });
                setDepartmentError('');
              }}
              disabled={isManagingDepartment}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete Department Confirmation Modal */}
    {showDeleteDepartmentModal && selectedDepartment && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Delete Department</h2>
            <button
              onClick={() => {
                setShowDeleteDepartmentModal(false);
                setSelectedDepartment(null);
                setDepartmentError('');
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete the department <strong>"{selectedDepartment.name}"</strong>?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              This action cannot be undone. If there are doctors associated with this department, you will need to remove or reassign them first.
            </p>
            {departmentError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-4">
                {departmentError}
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3">
            <button
              onClick={handleDeleteDepartment}
              disabled={isManagingDepartment}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-2 px-4 rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {isManagingDepartment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Department'
              )}
            </button>
            <button
              onClick={() => {
                setShowDeleteDepartmentModal(false);
                setSelectedDepartment(null);
                setDepartmentError('');
              }}
              disabled={isManagingDepartment}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default MDTSchedulingModal;
