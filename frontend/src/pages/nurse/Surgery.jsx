import React, { useState, useEffect } from 'react';
import { FiEye, FiCalendar, FiSearch } from 'react-icons/fi';
import NurseHeader from '../../components/layout/NurseHeader';
import NursePatientDetailsModal from '../../components/NursePatientDetailsModal';
import UpdateAppointmentModal from '../../components/UpdateAppointmentModal';
import { patientService } from '../../services/patientService';
import { bookingService } from '../../services/bookingService';

const Surgery = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [isUpdateAppointmentModalOpen, setIsUpdateAppointmentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // API state
  const [surgeryPatients, setSurgeryPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch surgery pathway patients
  const fetchSurgeryPatients = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all patients and filter by Surgery Pathway
      const result = await patientService.getPatients({
        page: 1,
        limit: 100,
        status: 'Active'
      });
      
      if (result.success) {
        // Filter patients by Surgery Pathway
        const surgeryPatientsList = (result.data || []).filter(patient => {
          const pathway = patient.carePathway || patient.care_pathway || patient.pathway || '';
          return pathway === 'Surgery Pathway';
        });
        
        // Fetch appointments for each patient to check if surgery appointment is booked
        const patientsWithAppointments = await Promise.all(
          surgeryPatientsList.map(async (patient) => {
            try {
              // Fetch appointments for this patient
              const appointmentsResult = await bookingService.getPatientAppointments(patient.id);
              
              // Check if there's a surgery appointment
              // A surgery appointment can be identified by:
              // 1. appointmentType contains 'surgery' or 'surgical'
              // 2. OR the appointment has a surgeryType field (indicates it's a surgery appointment)
              const appointmentsList = appointmentsResult.success ? 
                (appointmentsResult.data?.appointments || appointmentsResult.data || []) : [];
              
              const hasSurgeryAppointmentInList = appointmentsList.some(apt => {
                const aptType = (apt.appointmentType || apt.type || '').toLowerCase();
                const hasSurgeryType = !!(apt.surgeryType || apt.surgery_type);
                // Check if it's a surgery appointment: has surgeryType field OR appointmentType mentions surgery/surgical
                return hasSurgeryType || aptType.includes('surgery') || aptType.includes('surgical');
              });
              
              // Get surgery appointment details if exists (prioritize appointments with surgeryType)
              const surgeryAppointment = hasSurgeryAppointmentInList ? 
                appointmentsList.find(apt => {
                  const aptType = (apt.appointmentType || apt.type || '').toLowerCase();
                  const hasSurgeryType = !!(apt.surgeryType || apt.surgery_type);
                  // Prioritize finding appointments with surgeryType, then check appointmentType
                  return hasSurgeryType || aptType.includes('surgery') || aptType.includes('surgical');
                }) : null;
              
              // Get surgery details from appointment or patient record
              const rawSurgeryDate = surgeryAppointment?.appointmentDate || surgeryAppointment?.date || patient.surgeryDate || patient.surgery_date || null;
              
              // Use surgeryStartTime if available (from backend extraction), otherwise use appointmentTime
              const surgeryStartTime = surgeryAppointment?.surgeryStartTime || surgeryAppointment?.appointmentTime || surgeryAppointment?.time || patient.surgeryTime || patient.surgery_time || null;
              
              // Use surgeryEndTime if available (from backend extraction), otherwise extract from notes
              let surgeryEndTime = surgeryAppointment?.surgeryEndTime || null;
              if (!surgeryEndTime && surgeryAppointment?.notes) {
                // Try to extract from notes: "Surgery Time: HH:MM - HH:MM"
                const timeRangeMatch = surgeryAppointment.notes.match(/Surgery Time:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
                if (timeRangeMatch) {
                  surgeryEndTime = timeRangeMatch[2];
                }
              }
              
              // Use surgeryStartTime as the main surgeryTime for backward compatibility
              const surgeryTime = surgeryStartTime;
              
              // Format date to YYYY-MM-DD for date input field
              const surgeryDate = formatDateForInput(rawSurgeryDate);
              
              // Determine if surgery is scheduled: check appointment list OR if surgery date/time is set
              const hasSurgeryAppointment = hasSurgeryAppointmentInList || (surgeryDate || surgeryTime);
              
              return {
                id: patient.id,
                name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
                upi: patient.upi,
                age: patient.age,
                surgeryType: surgeryAppointment?.surgeryType || patient.surgeryType || patient.surgery_type || null,
                surgeryDate: surgeryDate,
                surgeryTime: surgeryTime,
                surgeryStartTime: surgeryStartTime, // Include surgeryStartTime for proper start/end time handling
                surgeryEndTime: surgeryEndTime,
                surgeon: surgeryAppointment?.urologistName || surgeryAppointment?.urologist || patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
                assignedUrologist: surgeryAppointment?.urologistName || surgeryAppointment?.urologist || patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
                riskCategory: patient.priority === 'urgent' || patient.priority === 'high' ? 'High Risk' : 'Normal',
                hasSurgeryAppointment: hasSurgeryAppointment,
                surgeryAppointmentId: surgeryAppointment?.id || null,
                // Include appointment notes for extracting time range
                notes: surgeryAppointment?.notes || null,
                // Include full patient data for the modal
                fullName: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
                firstName: patient.firstName,
                lastName: patient.lastName
                // Don't pre-fill notes - let user add notes when updating surgery details
              };
            } catch (err) {
              console.error(`Error fetching appointments for patient ${patient.id}:`, err);
              // Return patient without appointment info if fetch fails
              // But still check if surgery is scheduled based on patient's surgery date/time
              const rawSurgeryDate = patient.surgeryDate || patient.surgery_date || null;
              const surgeryTime = patient.surgeryTime || patient.surgery_time || null;
              
              // Format date to YYYY-MM-DD for date input field
              const surgeryDate = formatDateForInput(rawSurgeryDate);
              const hasSurgeryAppointment = !!(surgeryDate || surgeryTime);
              
              return {
                id: patient.id,
                name: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
                upi: patient.upi,
                age: patient.age,
                surgeryType: patient.surgeryType || patient.surgery_type || null,
                surgeryDate: surgeryDate,
                surgeryTime: surgeryTime,
                surgeon: patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
                assignedUrologist: patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
                riskCategory: patient.priority === 'urgent' || patient.priority === 'high' ? 'High Risk' : 'Normal',
                hasSurgeryAppointment: hasSurgeryAppointment,
                surgeryAppointmentId: null,
                // Include full patient data for the modal
                fullName: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
                firstName: patient.firstName,
                lastName: patient.lastName
                // Don't pre-fill notes - let user add notes when updating surgery details
              };
            }
          })
        );
        
        setSurgeryPatients(patientsWithAppointments);
      } else {
        setError(result.error || 'Failed to fetch surgery patients');
      }
    } catch (err) {
      setError('Failed to fetch surgery patients');
      console.error('Error fetching surgery patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurgeryPatients();
  }, []);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format date to YYYY-MM-DD for date input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return null;
    try {
      // If it's already in YYYY-MM-DD format, return as is
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      // Otherwise, parse and format
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return '';
      
      // Format as "Nov 10, 2025"
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      // Handle different time formats (HH:MM:SS, HH:MM)
      const timeParts = timeString.split(':');
      if (timeParts.length < 2) return '';
      
      let hours = parseInt(timeParts[0]);
      const minutes = timeParts[1];
      
      // Convert to 12-hour format with AM/PM
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert 0 to 12 for midnight, 13-23 to 1-11
      
      return `${hours}:${minutes} ${period}`;
    } catch (error) {
      return '';
    }
  };

  // Get risk category styling
  const getRiskStyle = (risk) => {
    switch (risk) {
      case 'Normal':
        return 'bg-green-100 text-green-800';
      case 'High Risk':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter patients based on search query
  // NOTE: This search only filters within Surgery Pathway patients
  // The surgeryPatients array is already pre-filtered to only include patients from Surgery Pathway
  const filteredPatients = surgeryPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.upi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.surgeryType && patient.surgeryType.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (patient.riskCategory && patient.riskCategory.toLowerCase().includes(searchQuery.toLowerCase()))
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
          title="Surgery"
          subtitle="Patients scheduled for surgical procedures"
          hideSearch={true}
        />

        {/* Search Bar */}
        <div className="mt-6">
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
        </div>

        {/* Surgery Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
                             <thead>
                 <tr className="border-b border-gray-200 bg-gray-50">
                   <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">PATIENT</th>
                   <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">SURGERY DETAILS</th>
                   <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">RISK CATEGORY</th>
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
                      {searchQuery ? 'No surgery patients found matching your search' : 'No surgery pathway patients found'}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
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
                                {patient.age} years old
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700 text-sm">
                          <div className="font-medium text-gray-900">
                            {patient.surgeryType || ''}
                          </div>
                          {(formatDate(patient.surgeryDate) || formatTime(patient.surgeryTime)) && (
                            <div className="text-xs text-gray-600 mt-1">
                              {formatDate(patient.surgeryDate) && (
                                <span className="font-medium">{formatDate(patient.surgeryDate)}</span>
                              )}
                              {formatTime(patient.surgeryTime) && (
                                <> at <span className="font-medium">{formatTime(patient.surgeryTime)}</span></>
                              )}
                            </div>
                          )}
                          {patient.surgeon && patient.surgeon !== 'Unassigned' && (
                            <div className="text-xs text-gray-600 mt-1">
                              <span className="text-gray-500">Surgeon:</span> <span className="font-medium text-gray-700">{patient.surgeon}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRiskStyle(patient.riskCategory)}`}>
                            {patient.riskCategory}
                          </span>
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
                            <span>{patient.hasSurgeryAppointment ? 'Reschedule Surgery' : 'Schedule Surgery'}</span>
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
        onSuccess={() => {
          // Refresh the list after booking/updating appointment
          fetchSurgeryPatients();
          // Dispatch event to notify dashboard to refresh surgical queue
          window.dispatchEvent(new CustomEvent('surgery:updated'));
        }}
        patient={selectedPatient}
        appointmentType="surgery"
      />
    </div>
  );
};

export default Surgery;
