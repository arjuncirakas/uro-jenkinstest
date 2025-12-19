import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { IoNotificationsOutline, IoPeopleOutline, IoPersonCircleOutline } from 'react-icons/io5';
import { FiSearch } from 'react-icons/fi';
import PatientDetailsModalWrapper from '../../components/PatientDetailsModalWrapper';
import NotificationModal from '../../components/NotificationModal';
import ProfileDropdown from '../../components/ProfileDropdown';
import { patientService } from '../../services/patientService';

const Patients = () => {
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileButtonRef = useRef(null);
  const patientDetailsModalRef = useRef();
  const [notificationCount, setNotificationCount] = useState(0);

  // Memoized callback to close profile dropdown
  const handleProfileClose = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  // Determine the category from the URL path
  const category = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/patients/patients-under-me')) return 'patients-under-me';
    if (path.includes('/patients/my-patients')) return 'my-patients';
    if (path.includes('/patients/new')) return 'new';
    if (path.includes('/patients/surgery-pathway')) return 'surgery-pathway';
    if (path.includes('/patients/post-op-followup')) return 'post-op-followup';
    if (path.includes('/patients/all')) return 'all';
    return 'all'; // Default fallback
  }, [location.pathname]);

  // Get page title based on category
  const pageTitle = useMemo(() => {
    switch (category) {
      case 'patients-under-me':
        return 'Patients Under Me';
      case 'my-patients':
        return 'My Patients';
      case 'new':
        return 'New Patients';
      case 'surgery-pathway':
        return 'Surgery Pathway';
      case 'post-op-followup':
        return 'Post-op Followup';
      default:
        return 'All Patients';
    }
  }, [category]);

  // Get page subtitle based on category
  const pageSubtitle = useMemo(() => {
    switch (category) {
      case 'patients-under-me':
        return 'All patients assigned to you';
      case 'my-patients':
        return 'Patients you have added to the system';
      case 'new':
        return 'Recently registered patients requiring initial assessment';
      case 'surgery-pathway':
        return 'Patients in active surgical pathway';
      case 'post-op-followup':
        return 'Patients requiring post-operative follow-up care';
      default:
        return 'Manage patient records and pathways';
    }
  }, [category]);

  const [patients, setPatients] = useState([]);
  const [newPatients, setNewPatients] = useState([]);
  const [myPatients, setMyPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingNewPatients, setLoadingNewPatients] = useState(false);
  const [loadingMyPatients, setLoadingMyPatients] = useState(false);
  const [error, setError] = useState(null);
  const [errorNewPatients, setErrorNewPatients] = useState(null);
  const [errorMyPatients, setErrorMyPatients] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQueryNewPatients, setSearchQueryNewPatients] = useState('');
  const [searchQueryMyPatients, setSearchQueryMyPatients] = useState('');

  const apiCategoryMap = {
    all: 'all',
    'my-patients': 'my-patients',
    'surgery-pathway': 'surgery-pathway',
    'post-op-followup': 'post-op-followup',
    new: 'new'
  };

  const fetchPatients = React.useCallback(async () => {
    if (category === 'patients-under-me') {
      // Fetch both new patients and my patients separately
      setLoadingNewPatients(true);
      setErrorNewPatients(null);
      const newRes = await patientService.getAssignedPatients('new');
      if (newRes.success) {
        setNewPatients(newRes.data || []);
      } else {
        setErrorNewPatients(newRes.error || 'Failed to fetch new patients');
        setNewPatients([]);
      }
      setLoadingNewPatients(false);

      setLoadingMyPatients(true);
      setErrorMyPatients(null);
      const myRes = await patientService.getAssignedPatients('my-patients');
      if (myRes.success) {
        setMyPatients(myRes.data || []);
      } else {
        setErrorMyPatients(myRes.error || 'Failed to fetch my patients');
        setMyPatients([]);
      }
      setLoadingMyPatients(false);
    } else {
      setLoading(true);
      setError(null);
      const cat = apiCategoryMap[category] || 'all';
      const res = await patientService.getAssignedPatients(cat);
      if (res.success) {
        setPatients(res.data || []);
      } else {
        setError(res.error || 'Failed to fetch patients');
        setPatients([]);
      }
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Listen for patient added event to refresh the list
  useEffect(() => {
    const handlePatientAdded = () => {
      console.log('🔄 Patient added event received, refreshing patient list...');
      // Refresh if we're on the "new" patients page, "my-patients" page, or "patients-under-me" page
      if (category === 'new' || category === 'my-patients' || category === 'patients-under-me') {
        fetchPatients();
      }
    };

    window.addEventListener('patient:added', handlePatientAdded);
    return () => {
      window.removeEventListener('patient:added', handlePatientAdded);
    };
  }, [category, fetchPatients]);

  // Listen for appointment booking events to refresh the list
  // When a nurse books an appointment, the patient should appear in the urologist's list
  useEffect(() => {
    const handleAppointmentUpdated = (event) => {
      console.log('🔄 Appointment updated event received, refreshing patient list...', event.detail);
      // Refresh the patient list to show newly assigned patients
      // This applies to all categories (new, all, surgery-pathway, etc.)
      fetchPatients();
    };

    window.addEventListener('appointment:updated', handleAppointmentUpdated);
    window.addEventListener('appointment:booked', handleAppointmentUpdated);
    window.addEventListener('surgery:updated', handleAppointmentUpdated);
    window.addEventListener('investigationBooked', handleAppointmentUpdated);

    return () => {
      window.removeEventListener('appointment:updated', handleAppointmentUpdated);
      window.removeEventListener('appointment:booked', handleAppointmentUpdated);
      window.removeEventListener('surgery:updated', handleAppointmentUpdated);
      window.removeEventListener('investigationBooked', handleAppointmentUpdated);
    };
  }, [fetchPatients]);

  const handleViewPatient = (patient) => {
    patientDetailsModalRef.current?.openPatientDetails(patient.name, null, category);
  };

  const handleTransferSuccess = (patientId, newPathway) => {
    console.log('🔄 handleTransferSuccess called:', { patientId, newPathway, currentCategory: category });

    // Immediately remove patient from current list if they don't belong in this category anymore
    const shouldRemoveFromList =
      (category === 'new') ||
      (category === 'surgery-pathway' && newPathway !== 'Surgery Pathway') ||
      (category === 'post-op-followup' && !['Post-op Transfer', 'Post-op Followup'].includes(newPathway));

    if (shouldRemoveFromList) {
      console.log('✅ Removing patient from current list immediately');
      setPatients(prevPatients => prevPatients.filter(p => {
        const patientIdStr = String(p.id);
        const transferredIdStr = String(patientId);
        return patientIdStr !== transferredIdStr;
      }));
    } else {
      console.log('🔄 Refreshing patient list to ensure accuracy');
      // Refresh the list to ensure accuracy
      const fetchPatients = async () => {
        setLoading(true);
        setError(null);
        const cat = apiCategoryMap[category] || 'all';
        const res = await patientService.getAssignedPatients(cat);
        if (res.success) {
          setPatients(res.data || []);
        } else {
          setError(res.error || 'Failed to fetch patients');
          setPatients([]);
        }
        setLoading(false);
      };
      fetchPatients();
    }
  };

  // Filter patients based on search query
  const filterPatientsList = (patientList) => {
    if (!searchQuery.trim()) {
      return patientList;
    }

    const query = searchQuery.toLowerCase().trim();
    // Normalize query by removing spaces for better matching
    const normalizedQuery = query.replace(/\s+/g, '');

    return patientList.filter(patient => {
      // Get patient name components
      const name = (patient.name || '').toLowerCase();
      const firstName = (patient.firstName || '').toLowerCase();
      const lastName = (patient.lastName || '').toLowerCase();

      // Normalize name by removing spaces for matching without spaces
      const normalizedName = name.replace(/\s+/g, '');
      // Also create a combined name from firstName + lastName (in case name field is different)
      const combinedName = `${firstName}${lastName}`;

      // Search in UPI
      const upi = (patient.upi || '').toLowerCase();
      // Search in care pathway
      const carePathway = (patient.carePathway || '').toLowerCase();

      // Check all possible matches:
      // 1. Full name with spaces: "steve parker"
      // 2. Full name without spaces: "steveparker"
      // 3. Normalized query in normalized name: "stevepar" matches "steveparker"
      // 4. Query in combined firstName+lastName: handles edge cases
      // 5. First name separately: "steve"
      // 6. Last name separately: "parker"
      // 7. UPI and care pathway
      return name.includes(query) ||
        normalizedName.includes(normalizedQuery) ||
        combinedName.includes(normalizedQuery) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        upi.includes(query) ||
        carePathway.includes(query);
    });
  };

  const filteredPatients = useMemo(() => {
    return filterPatientsList(patients);
  }, [patients, searchQuery]);

  const filteredNewPatients = useMemo(() => {
    if (!searchQueryNewPatients.trim()) {
      return newPatients;
    }

    const query = searchQueryNewPatients.toLowerCase().trim();
    const normalizedQuery = query.replace(/\s+/g, '');

    return newPatients.filter(patient => {
      const name = (patient.name || '').toLowerCase();
      const firstName = (patient.firstName || '').toLowerCase();
      const lastName = (patient.lastName || '').toLowerCase();
      const normalizedName = name.replace(/\s+/g, '');
      const combinedName = `${firstName}${lastName}`;
      const upi = (patient.upi || '').toLowerCase();
      const carePathway = (patient.carePathway || '').toLowerCase();

      return name.includes(query) ||
        normalizedName.includes(normalizedQuery) ||
        combinedName.includes(normalizedQuery) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        upi.includes(query) ||
        carePathway.includes(query);
    });
  }, [newPatients, searchQueryNewPatients]);

  const filteredMyPatients = useMemo(() => {
    if (!searchQueryMyPatients.trim()) {
      return myPatients;
    }

    const query = searchQueryMyPatients.toLowerCase().trim();
    const normalizedQuery = query.replace(/\s+/g, '');

    return myPatients.filter(patient => {
      const name = (patient.name || '').toLowerCase();
      const firstName = (patient.firstName || '').toLowerCase();
      const lastName = (patient.lastName || '').toLowerCase();
      const normalizedName = name.replace(/\s+/g, '');
      const combinedName = `${firstName}${lastName}`;
      const upi = (patient.upi || '').toLowerCase();
      const carePathway = (patient.carePathway || '').toLowerCase();

      return name.includes(query) ||
        normalizedName.includes(normalizedQuery) ||
        combinedName.includes(normalizedQuery) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        upi.includes(query) ||
        carePathway.includes(query);
    });
  }, [myPatients, searchQueryMyPatients]);


  return (
    <div className="h-full overflow-y-auto">
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{pageTitle}</h1>
            <p className="text-gray-500 text-sm mt-1">{pageSubtitle}</p>
          </div>
          {/* Notification and Profile Icons */}
          <div className="flex items-center gap-3">
            {/* Notification Icon */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="View notifications"
              >
                <IoNotificationsOutline className="text-2xl" />
                {/* Notification Badge */}
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" aria-label={`${notificationCount} unread notifications`}>
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>
            {/* Profile Icon */}
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

        {/* Search Bar - Below Title (only for non-patients-under-me categories) */}
        {category !== 'patients-under-me' && (
          <div className="mt-6 mb-6">
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
        )}

        {/* Patients Tables */}
        {category === 'patients-under-me' ? (
          <>
            {/* New Patients Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">New Patients</h2>
                    <p className="text-sm text-gray-500 mt-1">Recently registered patients requiring initial assessment</p>
                  </div>
                </div>
                {/* Search Bar for New Patients */}
                <div className="relative w-full sm:w-80">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search new patients by name"
                    value={searchQueryNewPatients}
                    onChange={(e) => setSearchQueryNewPatients(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT NAME</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT ID / MRN</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">AGE</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingNewPatients ? (
                      <tr><td colSpan="4" className="py-6 text-center text-gray-500">Loading...</td></tr>
                    ) : errorNewPatients ? (
                      <tr><td colSpan="4" className="py-6 text-center text-red-500">{errorNewPatients}</td></tr>
                    ) : filteredNewPatients.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-12 text-center">
                          <div className="inline-flex flex-col items-center gap-2 text-teal-700">
                            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                              <IoPeopleOutline className="text-teal-500 text-2xl" />
                            </div>
                            <div className="text-sm font-medium">
                              {searchQuery ? 'No new patients found matching your search' : 'No new patients available'}
                            </div>
                            <div className="text-xs text-teal-600">
                              {searchQuery ? 'Try a different search term' : 'New patients will appear here'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredNewPatients.map((patient) => (
                      <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{patient.name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            UPI: {patient.upi}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {patient.age ? `${patient.age} years old` : 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => patientDetailsModalRef.current?.openPatientDetails(patient.name, null, 'new')}
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
                            aria-label={`View details for ${patient.name}`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* My Patients Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Patients Added by You</h2>
                    <p className="text-sm text-gray-500 mt-1">Patients you have added to the system</p>
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
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT NAME</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT ID / MRN</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">CARE PATHWAY</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMyPatients ? (
                      <tr><td colSpan="4" className="py-6 text-center text-gray-500">Loading...</td></tr>
                    ) : errorMyPatients ? (
                      <tr><td colSpan="4" className="py-6 text-center text-red-500">{errorMyPatients}</td></tr>
                    ) : filteredMyPatients.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-12 text-center">
                          <div className="inline-flex flex-col items-center gap-2 text-teal-700">
                            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                              <IoPeopleOutline className="text-teal-500 text-2xl" />
                            </div>
                            <div className="text-sm font-medium">
                              {searchQuery ? 'No patients found matching your search' : 'No patients added by you'}
                            </div>
                            <div className="text-xs text-teal-600">
                              {searchQuery ? 'Try a different search term' : 'Patients you add will appear here'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredMyPatients.map((patient) => (
                      <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{patient.name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            UPI: {patient.upi}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                            {patient.carePathway || 'Not Assigned'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => patientDetailsModalRef.current?.openPatientDetails(patient.name, null, 'my-patients')}
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
                            aria-label={`View details for ${patient.name}`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT NAME</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT ID / MRN</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">
                      {category === 'new' ? 'AGE' : 'CARE PATHWAY'}
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="py-6 text-center text-gray-500">Loading...</td></tr>
                  ) : error ? (
                    <tr><td colSpan="4" className="py-6 text-center text-red-500">{error}</td></tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center">
                        <div className="inline-flex flex-col items-center gap-2 text-teal-700">
                          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                            <IoPeopleOutline className="text-teal-500 text-2xl" />
                          </div>
                          <div className="text-sm font-medium">
                            {searchQuery ? 'No patients found matching your search' : 'No patients available'}
                          </div>
                          <div className="text-xs text-teal-600">
                            {searchQuery ? 'Try a different search term' : 'Assigned patients for this category will appear here'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPatients.map((patient) => (
                    <tr key={patient.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{patient.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          UPI: {patient.upi}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {category === 'new' ? (
                          <div className="text-sm text-gray-600">
                            {patient.age ? `${patient.age} years old` : 'N/A'}
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                            {patient.carePathway || 'Not Assigned'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleViewPatient(patient)}
                          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
                          aria-label={`View details for ${patient.name}`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Patient Details Modal Wrapper */}
      <PatientDetailsModalWrapper
        ref={patientDetailsModalRef}
        onTransferSuccess={handleTransferSuccess}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onPatientClick={(patientName, patientId, metadata) => {
          console.log('Patients page: Notification clicked for patient:', patientName);
          let category = 'new';
          if (metadata?.pathway === 'Surgery Pathway') {
            category = 'surgery-pathway';
          } else if (metadata?.pathway === 'Post-op Transfer' || metadata?.pathway === 'Post-op Followup') {
            category = 'post-op-followup';
          }
          patientDetailsModalRef.current?.openPatientDetails(patientName, { age: 'N/A' }, category);
          setIsNotificationOpen(false);
        }}
        onNotificationCountChange={(count) => setNotificationCount(count)}
      />
    </div>
  );
};

export default Patients;
