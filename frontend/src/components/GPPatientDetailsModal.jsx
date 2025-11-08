import React, { useState, useEffect } from 'react';
import { IoClose, IoTimeSharp, IoMedical, IoCheckmarkCircle, IoDocumentText, IoAnalytics, IoDocument, IoHeart, IoCheckmark, IoAlertCircle, IoCalendar } from 'react-icons/io5';
import { FaNotesMedical, FaUserMd, FaUserNurse, FaFileMedical, FaFlask, FaPills, FaStethoscope } from 'react-icons/fa';
import { BsClockHistory } from 'react-icons/bs';
import { useEscapeKey } from '../utils/useEscapeKey';
import { patientService } from '../services/patientService';
import { bookingService } from '../services/bookingService';

const GPPatientDetailsModal = ({ isOpen, onClose, patientId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [patientData, setPatientData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [dischargeSummary, setDischargeSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle Escape key to close modal (read-only, no unsaved changes check)
  useEscapeKey(onClose, isOpen);

  // Fetch patient data and appointments when modal opens
  useEffect(() => {
    if (isOpen && patientId) {
      fetchPatientData();
      fetchAppointments();
      fetchDischargeSummary();
    }
  }, [isOpen, patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await patientService.getPatientById(patientId);
      if (response.success && response.data) {
        setPatientData(response.data);
      } else {
        setError('Failed to load patient data');
      }
    } catch (err) {
      console.error('Error fetching patient data:', err);
      setError(err.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await bookingService.getPatientAppointments(patientId);
      if (response.success && response.data) {
        // Get appointments array from response
        const appointmentsArray = response.data.appointments || [];
        setAppointments(appointmentsArray);
        console.log('Fetched appointments:', appointmentsArray);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      // Don't show error to user for appointments, just log it
    }
  };

  const fetchDischargeSummary = async () => {
    try {
      const response = await patientService.getPatientById(patientId);
      if (response.success && response.data) {
        // Check if patient has discharge summary
        if (response.data.status === 'Discharged' || response.data.carePathway === 'Discharge') {
          // Fetch discharge summary from API
          const summaryResponse = await fetch(`/api/patients/${patientId}/discharge-summary`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            if (summaryData.success && summaryData.data) {
              setDischargeSummary(summaryData.data);
              console.log('Fetched discharge summary:', summaryData.data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching discharge summary:', err);
      // Don't show error to user for discharge summary, just log it
    }
  };

  if (!isOpen) return null;

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-gray-600">Loading patient details...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">Error loading patient details</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={fetchPatientData}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!patientData) return null;

  // Determine if patient is on Active Monitoring or Medication pathway
  const isActiveMonitoring = patientData.carePathway === 'Active Monitoring' || patientData.carePathway === 'Medication';
  
  // Format patient data from API
  const fullName = patientData.fullName || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim();
  const formattedPhone = patientData.phone || 'Not provided';
  const formattedEmail = patientData.email || 'Not provided';
  
  // Format full address with city, state, postcode
  let formattedAddress = patientData.address || '';
  if (patientData.city) formattedAddress += (formattedAddress ? ', ' : '') + patientData.city;
  if (patientData.state) formattedAddress += (formattedAddress ? ', ' : '') + patientData.state;
  if (patientData.postcode) formattedAddress += (formattedAddress ? ' ' : '') + patientData.postcode;
  formattedAddress = formattedAddress || 'Not provided';
  
  const referralDate = patientData.referralDate ? new Date(patientData.referralDate).toLocaleDateString() : 'Not available';
  const lastPSADate = patientData.initialPSADate ? new Date(patientData.initialPSADate).toLocaleDateString() : 'Not available';
  
  // Format emergency contact
  const formattedEmergencyContact = patientData.emergencyContactName 
    ? `${patientData.emergencyContactName}${patientData.emergencyContactRelationship ? ` (${patientData.emergencyContactRelationship})` : ''}${patientData.emergencyContactPhone ? ` - ${patientData.emergencyContactPhone}` : ''}`
    : 'Not available';

  // PSA history from API (if available)
  const psaHistory = patientData.psaHistory || [];

  // Find next upcoming appointment
  const getNextAppointment = () => {
    if (!appointments || appointments.length === 0) return null;
    
    const now = new Date();
    const upcomingAppointments = appointments
      .filter(apt => {
        const aptDate = new Date(apt.appointment_date || apt.date);
        return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
      })
      .sort((a, b) => {
        const dateA = new Date(a.appointment_date || a.date);
        const dateB = new Date(b.appointment_date || b.date);
        return dateA - dateB;
      });
    
    return upcomingAppointments[0] || null;
  };

  const nextAppointment = getNextAppointment();
  const nextAppointmentDate = nextAppointment 
    ? new Date(nextAppointment.appointment_date || nextAppointment.date).toLocaleDateString()
    : 'Not scheduled';
  const nextAppointmentTime = nextAppointment ? (nextAppointment.appointment_time || nextAppointment.time) : '';

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

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Pending Review': 'bg-yellow-100 text-yellow-700',
      'Under Investigation': 'bg-purple-100 text-purple-700',
      'Active Monitoring': 'bg-green-100 text-green-700',
      'Active': 'bg-green-100 text-green-700',
      'Surgical Pathway': 'bg-blue-100 text-blue-700',
      'Medication': 'bg-blue-100 text-blue-700',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-700'}`} aria-label={`Status: ${status}`}>
        {status}
      </span>
    );
  };

  const getNoteIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'initial consultation':
        return <IoMedical className="text-blue-600" />;
      case 'referral':
        return <IoDocumentText className="text-teal-600" />;
      case 'follow-up':
        return <IoCheckmarkCircle className="text-green-600" />;
      default:
        return <IoDocumentText className="text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[85vh] border border-gray-200 flex flex-col">
        
        {/* Header */}
        <div className="bg-teal-600 px-6 py-5 flex items-center justify-between border-b border-teal-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
              <FaUserMd className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Patient Details</h3>
              <p className="text-teal-50 text-sm mt-0.5">{fullName} • UPI: {patientData.upi}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            aria-label="Close modal"
          >
            <IoClose className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            {isActiveMonitoring && (
              <>
                <button
                  onClick={() => setActiveTab('psaHistory')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'psaHistory'
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  PSA History
                </button>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'appointments'
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Appointments
                </button>
                <button
                  onClick={() => setActiveTab('dischargeSummary')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'dischargeSummary'
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Discharge Summary
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <FaUserMd className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Patient Information</h4>
                    <p className="text-sm text-gray-600">Basic patient details and contact information</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-sm text-gray-900">{fullName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI</label>
                    <p className="text-sm text-gray-900">{patientData.upi}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <p className="text-sm text-gray-900">{patientData.age ? `${patientData.age} years` : 'Not available'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <p className="text-sm text-gray-900">{patientData.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900">{formattedPhone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{formattedEmail}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-sm text-gray-900">{formattedAddress}</p>
                </div>
              </div>

              {/* Referral Information */}
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <IoDocumentText className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Referral Information</h4>
                    <p className="text-sm text-gray-600">Referral details and current status</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referring GP</label>
                    <p className="text-sm text-gray-900">{patientData.referredByGP || (patientData.createdByName ? `Dr. ${patientData.createdByName}` : 'Not available')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referral Date</label>
                    <p className="text-sm text-gray-900">{referralDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                    <div className="mt-1">{getStatusBadge(patientData.status || patientData.carePathway || 'Pending Review')}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <div className="mt-1">{getPriorityBadge(patientData.priority || 'Normal')}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Urologist</label>
                    <p className="text-sm text-gray-900">{patientData.assignedUrologist || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* PSA Information */}
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <IoAnalytics className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">PSA Information</h4>
                    <p className="text-sm text-gray-600">
                      {isActiveMonitoring ? 'Prostate-specific antigen levels and monitoring details' : 'Initial PSA test value'}
                    </p>
                  </div>
                </div>
                
                {isActiveMonitoring ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial PSA</label>
                      <p className="text-sm text-gray-900">{patientData.initialPSA ? `${parseFloat(patientData.initialPSA).toFixed(2)} ng/mL` : 'Not available'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current PSA</label>
                      <p className="text-sm text-gray-900">
                        {patientData.latest_psa 
                          ? `${parseFloat(patientData.latest_psa).toFixed(2)} ng/mL` 
                          : patientData.initialPSA 
                          ? `${parseFloat(patientData.initialPSA).toFixed(2)} ng/mL` 
                          : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last PSA Date</label>
                      <p className="text-sm text-gray-900">
                        {patientData.latest_psa_date 
                          ? new Date(patientData.latest_psa_date).toLocaleDateString() 
                          : lastPSADate}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial PSA Level</label>
                    <p className="text-lg font-semibold text-gray-900">{patientData.initialPSA ? `${parseFloat(patientData.initialPSA).toFixed(2)} ng/mL` : 'Not available'}</p>
                    <p className="text-sm text-gray-500 mt-1">Test Date: {lastPSADate}</p>
                  </div>
                )}
              </div>

              {/* Doctor Notes - Only for Active Monitoring patients */}
              {isActiveMonitoring && (
                <div className="bg-white border border-gray-200 rounded p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                      <FaNotesMedical className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Doctor Notes</h4>
                      <p className="text-sm text-gray-600">Latest notes from the assigned urologist</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">{patientData.doctorNotes || patientData.notes || 'No notes available'}</p>
                  </div>
                </div>
              )}

              {/* Medical Information */}
              <div className="bg-white border border-gray-200 rounded p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded flex items-center justify-center">
                    <FaStethoscope className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">Medical Information</h4>
                    <p className="text-sm text-gray-600">Medical history and current medications</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                    <p className="text-sm text-gray-900">{patientData.medicalHistory || 'Not available'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                    <p className="text-sm text-gray-900">{patientData.currentMedications || 'None recorded'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                    <p className="text-sm text-gray-900">{patientData.allergies || 'None recorded'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <p className="text-sm text-gray-900">{formattedEmergencyContact}</p>
                  </div>
                </div>
              </div>
            </div>
          )}


          {activeTab === 'psaHistory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">PSA History</h3>
              </div>
              
              {psaHistory && psaHistory.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">PSA Level</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Laboratory</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {psaHistory.map((test, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{test.date ? new Date(test.date).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{test.value || test.psa || 'N/A'} {(test.value || test.psa) ? 'ng/mL' : ''}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{test.lab || test.laboratory || 'Not specified'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <IoAnalytics className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No PSA history available</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
              </div>
              
              {appointments && appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment, index) => {
                    const aptDate = appointment.appointment_date || appointment.date;
                    const aptTime = appointment.appointment_time || appointment.time;
                    const aptStatus = appointment.status || 'pending';
                    
                    return (
                      <div key={appointment.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <IoCalendar className="text-teal-600 text-xl" />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {appointment.appointment_type === 'urologist' ? 'Urologist Consultation' : 
                                 appointment.appointment_type === 'investigation' ? 'Investigation' : 
                                 appointment.type || 'Appointment'}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {appointment.doctor_name || appointment.urologist_name || 'Not assigned'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900 font-medium">
                              {aptDate ? new Date(aptDate).toLocaleDateString() : 'Not scheduled'}
                            </p>
                            {aptTime && <p className="text-sm text-gray-500">{aptTime}</p>}
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                              aptStatus === 'scheduled' || aptStatus === 'confirmed'
                                ? 'bg-blue-100 text-blue-700' 
                                : aptStatus === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : aptStatus === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {aptStatus.charAt(0).toUpperCase() + aptStatus.slice(1)}
                            </span>
                          </div>
                        </div>
                        {appointment.notes && (
                          <p className="text-sm text-gray-600 mt-2">{appointment.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <IoCalendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No appointments scheduled</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dischargeSummary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Discharge Summary</h3>
              </div>
              
              {dischargeSummary ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="space-y-6">
                    {/* Patient Summary */}
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-3">Clinical Summary</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded p-4">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {dischargeSummary.clinicalSummary || 'No clinical summary available'}
                        </p>
                      </div>
                    </div>

                    {/* Diagnosis */}
                    {dischargeSummary.diagnosis && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Diagnosis</h4>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                          <div className="space-y-2 text-sm text-gray-700">
                            {typeof dischargeSummary.diagnosis === 'string' ? (
                              <p>{dischargeSummary.diagnosis}</p>
                            ) : (
                              <>
                                {dischargeSummary.diagnosis.primary && (
                                  <div>
                                    <span className="font-medium">Primary: </span>
                                    {dischargeSummary.diagnosis.primary}
                                  </div>
                                )}
                                {dischargeSummary.diagnosis.secondary && (
                                  <div>
                                    <span className="font-medium">Secondary: </span>
                                    {dischargeSummary.diagnosis.secondary}
                                  </div>
                                )}
                                {dischargeSummary.diagnosis.procedure && (
                                  <div className="mt-2 pt-2 border-t border-gray-300">
                                    <span className="font-medium">Procedure: </span>
                                    {dischargeSummary.diagnosis.procedure}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Procedure Details - For Post-operative patients */}
                    {dischargeSummary.procedure && (typeof dischargeSummary.procedure === 'object') && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Procedure Details</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {dischargeSummary.procedure.name && (
                              <div>
                                <span className="font-medium text-gray-700">Procedure: </span>
                                <span className="text-gray-900">{dischargeSummary.procedure.name}</span>
                              </div>
                            )}
                            {dischargeSummary.procedure.date && (
                              <div>
                                <span className="font-medium text-gray-700">Date: </span>
                                <span className="text-gray-900">{new Date(dischargeSummary.procedure.date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {dischargeSummary.procedure.surgeon && (
                              <div>
                                <span className="font-medium text-gray-700">Surgeon: </span>
                                <span className="text-gray-900">{dischargeSummary.procedure.surgeon}</span>
                              </div>
                            )}
                            {dischargeSummary.procedure.complications && (
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">Complications: </span>
                                <span className="text-gray-900">{dischargeSummary.procedure.complications}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Medications */}
                    {dischargeSummary.medications && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Discharge Medications</h4>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                          <div className="space-y-2 text-sm text-gray-700">
                            {typeof dischargeSummary.medications === 'string' ? (
                              <p>{dischargeSummary.medications}</p>
                            ) : (
                              <>
                                {dischargeSummary.medications.discharge && (
                                  <div>
                                    <span className="font-medium">Current Medications: </span>
                                    {dischargeSummary.medications.discharge}
                                  </div>
                                )}
                                {dischargeSummary.medications.changes && (
                                  <div>
                                    <span className="font-medium">Changes: </span>
                                    {dischargeSummary.medications.changes}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Follow-up Instructions */}
                    {dischargeSummary.followUp && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Follow-up Instructions</h4>
                        <div className="bg-gray-50 border border-gray-200 rounded p-4">
                          <ul className="text-sm text-gray-700 space-y-2">
                            {typeof dischargeSummary.followUp === 'string' ? (
                              <li>• {dischargeSummary.followUp}</li>
                            ) : (
                              <>
                                {/* Post-operative specific fields */}
                                {dischargeSummary.followUp.immediateFollowUp && <li>• {dischargeSummary.followUp.immediateFollowUp}</li>}
                                {dischargeSummary.followUp.woundCare && <li>• <strong>Wound Care:</strong> {dischargeSummary.followUp.woundCare}</li>}
                                {dischargeSummary.followUp.activityRestrictions && <li>• <strong>Activity:</strong> {dischargeSummary.followUp.activityRestrictions}</li>}
                                {dischargeSummary.followUp.postOpInstructions && <li>• {dischargeSummary.followUp.postOpInstructions}</li>}
                                
                                {/* Regular discharge fields */}
                                {dischargeSummary.followUp.gpFollowUp && <li>• {dischargeSummary.followUp.gpFollowUp}</li>}
                                {dischargeSummary.followUp.psaMonitoring && <li>• <strong>PSA Monitoring:</strong> {dischargeSummary.followUp.psaMonitoring}</li>}
                                
                                {/* Red flags - highlighted */}
                                {dischargeSummary.followUp.redFlags && (
                                  <li className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                                    <strong className="text-red-800">⚠️ Warning Signs:</strong>
                                    <span className="text-red-700 ml-1">{dischargeSummary.followUp.redFlags}</span>
                                  </li>
                                )}
                                
                                {dischargeSummary.followUp.nextReview && <li>• <strong>Next Review:</strong> {dischargeSummary.followUp.nextReview}</li>}
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* GP Actions */}
                    {dischargeSummary.gpActions && Array.isArray(dischargeSummary.gpActions) && dischargeSummary.gpActions.length > 0 && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Actions for GP</h4>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                          <ul className="text-sm text-gray-700 space-y-2">
                            {dischargeSummary.gpActions.map((action, index) => (
                              <li key={index}>• {action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Discharge Documents */}
                    {dischargeSummary.documents && Array.isArray(dischargeSummary.documents) && dischargeSummary.documents.length > 0 && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Discharge Documents</h4>
                        <div className="space-y-2">
                          {dischargeSummary.documents.map((doc, index) => (
                            <div key={doc.id || index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">
                                  {doc.type?.includes('pdf') ? '📄' : doc.type?.includes('image') ? '🖼️' : '📎'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                                  <p className="text-xs text-gray-500">{doc.size}</p>
                                </div>
                              </div>
                              <button
                                className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors"
                              >
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Discharge Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-sm text-gray-600">Discharge Date:</p>
                        <p className="text-sm font-medium text-gray-900">
                          {dischargeSummary.dischargeDate ? new Date(dischargeSummary.dischargeDate).toLocaleDateString() : 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Discharge Time:</p>
                        <p className="text-sm font-medium text-gray-900">
                          {dischargeSummary.dischargeTime || 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Length of Stay:</p>
                        <p className="text-sm font-medium text-gray-900">
                          {dischargeSummary.lengthOfStay ? `${dischargeSummary.lengthOfStay} days` : 'Not recorded'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Ward:</p>
                        <p className="text-sm font-medium text-gray-900">
                          {dischargeSummary.ward || 'Not recorded'}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-600">Discharging Consultant:</p>
                        <p className="text-sm font-medium text-gray-900">
                          {dischargeSummary.consultantName || dischargeSummary.dischargedBy || patientData.assignedUrologist || 'Not recorded'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <IoDocument className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No discharge summary available for this patient</p>
                  <p className="text-sm text-gray-400 mt-2">Discharge summary will be created when patient is transferred to discharge pathway</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GPPatientDetailsModal;
