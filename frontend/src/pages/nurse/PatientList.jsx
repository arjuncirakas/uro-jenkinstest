import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar, FiTrash2 } from 'react-icons/fi';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import UpdateAppointmentModal from '../../components/UpdateAppointmentModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import { patientService } from '../../services/patientService';

const PatientList = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrologist, setSelectedUrologist] = useState('all');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [isUpdateAppointmentModalOpen, setIsUpdateAppointmentModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // API state
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [urologists, setUrologists] = useState([]);

  // Fetch patients from API
  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await patientService.getPatients({
        page: 1,
        limit: 100, // Get more patients for the list
        search: searchQuery,
        status: 'Active'
      });
      
      if (result.success) {
        console.log('✅ PatientList: Patient data received:', result.data);
        console.log('✅ PatientList: Number of patients:', result.data?.length || 0);
        const updatedPatients = result.data || [];
        setPatients(updatedPatients);
        
        // Update selectedPatient if it exists in the updated list
        if (selectedPatient) {
          const updatedSelectedPatient = updatedPatients.find(p => p.id === selectedPatient.id);
          if (updatedSelectedPatient) {
            setSelectedPatient(updatedSelectedPatient);
          }
        }
        
        // Extract unique urologists
        const uniqueUrologists = [...new Set(
          updatedPatients
            .map(patient => patient.assignedUrologist)
            .filter(urologist => urologist && urologist.trim() !== '')
        )].sort();
        console.log('✅ PatientList: Unique urologists:', uniqueUrologists);
        setUrologists(uniqueUrologists);
      } else {
        setError(result.error || 'Failed to fetch patients');
        console.error('Error fetching patients:', result.error);
      }
    } catch (error) {
      setError('Failed to fetch patients');
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load patients on component mount and when search query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPatients();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Listen for PSA update events to refresh patient list
  useEffect(() => {
    const handlePSAUpdated = (event) => {
      console.log('PSA updated event received, refreshing patient list:', event.detail);
      fetchPatients();
    };

    window.addEventListener('psaResultAdded', handlePSAUpdated);
    window.addEventListener('psaResultUpdated', handlePSAUpdated);
    
    return () => {
      window.removeEventListener('psaResultAdded', handlePSAUpdated);
      window.removeEventListener('psaResultUpdated', handlePSAUpdated);
    };
  }, []);

  // Listen for appointment update events to refresh patient list
  useEffect(() => {
    const handleAppointmentUpdated = (event) => {
      console.log('Appointment updated event received, refreshing patient list:', event.detail);
      fetchPatients();
    };

    window.addEventListener('investigationBooked', handleAppointmentUpdated);
    window.addEventListener('surgery:updated', handleAppointmentUpdated);
    window.addEventListener('appointment:updated', handleAppointmentUpdated);
    
    return () => {
      window.removeEventListener('investigationBooked', handleAppointmentUpdated);
      window.removeEventListener('surgery:updated', handleAppointmentUpdated);
      window.removeEventListener('appointment:updated', handleAppointmentUpdated);
    };
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get PSA indicator color based on threshold
  const getPSAColor = (psaValue) => {
    const psa = parseFloat(psaValue);
    if (isNaN(psa)) {
      return { textColor: 'text-gray-900', dotColor: 'bg-gray-400' };
    }
    
    // PSA threshold: >4 ng/mL is typically considered elevated
    if (psa > 4) {
      return { textColor: 'text-gray-900', dotColor: 'bg-red-500' }; // High risk - above threshold
    } else {
      return { textColor: 'text-gray-900', dotColor: 'bg-green-500' }; // Normal - below threshold
    }
  };

  // Determine patient pathway based on data from API
  const getPatientPathway = (patient) => {
    // Use the actual care pathway from the API
    return patient.carePathway || patient.care_pathway || patient.pathway || 'OPD Queue';
  };

  // Get pathway status styling
  const getPathwayStyle = (pathway) => {
    switch (pathway) {
      case 'OPD Queue':
        return 'bg-blue-100 text-blue-800';
      case 'Active Surveillance':
      case 'Active Monitoring':
        return 'bg-green-100 text-green-800';
      case 'Surgical Pathway':
        return 'bg-orange-100 text-orange-800';
      case 'Post-Op Follow-up':
        return 'bg-purple-100 text-purple-800';
      case 'Medications':
      case 'Medication':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  // Filter patients based on search query and urologist selection
  // NOTE: This page shows ALL patients across ALL pathways (no pathway restriction)
  // Search will find patients from any pathway (Active Monitoring, Surgery, Post-op, etc.)
  const filteredPatients = patients.filter(patient => {
    const patientPathway = getPatientPathway(patient);
    const patientUrologist = patient.assignedUrologist || 'Unassigned';
    
    // If no search query, only filter by urologist
    if (!searchQuery || searchQuery.trim() === '') {
      const matchesUrologist = selectedUrologist === 'all' || patientUrologist === selectedUrologist;
      return matchesUrologist;
    }
    
    // Search logic - similar to superadmin panel
    const searchLower = searchQuery.trim().toLowerCase();
    const firstName = (patient.firstName || '').toLowerCase().trim();
    const lastName = (patient.lastName || '').toLowerCase().trim();
    const fullName = (patient.fullName || '').toLowerCase().trim();
    const fullNameNoSpace = `${firstName}${lastName}`.toLowerCase();
    const upi = (patient.upi || '').toLowerCase();
    const pathway = patientPathway.toLowerCase();
    const urologist = patientUrologist.toLowerCase();
    
    // Check multiple search criteria:
    // 1. Full name (first + last with space)
    // 2. Full name without space
    // 3. First name
    // 4. Last name
    // 5. UPI
    // 6. Pathway
    // 7. Urologist
    const matchesSearch = fullName.includes(searchLower) ||
                         fullNameNoSpace.includes(searchLower) ||
                         firstName.includes(searchLower) ||
                         lastName.includes(searchLower) ||
                         upi.includes(searchLower) ||
                         pathway.includes(searchLower) ||
                         urologist.includes(searchLower);
    
    const matchesUrologist = selectedUrologist === 'all' || patientUrologist === selectedUrologist;
    
    return matchesSearch && matchesUrologist;
  });

  // Handle patient actions
  const handleViewDetails = (patient) => {
    setSelectedPatient(patient);
    setIsPatientDetailsModalOpen(true);
  };

  const handleUpdateAppointment = (patient) => {
    setSelectedPatient(patient);
    setIsUpdateAppointmentModalOpen(true);
  };

  const handleDeleteClick = (patient) => {
    setPatientToDelete(patient);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await patientService.deletePatient(patientToDelete.id);
      
      if (result.success) {
        // Remove patient from the list
        setPatients(prevPatients => prevPatients.filter(p => p.id !== patientToDelete.id));
        
        // Clear selected patient if it was the deleted one
        if (selectedPatient && selectedPatient.id === patientToDelete.id) {
          setSelectedPatient(null);
          setIsPatientDetailsModalOpen(false);
        }
        
        setIsDeleteConfirmModalOpen(false);
        setPatientToDelete(null);
        
        // Refresh the patient list to ensure consistency
        fetchPatients();
        
        // Dispatch event to notify other components (like OPDManagement) to refresh
        window.dispatchEvent(new CustomEvent('patientDeleted', {
          detail: { patientId: patientToDelete.id }
        }));
        
        console.log('✅ Patient deleted successfully from database');
      } else {
        console.error('Failed to delete patient:', result.error);
        alert(`Failed to delete patient: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('An error occurred while deleting the patient');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteConfirmModalOpen(false);
    setPatientToDelete(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <NurseHeader 
          title="Patient List"
          subtitle="All patients under urology care"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name"
        />

        {/* Filter Controls */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {selectedUrologist !== 'all' && (
              <div className="inline-flex items-center bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">
                    Filtered by: <span className="font-semibold text-teal-700">{selectedUrologist}</span>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedUrologist('all')}
                  className="ml-3 px-3 py-1 bg-white border border-teal-300 text-teal-700 text-xs font-medium rounded-md hover:bg-teal-50 hover:border-teal-400 transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="urologist-filter" className="text-sm font-medium text-gray-700">
              Filter by Urologist:
            </label>
            <select
              id="urologist-filter"
              value={selectedUrologist}
              onChange={(e) => setSelectedUrologist(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Urologists</option>
              {urologists.map((urologist) => (
                <option key={urologist} value={urologist}>
                  {urologist}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Patient Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">UROLOGIST</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">PATHWAY</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PSA LEVEL</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">BOOK APPOINTMENT</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">ACTIONS</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">DELETE</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading patients...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="text-center">
                        <div className="text-red-600 text-sm mb-2">{error}</div>
                        <button
                          onClick={fetchPatients}
                          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                      {searchQuery ? 'No patients found matching your search' : 'No patients found'}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const patientPathway = getPatientPathway(patient);
                    const patientUrologist = patient.assignedUrologist || 'Unassigned';
                    
                    return (
                      <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(patient.fullName || 'Unknown')}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{patient.fullName || 'Unknown Patient'}</div>
                              <div className="text-xs text-gray-600">
                                UPI: {patient.upi} • Age: {patient.age} • {patient.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm font-medium text-gray-900">{patientUrologist}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPathwayStyle(patientPathway)}`}>
                            {patientPathway}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-700 text-sm">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 ${getPSAColor(patient.latestPSA || patient.initialPSA).dotColor} rounded-full mr-2`}></div>
                            <span className={getPSAColor(patient.latestPSA || patient.initialPSA).textColor}>{patient.latestPSA || patient.initialPSA || 0} ng/mL</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {patientPathway.toLowerCase() === 'medications' || 
                           patientPathway.toLowerCase() === 'medication' ? (
                            <span className="text-gray-400 text-xs">—</span>
                          ) : (() => {
                            // Check if patient has an appointment booked
                            // Backend now provides hasAppointment boolean, with fallback to date/time check
                            const hasAppointment = patient.hasAppointment !== undefined 
                              ? patient.hasAppointment 
                              : !!(patient.nextAppointmentDate || patient.nextAppointmentTime);
                            
                            return (
                              <button 
                                onClick={() => handleUpdateAppointment(patient)}
                                className="px-3 py-1 bg-teal-50 text-teal-600 text-xs rounded-md border border-teal-200 hover:bg-teal-100 transition-colors flex items-center space-x-1 mx-auto"
                              >
                                <FiCalendar className="w-3 h-3" />
                                <span>{hasAppointment ? 'Update Appointment' : 'Book Appointment'}</span>
                              </button>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button 
                            onClick={() => handleViewDetails(patient)}
                            className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-1 mx-auto"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View Details</span>
                          </button>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button 
                            onClick={() => handleDeleteClick(patient)}
                            className="p-2 bg-red-50 text-red-600 rounded-md border border-red-200 hover:bg-red-100 transition-colors mx-auto"
                            title="Delete Patient"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Nurse Patient Details Modal */}
      <NursePatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
      />

      {/* Update Appointment Modal */}
      <UpdateAppointmentModal 
        isOpen={isUpdateAppointmentModalOpen}
        onClose={() => {
          setIsUpdateAppointmentModalOpen(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
        onSuccess={() => {
          // Refresh patient list after successful appointment update
          fetchPatients();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteConfirmModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Patient"
        message={`Are you sure you want to permanently delete ${patientToDelete?.fullName || 'this patient'}? This action cannot be undone. All patient data including appointments, notes, investigation results, and bookings will be permanently removed from the database.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default PatientList;
