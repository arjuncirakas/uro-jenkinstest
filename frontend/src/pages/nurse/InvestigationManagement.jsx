import React, { useState, useEffect } from 'react';
import { FiEye, FiSearch } from 'react-icons/fi';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import { investigationService } from '../../services/investigationService';

const InvestigationManagement = () => {
  // State for search and modals
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // State for investigations data
  const [investigations, setInvestigations] = useState([]);
  const [loadingInvestigations, setLoadingInvestigations] = useState(false);
  const [investigationsError, setInvestigationsError] = useState(null);

  // Fetch investigations data
  const fetchInvestigations = async () => {
    setLoadingInvestigations(true);
    setInvestigationsError(null);
    
    try {
      const result = await investigationService.getAllInvestigations();
      
      if (result.success) {
        setInvestigations(result.data.investigations || []);
      } else {
        setInvestigationsError(result.error || 'Failed to fetch investigations');
        console.error('Error fetching investigations:', result.error);
      }
    } catch (error) {
      setInvestigationsError('Failed to fetch investigations');
      console.error('Error fetching investigations:', error);
    } finally {
      setLoadingInvestigations(false);
    }
  };

  // Load investigations on component mount
  useEffect(() => {
    fetchInvestigations();
  }, []);

  // Listen for test result added events to refresh data
  useEffect(() => {
    const handleTestResultAdded = (event) => {
      console.log('Test result added event received:', event.detail);
      // Show brief loading indicator and refresh investigations data
      setLoadingInvestigations(true);
      fetchInvestigations();
    };

    window.addEventListener('testResultAdded', handleTestResultAdded);
    
    return () => {
      window.removeEventListener('testResultAdded', handleTestResultAdded);
    };
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get PSA color based on threshold
  const getPSAColor = (psaValue) => {
    const psa = parseFloat(psaValue);
    if (isNaN(psa)) return { dotColor: 'bg-gray-400', textColor: 'text-gray-900' };
    
    if (psa > 4) {
      return { dotColor: 'bg-red-500', textColor: 'text-gray-900' };
    } else {
      return { dotColor: 'bg-green-500', textColor: 'text-gray-900' };
    }
  };

  // Get status icon for investigation procedures
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'results_awaited':
        return (
          <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'not_required':
        return (
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  // Get status text for tooltip
  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'results_awaited':
        return 'Results Awaited';
      case 'not_required':
        return 'Not Required';
      default:
        return 'Not Completed';
    }
  };

  // Filter investigations based on search
  const filteredInvestigations = investigations.filter(investigation => {
    const matchesSearch = investigation.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         investigation.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         investigation.urologist.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Handle patient actions
  const handleViewEdit = (patient) => {
    setSelectedPatient(patient);
    setIsPatientDetailsModalOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <NurseHeader 
          title="Investigation Management"
          subtitle="Track and manage all patient investigations and their status"
          onSearch={setSearchQuery}
          searchPlaceholder="Search patients by name, UPI, or urologist"
        />

        {/* Investigations Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                All Investigations ({filteredInvestigations.length})
              </h2>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-teal-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600">Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600">Results Awaited</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600">Not Required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600">Not Completed</span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs w-[30%]">
                    PATIENT
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600 text-xs w-[18%]">
                    APPOINTMENT
                  </th>
                  <th className="text-left py-3 px-3 font-medium text-gray-600 text-xs w-[18%]">
                    UROLOGIST
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 text-xs w-[12%]">
                    <div className="flex justify-center items-center">MRI</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 text-xs w-[12%]">
                    <div className="flex justify-center items-center">BIOPSY</div>
                  </th>
                  <th className="text-center py-3 px-2 font-medium text-gray-600 text-xs w-[12%]">
                    <div className="flex justify-center items-center">TRUS</div>
                  </th>
                  <th className="text-center py-3 px-3 font-medium text-gray-600 text-xs w-[18%]">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingInvestigations ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading investigations...</span>
                      </div>
                    </td>
                  </tr>
                ) : investigationsError ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="text-red-600 text-sm mb-2">{investigationsError}</div>
                      <button
                        onClick={fetchInvestigations}
                        className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredInvestigations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                      No investigations found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredInvestigations.map((investigation) => (
                    <tr key={investigation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {getInitials(investigation.patientName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 text-sm">{investigation.patientName}</div>
                            <div className="text-xs text-gray-600">
                              UPI: {investigation.upi} • {investigation.age} • {investigation.gender}
                            </div>
                            <div className="flex items-center mt-0.5">
                              <div className={`w-1.5 h-1.5 ${getPSAColor(investigation.psa).dotColor} rounded-full mr-1 flex-shrink-0`}></div>
                              <span className={`text-xs ${getPSAColor(investigation.psa).textColor}`}>PSA: {investigation.psa}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-700 text-xs">
                        <div className="font-medium">{investigation.appointmentDate}</div>
                        <div className="text-xs text-gray-500">{investigation.appointmentTime}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-700 text-xs">
                        <div className="truncate">{investigation.urologist}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center items-center">
                          <div title={getStatusText(investigation.mri)}>
                            {getStatusIcon(investigation.mri)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center items-center">
                          <div title={getStatusText(investigation.biopsy)}>
                            {getStatusIcon(investigation.biopsy)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center items-center">
                          <div title={getStatusText(investigation.trus)}>
                            {getStatusIcon(investigation.trus)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleViewEdit(investigation)}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-1 mx-auto whitespace-nowrap"
                        >
                          <FiEye className="w-3 h-3" />
                          <span>View/Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Patient Details Modal */}
      <NursePatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
      />
    </div>
  );
};

export default InvestigationManagement;
