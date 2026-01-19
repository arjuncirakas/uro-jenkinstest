import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FiEye, FiCalendar, FiSearch } from 'react-icons/fi';
import { FaPills } from 'react-icons/fa';
import { IoNotificationsOutline, IoPersonCircleOutline, IoPeopleOutline } from 'react-icons/io5';
import PatientDetailsModalWrapper from '../../components/PatientDetailsModalWrapper';
import NotificationModal from '../../components/NotificationModal';
import ProfileDropdown from '../../components/ProfileDropdown';
import DigitalClock from '../../components/DigitalClock';
import UpdateAppointmentModal from '../../components/UpdateAppointmentModal';
import { patientService } from '../../services/patientService';
import { getPSAStatusByAge } from '../../utils/psaStatusByAge';
import tokenService from '../../services/tokenService';

const ActiveSurveillance = () => {
  const [searchQueryAll, setSearchQueryAll] = useState('');
  const [searchQueryMyPatients, setSearchQueryMyPatients] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUpdateAppointmentModalOpen, setIsUpdateAppointmentModalOpen] = useState(false);
  const profileButtonRef = useRef(null);
  const patientDetailsModalRef = useRef();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // API state
  const [allPatients, setAllPatients] = useState([]);
  const [myPatients, setMyPatients] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingMy, setLoadingMy] = useState(false);
  const [errorAll, setErrorAll] = useState(null);
  const [errorMy, setErrorMy] = useState(null);

  // Pagination state
  const [currentPageAll, setCurrentPageAll] = useState(1);
  const [currentPageMy, setCurrentPageMy] = useState(1);
  const itemsPerPage = 10;


  // Memoized callback to close profile dropdown
  const handleProfileClose = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  // Fetch all active surveillance patients
  const fetchAllPatients = useCallback(async () => {
    setLoadingAll(true);
    setErrorAll(null);

    try {
      // Fetch all active monitoring/surveillance patients (Active Monitoring, Active Surveillance, Medication pathways)
      const result = await patientService.getPatients({
        page: 1,
        limit: 1000,
        activeMonitoring: 'true'
      });

      if (result.success) {
        const patients = result.data || [];
        const transformedPatients = transformPatients(patients);
        setAllPatients(transformedPatients);
      } else {
        setErrorAll(result.error || 'Failed to fetch patients');
        setAllPatients([]);
      }
    } catch (err) {
      setErrorAll('Failed to fetch patients');
      console.error('Error fetching all active surveillance patients:', err);
      setAllPatients([]);
    } finally {
      setLoadingAll(false);
    }
  }, []);

  // Fetch my active surveillance patients (assigned to logged-in urologist)
  const fetchMyPatients = useCallback(async () => {
    setLoadingMy(true);
    setErrorMy(null);

    try {
      // Get the current urologist's name for filtering
      const user = tokenService.getUser();
      let urologistName = null;
      if (user && user.firstName && user.lastName) {
        urologistName = `${user.firstName} ${user.lastName}`.trim();
      }

      if (!urologistName) {
        setErrorMy('Unable to determine urologist name');
        setMyPatients([]);
        setLoadingMy(false);
        return;
      }

      // Fetch active surveillance patients assigned to the logged-in urologist
      const result = await patientService.getPatients({
        page: 1,
        limit: 1000,
        activeMonitoring: 'true',
        assignedUrologist: urologistName
      });

      if (result.success) {
        const patients = result.data || [];
        const transformedPatients = transformPatients(patients);
        setMyPatients(transformedPatients);
      } else {
        setErrorMy(result.error || 'Failed to fetch your patients');
        setMyPatients([]);
      }
    } catch (err) {
      setErrorMy('Failed to fetch your patients');
      console.error('Error fetching my active surveillance patients:', err);
      setMyPatients([]);
    } finally {
      setLoadingMy(false);
    }
  }, []);

  // Transform patients to match expected format
  const transformPatients = (patients) => {
    return patients.map(patient => {
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

      const rawAppointmentDate = patient.nextAppointmentDate || patient.next_appointment_date || null;
      const appointmentDateForSorting = rawAppointmentDate ? new Date(rawAppointmentDate) : null;

      return {
        id: patient.id,
        name: patient.fullName || `${patient.firstName || patient.first_name || ''} ${patient.lastName || patient.last_name || ''}`.trim(),
        upi: patient.upi,
        age: patient.age,
        pathway: patient.carePathway || patient.care_pathway || 'Active Monitoring',
        latestPsa: patient.initialPSA || patient.initial_psa || patient.latestPSA || '-',
        nextAppointment: patient.nextReview || formatAppointmentDate(patient.nextAppointmentDate) || 'TBD',
        monitoringStatus: patient.monitoringStatus || patient.monitoring_status || 'Stable',
        lastCheckUp: patient.lastCheckUp || patient.last_check_up || '-',
        currentDoctor: patient.nextAppointmentUrologist || patient.assignedUrologist || patient.assigned_urologist || 'Unassigned',
        appointmentTime: patient.nextAppointmentTime || patient.appointment_time || '-',
        appointmentDateForSorting: appointmentDateForSorting
      };
    }).sort((a, b) => {
      if (a.appointmentDateForSorting && b.appointmentDateForSorting) {
        return a.appointmentDateForSorting - b.appointmentDateForSorting;
      }
      if (a.appointmentDateForSorting && !b.appointmentDateForSorting) {
        return -1;
      }
      if (!a.appointmentDateForSorting && b.appointmentDateForSorting) {
        return 1;
      }
      return 0;
    });
  };

  useEffect(() => {
    // Fetch both tables on mount
    fetchAllPatients();
    fetchMyPatients();
  }, [fetchAllPatients, fetchMyPatients]);

  // Listen for patient updates
  useEffect(() => {
    const handlePatientUpdated = () => {
      fetchAllPatients();
      fetchMyPatients();
    };

    window.addEventListener('patient:updated', handlePatientUpdated);
    window.addEventListener('appointment:updated', handlePatientUpdated);
    return () => {
      window.removeEventListener('patient:updated', handlePatientUpdated);
      window.removeEventListener('appointment:updated', handlePatientUpdated);
    };
  }, [fetchAllPatients, fetchMyPatients]);

  // Get initials from name
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get pathway status styling
  const getPathwayStyle = (pathway) => {
    switch (pathway) {
      case 'Active Monitoring':
      case 'Active Surveillance':
        return 'bg-teal-100 text-teal-800';
      case 'Medication':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get PSA styling and dot color based on age-adjusted threshold
  const getPsaStyle = (psa, patientAge) => {
    const psaValue = parseFloat(psa);
    if (isNaN(psaValue)) {
      return { textColor: 'text-gray-900', dotColor: 'bg-gray-400' };
    }

    const statusResult = getPSAStatusByAge(psaValue, patientAge);
    const status = statusResult.status;
    
    if (status === 'High') {
      return { textColor: 'text-gray-900', dotColor: 'bg-red-500' };
    } else if (status === 'Elevated') {
      return { textColor: 'text-gray-900', dotColor: 'bg-orange-500' };
    } else if (status === 'Low') {
      return { textColor: 'text-gray-900', dotColor: 'bg-yellow-500' };
    } else {
      return { textColor: 'text-gray-900', dotColor: 'bg-green-500' };
    }
  };

  // Filter patients based on search query
  const filterPatients = (patients, searchTerm) => {
    if (!searchTerm.trim()) {
      return patients;
    }

    const query = searchTerm.toLowerCase().trim();
    return patients.filter(patient => {
      const name = (patient.name || '').toLowerCase();
      const upi = (patient.upi || '').toLowerCase();
      const pathway = (patient.pathway || '').toLowerCase();
      const doctor = (patient.currentDoctor || '').toLowerCase();

      return name.includes(query) ||
        upi.includes(query) ||
        pathway.includes(query) ||
        doctor.includes(query);
    });
  };

  const filteredAllPatients = useMemo(() => {
    return filterPatients(allPatients, searchQueryAll);
  }, [allPatients, searchQueryAll]);

  const filteredMyPatients = useMemo(() => {
    return filterPatients(myPatients, searchQueryMyPatients);
  }, [myPatients, searchQueryMyPatients]);

  // Paginated results
  const paginatedAllPatients = useMemo(() => {
    const startIndex = (currentPageAll - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAllPatients.slice(startIndex, endIndex);
  }, [filteredAllPatients, currentPageAll, itemsPerPage]);

  const paginatedMyPatients = useMemo(() => {
    const startIndex = (currentPageMy - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMyPatients.slice(startIndex, endIndex);
  }, [filteredMyPatients, currentPageMy, itemsPerPage]);

  // Calculate total pages
  const totalPagesAll = Math.ceil(filteredAllPatients.length / itemsPerPage);
  const totalPagesMy = Math.ceil(filteredMyPatients.length / itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPageAll(1);
  }, [searchQueryAll]);

  useEffect(() => {
    setCurrentPageMy(1);
  }, [searchQueryMyPatients]);

  // Handle patient actions
  const handleViewDetails = async (patient) => {
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
    patientDetailsModalRef.current?.openPatientDetails(patient.name, null, 'active-surveillance');
  };

  const handleUpdateAppointment = (patient) => {
    setSelectedPatient(patient);
    setIsUpdateAppointmentModalOpen(true);
  };

  // Render table row for a patient
  const renderPatientRow = (patient) => {
    const psaStyle = getPsaStyle(patient.latestPsa, patient.age);
    return (
      <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="py-4 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {getInitials(patient.name)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{patient.name}</span>
                {patient.pathway && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${getPathwayStyle(patient.pathway)} rounded text-xs font-medium`}>
                    {patient.pathway === 'Medication' && <FaPills className="w-3 h-3" />}
                    {patient.pathway}
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
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Active Surveillance</h1>
            <p className="text-gray-500 text-sm mt-1">Patients under active surveillance and monitoring</p>
          </div>
          {/* Notification and Profile Icons */}
          <div className="flex items-center gap-3">
            <DigitalClock />
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="View notifications"
              >
                <IoNotificationsOutline className="text-2xl" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>
            <div className="relative">
              <button
                ref={profileButtonRef}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Profile"
              >
                <IoPersonCircleOutline className="text-2xl" />
              </button>
              {isProfileOpen && (
                <ProfileDropdown
                  isOpen={isProfileOpen}
                  onClose={handleProfileClose}
                  buttonRef={profileButtonRef}
                />
              )}
            </div>
          </div>
        </div>

        {/* My Patients Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">My Patients</h2>
                <p className="text-sm text-gray-500 mt-1">Active surveillance patients assigned to you</p>
              </div>
            </div>
            {/* Search Bar for My Patients */}
            <div className="relative w-full sm:w-80">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search your patients by name"
                value={searchQueryMyPatients}
                onChange={(e) => setSearchQueryMyPatients(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
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
                {loadingMy ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                      Loading patients...
                    </td>
                  </tr>
                ) : errorMy ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-red-500 text-sm">
                      {errorMy}
                    </td>
                  </tr>
                ) : filteredMyPatients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                      {searchQueryMyPatients ? 'No patients found matching your search' : 'No active surveillance patients assigned to you'}
                    </td>
                  </tr>
                ) : (
                  paginatedMyPatients.map((patient) => renderPatientRow(patient))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination for My Patients */}
          {filteredMyPatients.length > 0 && totalPagesMy > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPageMy - 1) * itemsPerPage + 1} to {Math.min(currentPageMy * itemsPerPage, filteredMyPatients.length)} of {filteredMyPatients.length} patients
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageMy(prev => Math.max(1, prev - 1))}
                  disabled={currentPageMy === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPagesMy }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPageMy(page)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        currentPageMy === page
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPageMy(prev => Math.min(totalPagesMy, prev + 1))}
                  disabled={currentPageMy === totalPagesMy}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All Patients Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">All Patients</h2>
                <p className="text-sm text-gray-500 mt-1">All patients under active surveillance and monitoring</p>
              </div>
            </div>
            {/* Search Bar for All Patients */}
            <div className="relative w-full sm:w-80">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search all patients by name"
                value={searchQueryAll}
                onChange={(e) => setSearchQueryAll(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
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
                {loadingAll ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                      Loading patients...
                    </td>
                  </tr>
                ) : errorAll ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-red-500 text-sm">
                      {errorAll}
                    </td>
                  </tr>
                ) : filteredAllPatients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 text-sm">
                      {searchQueryAll ? 'No patients found matching your search' : 'No active surveillance patients found'}
                    </td>
                  </tr>
                ) : (
                  paginatedAllPatients.map((patient) => renderPatientRow(patient))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination for All Patients */}
          {filteredAllPatients.length > 0 && totalPagesAll > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPageAll - 1) * itemsPerPage + 1} to {Math.min(currentPageAll * itemsPerPage, filteredAllPatients.length)} of {filteredAllPatients.length} patients
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPageAll(prev => Math.max(1, prev - 1))}
                  disabled={currentPageAll === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPagesAll }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPageAll(page)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        currentPageAll === page
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPageAll(prev => Math.min(totalPagesAll, prev + 1))}
                  disabled={currentPageAll === totalPagesAll}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient Details Modal */}
      <PatientDetailsModalWrapper
        ref={patientDetailsModalRef}
        onPatientUpdated={() => {
          fetchAllPatients();
          fetchMyPatients();
        }}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onPatientClick={(patientName) => {
          console.log('Notification clicked for patient:', patientName);
          setIsNotificationOpen(false);
        }}
        onNotificationCountChange={(count) => setNotificationCount(count)}
      />

      {/* Update Appointment Modal */}
      <UpdateAppointmentModal
        isOpen={isUpdateAppointmentModalOpen}
        onClose={() => setIsUpdateAppointmentModalOpen(false)}
        patient={selectedPatient}
        onSuccess={() => {
          fetchAllPatients();
          fetchMyPatients();
          setIsUpdateAppointmentModalOpen(false);
        }}
      />
    </div>
  );
};

export default ActiveSurveillance;
