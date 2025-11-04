import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar } from 'react-icons/fi';
import GPHeader from '../../components/layout/GPHeader';
import GPPatientDetailsModal from '../../components/GPPatientDetailsModal';
import gpService from '../../services/gpService';

const ActiveMonitoring = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [monitoringPatients, setMonitoringPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch active monitoring patients on component mount
  useEffect(() => {
    fetchMonitoringPatients();
  }, []);

  // Listen for patient added event to refresh list
  useEffect(() => {
    const handlePatientAdded = (event) => {
      console.log('Patient added event received in Active Monitoring:', event.detail);
      // Refresh patient list to show the newly added patient
      fetchMonitoringPatients();
    };

    window.addEventListener('patientAdded', handlePatientAdded);
    
    return () => {
      window.removeEventListener('patientAdded', handlePatientAdded);
    };
  }, []);

  const fetchMonitoringPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both Active Monitoring and Medication pathway patients
      const response = await gpService.getActiveMonitoringAndMedicationPatients();
      if (response.success && response.data && response.data.patients) {
        const patients = Array.isArray(response.data.patients) ? response.data.patients : [];
        const formattedPatients = patients.map(patient => ({
          id: patient.id,
          name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          upi: patient.upi,
          age: patient.age,
          gender: patient.gender,
          latestPsa: patient.initialPSA || 0,
          lastPSADate: patient.initialPSADate?.split('T')[0] || patient.createdAt?.split('T')[0],
          nextReview: 'Not Scheduled',
          monitoringStatus: patient.carePathway === 'Medication' ? 'On Medication' : 'Stable',
          currentDoctor: patient.assignedUrologist || 'Not Assigned',
          nextAppointment: 'Not Scheduled',
          appointmentTime: '',
          pathway: patient.carePathway || 'Active Monitoring'
        }));
        setMonitoringPatients(formattedPatients);
      } else {
        setMonitoringPatients([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching monitoring patients:', err);
      setError(err.message || 'Failed to load monitoring patients');
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get monitoring status styling
  const getMonitoringStatusStyle = (status) => {
    switch (status) {
      case 'Stable':
        return 'bg-green-100 text-green-800';
      case 'On Medication':
        return 'bg-blue-100 text-blue-800';
      case 'Review Required':
        return 'bg-yellow-100 text-yellow-800';
      case 'Needs Attention':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get PSA styling and dot color
  const getPsaStyle = (psa) => {
    if (psa > 4.0) {
      return { textColor: 'text-orange-600', dotColor: 'bg-orange-500' };
    } else {
      return { textColor: 'text-green-600', dotColor: 'bg-green-500' };
    }
  };

  // Filter patients based on search query
  const filteredPatients = monitoringPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.monitoringStatus.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.currentDoctor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle patient actions
  const handleViewDetails = (patient) => {
    setSelectedPatient(patient.name);
    setIsPatientDetailsModalOpen(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-gray-600">Loading monitoring patients...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-red-500 text-lg mb-4">Error loading patients</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchMonitoringPatients}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <GPHeader 
          title="Active Monitoring & Medication"
          subtitle="Patients under active monitoring or medication treatment"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name, UPI, monitoring status, or doctor..."
        />

        {/* Monitoring Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">LATEST PSA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">NEXT REVIEW</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">DOCTOR</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">
                      No monitoring patients found matching your search
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const psaStyle = getPsaStyle(patient.latestPsa);
                    return (
                      <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(patient.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-sm">{patient.name}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getMonitoringStatusStyle(patient.monitoringStatus)}`}>
                                  {patient.monitoringStatus}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                UPI: {patient.upi}
                              </div>
                              <div className="text-xs text-gray-600">
                                Age: {patient.age} • {patient.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${psaStyle.dotColor}`}></div>
                            <span className={`text-sm font-medium ${psaStyle.textColor}`}>
                              {patient.latestPsa} ng/mL
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Last: {patient.lastPSADate}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700 text-sm">
                          <div>{patient.nextReview}</div>
                          <div className="text-xs text-gray-500">Next appointment: {patient.nextAppointment}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-700 text-sm">
                          {patient.currentDoctor}
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* GP Patient Details Modal */}
      <GPPatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
      />
    </div>
  );
};

export default ActiveMonitoring;
