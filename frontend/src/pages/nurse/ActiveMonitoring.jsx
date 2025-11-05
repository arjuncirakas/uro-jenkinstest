import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar } from 'react-icons/fi';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import UpdateAppointmentModal from '../../components/UpdateAppointmentModal';
import { patientService } from '../../services/patientService';

const ActiveMonitoring = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [isUpdateAppointmentModalOpen, setIsUpdateAppointmentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // API state
  const [monitoringPatients, setMonitoringPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch active monitoring patients
  const fetchMonitoringPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all patients and filter by Active Monitoring pathway
      const result = await patientService.getPatients({
        page: 1,
        limit: 100,
        status: 'Active'
      });
      
      if (result.success) {
        // Filter patients by Active Monitoring or Active Surveillance pathway
        const activeMonitoringPatients = (result.data || []).filter(patient => {
          const pathway = patient.carePathway || patient.care_pathway || patient.pathway || '';
          return pathway === 'Active Monitoring' || pathway === 'Active Surveillance';
        });
        
        // Transform to match expected format
        const transformedPatients = activeMonitoringPatients.map(patient => {
          // Format the next appointment date for display
          const formatAppointmentDate = (dateStr) => {
            if (!dateStr) return 'TBD';
            try {
              const date = new Date(dateStr);
              return date.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              });
            } catch {
              return 'TBD';
            }
          };
          
          return {
            id: patient.id,
            name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
            upi: patient.upi,
            age: patient.age,
            gender: patient.gender,
            pathway: patient.carePathway || patient.care_pathway || patient.pathway || 'Active Monitoring',
            latestPsa: patient.initialPSA || patient.initial_psa || '-',
            nextAppointment: patient.nextReview || formatAppointmentDate(patient.nextAppointmentDate) || 'TBD',
            monitoringStatus: patient.monitoringStatus || patient.monitoring_status || 'Stable',
            lastCheckUp: patient.lastCheckUp || patient.last_check_up || '-',
            currentDoctor: patient.nextAppointmentUrologist || patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
            appointmentTime: patient.nextAppointmentTime || patient.appointment_time || '-'
          };
        });
        
        setMonitoringPatients(transformedPatients);
      } else {
        setError(result.error || 'Failed to fetch monitoring patients');
      }
    } catch (err) {
      setError('Failed to fetch monitoring patients');
      console.error('Error fetching monitoring patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringPatients();
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Get pathway status styling
  const getPathwayStyle = (pathway) => {
    switch (pathway) {
      case 'OPD Queue':
        return 'bg-blue-100 text-blue-800';
      case 'Active Surveillance':
        return 'bg-green-100 text-green-800';
      case 'Surgical Pathway':
        return 'bg-orange-100 text-orange-800';
      case 'Post-Op Follow-up':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get monitoring status styling
  const getMonitoringStatusStyle = (status) => {
    switch (status) {
      case 'Stable':
        return 'bg-green-100 text-green-800';
      case 'Needs Attention':
        return 'bg-red-100 text-red-800';
      case 'Monitoring':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
  const filteredPatients = monitoringPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.pathway && patient.pathway.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (patient.monitoringStatus && patient.monitoringStatus.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle patient actions
  const handleViewDetails = (patient) => {
    setSelectedPatient(patient);
    setIsPatientDetailsModalOpen(true);
  };

  const handleUpdateAppointment = (patient) => {
    setSelectedPatient(patient);
    setIsUpdateAppointmentModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4 sm:p-6 lg:p-8">
          <NurseHeader 
            title="Active Monitoring"
            subtitle="Patients under active surveillance monitoring"
            onSearch={setSearchQuery}
            searchPlaceholder="Search by name, UPI, or monitoring status..."
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 pt-4">
          {/* Monitoring Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">LATEST PSA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">NEXT APPOINTMENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">DOCTOR</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">BOOK APPOINTMENT</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                      Loading patients...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-red-500 text-sm">
                      {error}
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                      {searchQuery ? 'No monitoring patients found matching your search' : 'No active monitoring patients found'}
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
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-sm">{patient.name}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                  <FiCalendar className="w-3 h-3" />
                                  Scheduled
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
                          <div className="flex items-center">
                            <div className={`w-2 h-2 ${psaStyle.dotColor} rounded-full mr-2`}></div>
                            <span className={`text-sm font-medium ${psaStyle.textColor}`}>
                              {patient.latestPsa} ng/mL
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700 text-sm">
                          <div>{patient.nextAppointment}</div>
                          <div className="text-xs text-gray-500">{patient.appointmentTime}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-700 text-sm">
                          {patient.currentDoctor}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button 
                            onClick={() => handleUpdateAppointment(patient)}
                            className="px-3 py-1 bg-teal-50 text-teal-600 text-xs rounded-md border border-teal-200 hover:bg-teal-100 transition-colors flex items-center space-x-1 mx-auto"
                          >
                            <FiCalendar className="w-3 h-3" />
                            <span>Update Appointment</span>
                          </button>
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

        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 mt-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total Patients: <span className="font-semibold text-gray-900">{filteredPatients.length}</span>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
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

export default ActiveMonitoring;
