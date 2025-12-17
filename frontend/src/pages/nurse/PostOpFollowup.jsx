import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar } from 'react-icons/fi';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import UpdateAppointmentModal from '../../components/UpdateAppointmentModal';
import { patientService } from '../../services/patientService';

const PostOpFollowup = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [isUpdateAppointmentModalOpen, setIsUpdateAppointmentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // API state
  const [postOpPatients, setPostOpPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch post-op follow-up patients
  const fetchPostOpPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch both Active and Discharged patients to include discharged patients in post-op followup
      const [activeResult, dischargedResult] = await Promise.all([
        patientService.getPatients({
          page: 1,
          limit: 100,
          status: 'Active'
        }),
        patientService.getPatients({
          page: 1,
          limit: 100,
          status: 'Discharged'
        })
      ]);
      
      // Combine results from both statuses
      const allPatients = [
        ...(activeResult.success ? (activeResult.data || []) : []),
        ...(dischargedResult.success ? (dischargedResult.data || []) : [])
      ];
      
      if (activeResult.success || dischargedResult.success) {
        // Filter patients by Post-op Transfer, Post-op Followup, or Discharge pathway
        // This ensures discharged patients are also listed in post-op followup
        const postOpPatientsList = allPatients.filter(patient => {
          const pathway = patient.carePathway || patient.care_pathway || patient.pathway || '';
          return pathway === 'Post-op Transfer' || pathway === 'Post-op Followup' || pathway === 'Discharge';
        });
        
        // Transform to match expected format
        const transformedPatients = postOpPatientsList.map(patient => {
          const pathway = patient.carePathway || patient.care_pathway || patient.pathway || '';
          return {
            id: patient.id,
            name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
            upi: patient.upi,
            age: patient.age,
            gender: patient.gender,
            surgeryType: patient.surgeryType || patient.surgery_type || 'N/A',
            surgeryDate: patient.surgeryDate || patient.surgery_date || '-',
            surgeon: patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
            latestPsa: patient.initialPSA || patient.initial_psa || '-',
            nextAppointment: patient.nextAppointment || 'TBD',
            category: 'post-op-followup', // Set category for post-op followup patients
            carePathway: pathway, // Include pathway for modal checks
            care_pathway: pathway // Include both formats
          };
        });
        
        setPostOpPatients(transformedPatients);
      } else {
        // Handle error if both requests failed
        const errorMsg = activeResult.error || dischargedResult.error || 'Failed to fetch post-op patients';
        setError(errorMsg);
      }
    } catch (err) {
      setError('Failed to fetch post-op patients');
      console.error('Error fetching post-op patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostOpPatients();
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get PSA styling and dot color
  const getPsaStyle = (psa) => {
    const psaValue = parseFloat(psa);
    if (isNaN(psaValue)) {
      return { textColor: 'text-gray-900', dotColor: 'bg-gray-400' };
    }
    
    if (psaValue > 4.0) {
      return { textColor: 'text-gray-900', dotColor: 'bg-red-500' };
    } else {
      return { textColor: 'text-gray-900', dotColor: 'bg-green-500' };
    }
  };

  // Filter patients based on search query
  // NOTE: This search filters within Post-op Transfer/Post-op Followup/Discharge pathway patients
  // The postOpPatients array is already pre-filtered to include patients from these pathways (including discharged patients)
  const filteredPatients = postOpPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.surgeryType && patient.surgeryType.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (patient.surgeon && patient.surgeon.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          setSelectedPatient(patient);
        }
      } catch (error) {
        console.error('Error fetching patient details:', error);
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <NurseHeader 
          title="Post-Op Follow-up"
          subtitle="Patients recovering from surgical procedures"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name"
        />

        {/* Post-Op Follow-up Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">DOCTOR</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">LATEST PSA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">VIEW</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">
                      Loading patients...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-red-500 text-sm">
                      {error}
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500 text-sm">
                      {searchQuery ? 'No post-op patients found matching your search' : 'No post-op follow-up patients found'}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const psaStyle = getPsaStyle(patient.latestPsa);
                    return (
                      <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {getInitials(patient.name)}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900 text-sm">{patient.name}</span>
                              <div className="text-xs text-gray-600 mt-1">
                                UPI: {patient.upi}
                              </div>
                              <div className="text-xs text-gray-600">
                                Age: {patient.age} • {patient.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700 text-sm">
                          <div className="font-medium">
                            {patient.surgeon}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${psaStyle.dotColor}`}></div>
                            <span className={`text-sm font-medium ${psaStyle.textColor}`}>
                              {patient.latestPsa} ng/mL
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <button 
                            onClick={() => handleViewDetails(patient)}
                            className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors flex items-center space-x-1"
                          >
                            <FiEye className="w-3 h-3" />
                            <span>View Details</span>
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <button 
                            onClick={() => handleUpdateAppointment(patient)}
                            className="px-3 py-1 bg-teal-50 text-teal-600 text-xs rounded-md border border-teal-200 hover:bg-teal-100 transition-colors flex items-center space-x-1"
                          >
                            <FiCalendar className="w-3 h-3" />
                            <span>Update Appointment</span>
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
        onClose={() => setIsUpdateAppointmentModalOpen(false)}
        patient={selectedPatient}
      />
    </div>
  );
};

export default PostOpFollowup;
