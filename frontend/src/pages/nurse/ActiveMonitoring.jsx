import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar, FiSearch } from 'react-icons/fi';
import { FaPills } from 'react-icons/fa';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import UpdateAppointmentModal from '../../components/UpdateAppointmentModal';
import { patientService } from '../../services/patientService';
import { bookingService } from '../../services/bookingService';

const ActiveMonitoring = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrologistFilter, setSelectedUrologistFilter] = useState('all'); // 'all' or urologist name
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [isUpdateAppointmentModalOpen, setIsUpdateAppointmentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // API state
  const [monitoringPatients, setMonitoringPatients] = useState([]);
  const [urologists, setUrologists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUrologists, setLoadingUrologists] = useState(false);
  const [error, setError] = useState(null);

  // Fetch active monitoring patients
  const fetchMonitoringPatients = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all active monitoring patients (Active Monitoring, Medication, and Discharge pathways)
      const result = await patientService.getPatients({
        page: 1,
        limit: 100,
        activeMonitoring: 'true'
      });

      if (result.success) {
        // Patients are already filtered by the backend
        const activeMonitoringPatients = result.data || [];

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

          // Get raw appointment date for sorting
          const rawAppointmentDate = patient.nextAppointmentDate || patient.next_appointment_date || null;
          const appointmentDateForSorting = rawAppointmentDate ? new Date(rawAppointmentDate) : null;

          return {
            id: patient.id,
            name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
            upi: patient.upi,
            age: patient.age,
            pathway: patient.carePathway || patient.care_pathway || patient.pathway || 'Active Monitoring',
            latestPsa: patient.initialPSA || patient.initial_psa || '-',
            nextAppointment: patient.nextReview || formatAppointmentDate(patient.nextAppointmentDate) || 'TBD',
            monitoringStatus: patient.monitoringStatus || patient.monitoring_status || 'Stable',
            lastCheckUp: patient.lastCheckUp || patient.last_check_up || '-',
            currentDoctor: patient.nextAppointmentUrologist || patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
            appointmentTime: patient.nextAppointmentTime || patient.appointment_time || '-',
            appointmentDateForSorting: appointmentDateForSorting // Store raw date for sorting
          };
        });

        // Sort patients by upcoming appointment date (earliest first)
        // Patients without appointment dates (TBD) go to the end
        const sortedPatients = transformedPatients.sort((a, b) => {
          // If both have dates, sort by date (earliest first)
          if (a.appointmentDateForSorting && b.appointmentDateForSorting) {
            return a.appointmentDateForSorting - b.appointmentDateForSorting;
          }
          // If only a has a date, a comes first
          if (a.appointmentDateForSorting && !b.appointmentDateForSorting) {
            return -1;
          }
          // If only b has a date, b comes first
          if (!a.appointmentDateForSorting && b.appointmentDateForSorting) {
            return 1;
          }
          // If neither has a date, maintain original order
          return 0;
        });

        setMonitoringPatients(sortedPatients);
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

  // Fetch urologists on component mount
  useEffect(() => {
    const fetchUrologists = async () => {
      setLoadingUrologists(true);
      try {
        // Use the new patient service endpoint which is more inclusive
        const result = await patientService.getAllUrologists();
        if (result.success) {
          const urologistsList = Array.isArray(result.data) ? result.data : [];
          setUrologists(urologistsList);
          console.log(`✅ Loaded ${urologistsList.length} urologists for filtering`);
        } else {
          console.error('Failed to fetch urologists:', result.error);
          // Fallback to booking service if patient service fails
          const fallbackResult = await bookingService.getAvailableUrologists();
          if (fallbackResult.success) {
            const urologistsList = Array.isArray(fallbackResult.data) ? fallbackResult.data : [];
            setUrologists(urologistsList);
            console.log(`✅ Loaded ${urologistsList.length} urologists from fallback endpoint`);
          } else {
            setUrologists([]);
          }
        }
      } catch (err) {
        console.error('Error fetching urologists:', err);
        // Fallback to booking service on error
        try {
          const fallbackResult = await bookingService.getAvailableUrologists();
          if (fallbackResult.success) {
            const urologistsList = Array.isArray(fallbackResult.data) ? fallbackResult.data : [];
            setUrologists(urologistsList);
          } else {
            setUrologists([]);
          }
        } catch (fallbackErr) {
          console.error('Error fetching urologists from fallback:', fallbackErr);
          setUrologists([]);
        }
      } finally {
        setLoadingUrologists(false);
      }
    };

    fetchUrologists();
  }, []);

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
      case 'Active Monitoring':
        return 'bg-teal-100 text-teal-800';
      case 'Medication':
        return 'bg-indigo-100 text-indigo-800';
      case 'Discharge':
        return 'bg-gray-100 text-gray-800';
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

  // Filter patients based on search query and selected urologist
  const filteredPatients = monitoringPatients.filter(patient => {
    // Filter by urologist if one is selected
    const matchesUrologist = selectedUrologistFilter === 'all' ||
      patient.currentDoctor === selectedUrologistFilter ||
      patient.currentDoctor?.toLowerCase() === selectedUrologistFilter.toLowerCase();

    // Filter by search query
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.pathway && patient.pathway.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (patient.monitoringStatus && patient.monitoringStatus.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesUrologist && matchesSearch;
  });

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
          title="Active Monitoring"
          subtitle="Patients under active surveillance, medication, and discharge monitoring"
          hideSearch={true}
        />

        {/* Search Bar and Filter - Horizontally Aligned */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar - Left side */}
          <div className="relative w-full sm:w-96">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Filter Dropdown - Right side */}
          <div className="flex items-center gap-4">
            <label htmlFor="urologistFilter" className="text-sm font-medium text-gray-700">
              Filter by Urologist:
            </label>
            <select
              id="urologistFilter"
              value={selectedUrologistFilter}
              onChange={(e) => setSelectedUrologistFilter(e.target.value)}
              disabled={loadingUrologists}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="all">All Urologists</option>
              {urologists.map((urologist) => (
                <option key={urologist.id || urologist.name} value={urologist.name}>
                  {urologist.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Monitoring Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">LATEST PSA</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">NEXT APPOINTMENT</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">UROLOGIST</th>
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{patient.name}</span>
                                {(patient.pathway && patient.pathway.toLowerCase() === 'medication') && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${getPathwayStyle(patient.pathway)} rounded text-xs font-medium`}>
                                    <FaPills className="w-3 h-3" />
                                    Medication
                                  </span>
                                )}
                                {(patient.pathway && patient.pathway.toLowerCase() === 'discharge') && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${getPathwayStyle(patient.pathway)} rounded text-xs font-medium`}>
                                    Discharged
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                UPI: {patient.upi}
                              </div>
                              <div className="text-xs text-gray-600">
                                {patient.age} years old
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
      </div>

      {/* Nurse Patient Details Modal */}
      <NursePatientDetailsModal
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patient={selectedPatient}
        onPatientUpdated={() => {
          // Refresh the patient list to show updated information
          fetchMonitoringPatients();
        }}
      />

      {/* Update Appointment Modal */}
      <UpdateAppointmentModal
        isOpen={isUpdateAppointmentModalOpen}
        onClose={() => setIsUpdateAppointmentModalOpen(false)}
        patient={selectedPatient}
        onSuccess={() => {
          // Refresh the patient list after successful appointment update
          fetchMonitoringPatients();
        }}
      />
    </div>
  );
};

export default ActiveMonitoring;
