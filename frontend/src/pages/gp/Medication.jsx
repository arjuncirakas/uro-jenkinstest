import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar } from 'react-icons/fi';
import { FaPills } from 'react-icons/fa';
import GPHeader from '../../components/layout/GPHeader';
import GPPatientDetailsModal from '../../components/GPPatientDetailsModal';
import { gpService } from '../../services/gpService';

const Medication = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medicationPatients, setMedicationPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch medication patients on component mount
  useEffect(() => {
    fetchMedicationPatients();
  }, []);

  // Listen for patient added or updated events
  useEffect(() => {
    const handlePatientUpdate = () => {
      console.log('Patient update event received in Medication page');
      fetchMedicationPatients();
    };

    window.addEventListener('patientAdded', handlePatientUpdate);
    window.addEventListener('patientUpdated', handlePatientUpdate);
    
    return () => {
      window.removeEventListener('patientAdded', handlePatientUpdate);
      window.removeEventListener('patientUpdated', handlePatientUpdate);
    };
  }, []);

  const fetchMedicationPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await gpService.getMedicationPatients();
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
          medicationStatus: patient.monitoringStatus || 'On Medication',
          currentDoctor: patient.assignedUrologist || 'Not Assigned',
          pathway: patient.carePathway || 'Medication',
          nextAppointmentDate: patient.nextAppointmentDate,
          nextAppointmentTime: patient.nextAppointmentTime,
          nextReview: patient.nextReview || 'Not Scheduled'
        }));
        setMedicationPatients(formattedPatients);
      } else {
        setMedicationPatients([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching medication patients:', err);
      setError(err.message || 'Failed to load medication patients');
      setLoading(false);
    }
  };

  // Get medication status styling
  const getMedicationStatusStyle = (status) => {
    return 'bg-blue-100 text-blue-800';
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
  const filteredPatients = medicationPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.currentDoctor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle patient actions
  const handleViewDetails = (patient) => {
    setSelectedPatient(patient.id);
    setIsPatientDetailsModalOpen(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-gray-600">Loading medication patients...</span>
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
              onClick={fetchMedicationPatients}
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
          title="Medication Pathway"
          subtitle="Patients currently on medication treatment"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name, UPI, or doctor..."
        />

        {/* Medication Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">LATEST PSA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">STATUS</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">DOCTOR</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">
                      {searchQuery ? 'No patients match your search criteria' : 'No patients on medication pathway'}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const psaStyle = getPsaStyle(patient.latestPsa);
                    return (
                      <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <FaPills className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                              <p className="text-xs text-gray-500">{patient.upi} • {patient.age} years • {patient.gender}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full ${psaStyle.dotColor} mr-2`}></span>
                            <div>
                              <p className={`text-sm font-medium ${psaStyle.textColor}`}>
                                {patient.latestPsa} ng/mL
                              </p>
                              <p className="text-xs text-gray-500">
                                {patient.lastPSADate ? new Date(patient.lastPSADate).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMedicationStatusStyle(patient.medicationStatus)}`}>
                            {patient.medicationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">{patient.currentDoctor}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleViewDetails(patient)}
                            className="inline-flex items-center px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition-colors"
                          >
                            <FiEye className="mr-1" />
                            View Details
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
        patientId={selectedPatient}
      />
    </div>
  );
};

export default Medication;




