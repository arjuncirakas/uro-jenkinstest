import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar } from 'react-icons/fi';
import GPHeader from '../../components/layout/GPHeader';
import GPPatientDetailsModal from '../../components/GPPatientDetailsModal';
import gpService from '../../services/gpService';

const ReferredPatients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [referredPatients, setReferredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch referred patients on component mount
  useEffect(() => {
    fetchReferredPatients();
  }, []);

  // Listen for patient added event to refresh list
  useEffect(() => {
    const handlePatientAdded = (event) => {
      console.log('Patient added event received in Referred Patients:', event.detail);
      // Refresh patient list to show the newly added patient
      fetchReferredPatients();
    };

    window.addEventListener('patientAdded', handlePatientAdded);
    
    return () => {
      window.removeEventListener('patientAdded', handlePatientAdded);
    };
  }, []);

  const fetchReferredPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await gpService.getReferredPatients();
      if (response.success && response.data && response.data.patients) {
        const patients = Array.isArray(response.data.patients) ? response.data.patients : [];
        const formattedPatients = patients.map(patient => ({
          id: patient.id,
          name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          upi: patient.upi,
          age: patient.age,
          gender: patient.gender,
          psa: patient.initialPSA || 0,
          referralDate: patient.referralDate?.split('T')[0] || patient.createdAt?.split('T')[0],
          priority: patient.priority || 'Normal',
          status: patient.carePathway || 'Pending Review',
          currentDoctor: patient.assignedUrologist || 'Not Assigned',
          nextAppointment: 'Not Scheduled',
          appointmentTime: ''
        }));
        setReferredPatients(formattedPatients);
      } else {
        setReferredPatients([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching referred patients:', err);
      setError(err.message || 'Failed to load referred patients');
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

  // Get priority badge styling
  const getPriorityBadge = (priority) => {
    const priorityClasses = {
      'Normal': 'bg-gray-100 text-gray-700',
      'High': 'bg-yellow-100 text-yellow-700',
      'Urgent': 'bg-red-100 text-red-700',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityClasses[priority]}`} aria-label={`Priority: ${priority}`}>
        {priority}
      </span>
    );
  };

  // Get PSA styling
  const getPsaStyle = (psa) => {
    if (psa > 4.0) {
      return 'text-red-600';  // Red for high values
    } else {
      return 'text-gray-900'; // Black for normal values
    }
  };

  // Filter patients based on search query
  const filteredPatients = referredPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.priority.toLowerCase().includes(searchQuery.toLowerCase())
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
            <span className="ml-3 text-gray-600">Loading patients...</span>
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
              onClick={fetchReferredPatients}
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
          title="Referred Patients"
          subtitle="Patients referred to urology department"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name, UPI, status, or priority..."
        />

        {/* Referred Patients Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PSA LEVEL</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">REFERRAL DATE</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">NEXT APPOINTMENT</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">
                      No referred patients found matching your search
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials(patient.name)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{patient.name}</div>
                            <div className="text-xs text-gray-600">
                              UPI: {patient.upi} • Age: {patient.age} • {patient.gender}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getPriorityBadge(patient.priority)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-sm font-medium ${getPsaStyle(patient.psa)}`}>
                          {patient.psa} ng/mL
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm">
                        {patient.referralDate}
                      </td>
                      <td className="py-4 px-4 text-gray-700 text-sm">
                        <div>{patient.nextAppointment}</div>
                        <div className="text-xs text-gray-500">{patient.appointmentTime}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => handleViewDetails(patient)}
                          className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-1 mx-auto"
                          aria-label={`View details for ${patient.name}`}
                        >
                          <FiEye className="w-3 h-3" />
                          <span>View Details</span>
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

      {/* GP Patient Details Modal */}
      <GPPatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
      />
    </div>
  );
};

export default ReferredPatients;
