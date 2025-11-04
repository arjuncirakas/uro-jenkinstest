import React, { useState } from 'react';
import { IoClose, IoTimeSharp, IoMedical, IoCheckmarkCircle, IoDocumentText, IoAnalytics, IoDocument, IoHeart, IoCheckmark, IoAlertCircle, IoCalendar } from 'react-icons/io5';
import { FaNotesMedical, FaUserMd, FaUserNurse, FaFileMedical, FaFlask, FaPills, FaStethoscope } from 'react-icons/fa';
import { BsClockHistory } from 'react-icons/bs';
import { useEscapeKey } from '../utils/useEscapeKey';

const GPPatientDetailsModal = ({ isOpen, onClose, patient }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Handle Escape key to close modal (read-only, no unsaved changes check)
  useEscapeKey(onClose, isOpen);

  if (!isOpen || !patient) return null;

  // Determine patient status based on patient name (in real app this would come from API)
  const isActiveMonitoring = ['Robert Brown', 'Michael Wilson', 'David Miller', 'Emma Thompson', 'James Anderson'].includes(patient);
  
  // Sample patient data - in real app this would come from props or API
  const patientData = {
    name: patient || 'John Smith',
    upi: 'URP2024001',
    age: 65,
    gender: 'Male',
    dateOfBirth: '1959-03-15',
    phone: '+61 412 345 678',
    email: 'john.smith@email.com',
    address: '123 Main Street, Sydney NSW 2000',
    referringGP: 'Dr. Sarah Wilson',
    referralDate: '2024-01-15',
    initialPSA: 4.2,
    currentPSA: 4.2,
    lastPSADate: '2024-01-10',
    status: isActiveMonitoring ? 'Active Monitoring' : 'Under Investigation',
    priority: 'Normal',
    assignedUrologist: 'Dr. Michael Chen',
    nextAppointment: '2025-10-20',
    appointmentTime: '10:30',
    medicalHistory: 'Hypertension, Type 2 Diabetes',
    currentMedications: 'Metformin 500mg BD, Lisinopril 10mg OD',
    allergies: 'Penicillin',
    emergencyContact: 'Jane Smith (Wife) - +61 412 345 679',
    doctorNotes: isActiveMonitoring 
      ? "Patient is stable on active surveillance protocol. PSA levels have remained consistent. Continue monitoring every 3 months. Patient understands the surveillance approach and is compliant with follow-up appointments."
      : "Initial consultation completed. Patient referred for further investigations including MRI and possible biopsy. Patient understands the investigation pathway and next steps."
  };

  // Sample clinical notes
  const clinicalNotes = [
    {
      id: 1,
      date: '2024-01-15',
      time: '14:30',
      author: 'Dr. Michael Chen',
      type: 'Initial Consultation',
      content: 'Patient referred with elevated PSA of 4.2. Discussed investigation pathway. Patient understands need for further tests including MRI and possible biopsy. Next appointment scheduled for 2 weeks.',
      priority: 'normal'
    },
    {
      id: 2,
      date: '2024-01-10',
      time: '09:15',
      author: 'Dr. Sarah Wilson (GP)',
      type: 'Referral',
      content: 'Patient presents with elevated PSA on routine screening. No urinary symptoms. Family history of prostate cancer in father. Referred for urology assessment.',
      priority: 'normal'
    }
  ];

  // Sample PSA history
  const psaHistory = [
    { date: '2024-01-10', value: 4.2, lab: 'Pathology Lab Sydney' },
    { date: '2023-10-15', value: 3.8, lab: 'Pathology Lab Sydney' },
    { date: '2023-07-20', value: 3.5, lab: 'Pathology Lab Sydney' }
  ];

  // Sample appointments
  const appointments = [
    {
      id: 1,
      date: '2025-10-20',
      time: '10:30',
      type: 'Follow-up Consultation',
      doctor: 'Dr. Michael Chen',
      status: 'Scheduled',
      notes: 'Review investigation results'
    },
    {
      id: 2,
      date: '2024-01-15',
      time: '14:30',
      type: 'Initial Consultation',
      doctor: 'Dr. Michael Chen',
      status: 'Completed',
      notes: 'Initial assessment and investigation planning'
    }
  ];

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
      'Surgical Pathway': 'bg-blue-100 text-blue-700',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`} aria-label={`Status: ${status}`}>
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
              <p className="text-teal-50 text-sm mt-0.5">{patientData.name} • UPI: {patientData.upi}</p>
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
                    <p className="text-sm text-gray-900">{patientData.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI</label>
                    <p className="text-sm text-gray-900">{patientData.upi}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <p className="text-sm text-gray-900">{patientData.age} years</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <p className="text-sm text-gray-900">{patientData.gender}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900">{patientData.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{patientData.email}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-sm text-gray-900">{patientData.address}</p>
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
                    <p className="text-sm text-gray-900">{patientData.referringGP}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referral Date</label>
                    <p className="text-sm text-gray-900">{patientData.referralDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                    <div className="mt-1">{getStatusBadge(patientData.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <div className="mt-1">{getPriorityBadge(patientData.priority)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Urologist</label>
                    <p className="text-sm text-gray-900">{patientData.assignedUrologist}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Appointment</label>
                    <p className="text-sm text-gray-900">{patientData.nextAppointment} at {patientData.appointmentTime}</p>
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
                      <p className="text-sm text-gray-900">{patientData.initialPSA} ng/mL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current PSA</label>
                      <p className="text-sm text-gray-900">{patientData.currentPSA} ng/mL</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last PSA Date</label>
                      <p className="text-sm text-gray-900">{patientData.lastPSADate}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial PSA Level</label>
                    <p className="text-lg font-semibold text-gray-900">{patientData.initialPSA} ng/mL</p>
                    <p className="text-sm text-gray-500 mt-1">Test Date: {patientData.lastPSADate}</p>
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
                    <p className="text-sm text-gray-700 leading-relaxed">{patientData.doctorNotes}</p>
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
                    <p className="text-sm text-gray-900">{patientData.medicalHistory}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Medications</label>
                    <p className="text-sm text-gray-900">{patientData.currentMedications}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
                    <p className="text-sm text-gray-900">{patientData.allergies}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                    <p className="text-sm text-gray-900">{patientData.emergencyContact}</p>
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
                        <td className="px-4 py-3 text-sm text-gray-900">{test.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{test.value} ng/mL</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{test.lab}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
              </div>
              
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <IoCalendar className="text-teal-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{appointment.type}</h4>
                          <p className="text-sm text-gray-500">{appointment.doctor}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900 font-medium">{appointment.date}</p>
                        <p className="text-sm text-gray-500">{appointment.time}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          appointment.status === 'Scheduled' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'dischargeSummary' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Discharge Summary</h3>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-6">
                  {/* Patient Summary */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Patient Summary</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Patient {patientData.name} (UPI: {patientData.upi}) was under active surveillance for elevated PSA levels. 
                        The patient has been stable throughout the monitoring period with consistent PSA levels. 
                        Patient has been compliant with follow-up appointments and understands the surveillance protocol.
                      </p>
                    </div>
                  </div>

                  {/* Treatment Summary */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Treatment Summary</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4">
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Active surveillance protocol maintained</li>
                        <li>• Regular PSA monitoring every 3 months</li>
                        <li>• No progression of disease noted</li>
                        <li>• Patient education provided regarding surveillance approach</li>
                        <li>• No additional interventions required at this time</li>
                      </ul>
                    </div>
                  </div>

                  {/* Follow-up Instructions */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-3">Follow-up Instructions</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded p-4">
                      <ul className="text-sm text-gray-700 space-y-2">
                        <li>• Continue active surveillance protocol</li>
                        <li>• Next PSA test scheduled for {patientData.nextAppointment}</li>
                        <li>• Follow-up appointment with {patientData.assignedUrologist}</li>
                        <li>• Contact urology department if any new symptoms develop</li>
                        <li>• Maintain regular GP follow-up for general health</li>
                      </ul>
                    </div>
                  </div>

                  {/* Discharge Date */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600">Discharge Date:</p>
                      <p className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Discharging Doctor:</p>
                      <p className="text-sm font-medium text-gray-900">{patientData.assignedUrologist}</p>
                    </div>
                  </div>
                </div>
              </div>
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
