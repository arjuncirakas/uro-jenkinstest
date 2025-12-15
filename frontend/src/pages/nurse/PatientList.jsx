import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import UpdateAppointmentModal from '../../components/UpdateAppointmentModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import SuccessModal from '../../components/modals/SuccessModal';
import ErrorModal from '../../components/modals/ErrorModal';
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // API state
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [urologists, setUrologists] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20); // Patients per page

  // Fetch patients from API
  const fetchPatients = async (page = currentPage) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page,
        limit: pageSize,
        search: searchQuery,
        status: 'Active'
      };
      
      // Add urologist filter if not 'all'
      if (selectedUrologist !== 'all') {
        params.assignedUrologist = selectedUrologist;
      }
      
      const result = await patientService.getPatients(params);
      
      if (result.success) {
        console.log('✅ PatientList: Patient data received:', result.data);
        console.log('✅ PatientList: Number of patients:', result.data?.length || 0);
        const updatedPatients = result.data || [];
        setPatients(updatedPatients);
        
        // Update pagination info
        if (result.pagination) {
          // Update currentPage from API response (in case API adjusted the page)
          setCurrentPage(result.pagination.page);
          setTotalPages(result.pagination.pages);
          setTotal(result.pagination.total);
        }
        
        // Update selectedPatient if it exists in the updated list
        if (selectedPatient) {
          const updatedSelectedPatient = updatedPatients.find(p => p.id === selectedPatient.id);
          if (updatedSelectedPatient) {
            setSelectedPatient(updatedSelectedPatient);
          }
        }
        
        // Extract unique urologists from current page
        // Note: For a complete list, we'd need to fetch all patients or have a separate endpoint
        const uniqueUrologists = [...new Set(
          updatedPatients
            .map(patient => patient.assignedUrologist)
            .filter(urologist => urologist && urologist.trim() !== '')
        )].sort();
        
        // Merge with existing urologists to maintain full list
        setUrologists(prev => {
          const combined = [...new Set([...prev, ...uniqueUrologists])].sort();
          return combined;
        });
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

  // Initial load on component mount
  useEffect(() => {
    fetchPatients(1);
  }, []); // Only run on mount

  // Load patients when search query or urologist filter changes
  useEffect(() => {
    // Reset to page 1 when search or filter changes
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchPatients(1);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedUrologist]);
  
  // Handle explicit page changes (user clicking pagination)
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchPatients(newPage);
  };

  // Listen for PSA update events to refresh patient list
  useEffect(() => {
    const handlePSAUpdated = (event) => {
      console.log('PSA updated event received, refreshing patient list:', event.detail);
      fetchPatients(currentPage);
    };

    window.addEventListener('psaResultAdded', handlePSAUpdated);
    window.addEventListener('psaResultUpdated', handlePSAUpdated);
    
    return () => {
      window.removeEventListener('psaResultAdded', handlePSAUpdated);
      window.removeEventListener('psaResultUpdated', handlePSAUpdated);
    };
  }, [currentPage]);

  // Listen for appointment update events to refresh patient list
  useEffect(() => {
    const handleAppointmentUpdated = (event) => {
      console.log('Appointment updated event received, refreshing patient list:', event.detail);
      fetchPatients(currentPage);
    };

    window.addEventListener('investigationBooked', handleAppointmentUpdated);
    window.addEventListener('surgery:updated', handleAppointmentUpdated);
    window.addEventListener('appointment:updated', handleAppointmentUpdated);
    
    return () => {
      window.removeEventListener('investigationBooked', handleAppointmentUpdated);
      window.removeEventListener('surgery:updated', handleAppointmentUpdated);
      window.removeEventListener('appointment:updated', handleAppointmentUpdated);
    };
  }, [currentPage]);

  // Listen for patient added event to refresh patient list
  useEffect(() => {
    const handlePatientAdded = (event) => {
      console.log('Patient added event received, refreshing patient list:', event.detail);
      // Reset to page 1 to show the newly added patient
      setCurrentPage(1);
      fetchPatients(1);
    };

    window.addEventListener('patientAdded', handlePatientAdded);
    
    return () => {
      window.removeEventListener('patientAdded', handlePatientAdded);
    };
  }, []);

  // Listen for patient updated event to refresh patient list
  useEffect(() => {
    const handlePatientUpdated = (event) => {
      console.log('Patient updated event received, refreshing patient list:', event.detail);
      fetchPatients(currentPage);
    };

    window.addEventListener('patient:updated', handlePatientUpdated);
    
    return () => {
      window.removeEventListener('patient:updated', handlePatientUpdated);
    };
  }, [currentPage]);

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


  // Note: Filtering is now handled by the backend API
  // The patients array already contains the filtered results

  // Handle patient actions
  const handleViewDetails = async (patient) => {
    // Fetch full patient details to ensure all fields are available
    if (patient.id) {
      try {
        const result = await patientService.getPatientById(patient.id);
        if (result.success && result.data) {
          setSelectedPatient({
            ...result.data,
            fullName: result.data.fullName || `${result.data.firstName || result.data.first_name || ''} ${result.data.lastName || result.data.last_name || ''}`.trim()
          });
        } else {
          // Fallback to patient data from list
          setSelectedPatient(patient);
        }
      } catch (error) {
        console.error('Error fetching patient details:', error);
        // Fallback to patient data from list
        setSelectedPatient(patient);
      }
    } else {
      setSelectedPatient(patient);
    }
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
    const patientName = patientToDelete.fullName || 'Patient';
    
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
        fetchPatients(currentPage);
        
        // Dispatch event to notify other components (like OPDManagement) to refresh
        window.dispatchEvent(new CustomEvent('patientDeleted', {
          detail: { patientId: patientToDelete.id }
        }));
        
        // Show success modal
        setSuccessMessage(`${patientName} has been permanently deleted from the database. All related records including appointments, notes, investigation results, and bookings have been removed.`);
        setShowSuccessModal(true);
      } else {
        // Show error modal
        setErrorMessage(result.error || result.message || 'Failed to delete patient. Please try again.');
        setShowErrorModal(true);
        setIsDeleteConfirmModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      // Show error modal
      setErrorMessage(error.message || 'An error occurred while deleting the patient. Please try again.');
      setShowErrorModal(true);
      setIsDeleteConfirmModalOpen(false);
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
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                      {searchQuery ? 'No patients found matching your search' : 'No patients found'}
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => {
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
                          {(() => {
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
          
          {/* Pagination Controls */}
          {total > 0 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                {totalPages > 1 && (
                  <>
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1 || loading}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </>
                )}
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * pageSize, total)}
                    </span>{' '}
                    of <span className="font-medium">{total}</span> result{total !== 1 ? 's' : ''}
                  </p>
                </div>
                {totalPages > 1 && (
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1 || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                        // Show first page, last page, current page, and pages around current
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              disabled={loading}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-teal-50 border-teal-500 text-teal-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                          return (
                            <span
                              key={pageNum}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages || loading}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <FiChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nurse Patient Details Modal */}
      <NursePatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
        onPatientUpdated={(updatedPatient) => {
          // Refresh the patient list to show updated information
          fetchPatients(currentPage);
        }}
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
          fetchPatients(currentPage);
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

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage('');
        }}
        title="Patient Deleted Successfully"
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage('');
        }}
        title="Delete Patient Failed"
        message={errorMessage}
      />
    </div>
  );
};

export default PatientList;
