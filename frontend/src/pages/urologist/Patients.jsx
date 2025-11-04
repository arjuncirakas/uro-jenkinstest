import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { IoNotificationsOutline, IoPeopleOutline } from 'react-icons/io5';
import PatientDetailsModalWrapper from '../../components/PatientDetailsModalWrapper';
import NotificationModal from '../../components/NotificationModal';
import GlobalPatientSearch from '../../components/GlobalPatientSearch';
import { patientService } from '../../services/patientService';

const Patients = () => {
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const patientDetailsModalRef = useRef();
  const [notificationCount, setNotificationCount] = useState(0);

  // Determine the category from the URL path
  const category = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/patients/new')) return 'new';
    if (path.includes('/patients/surgery-pathway')) return 'surgery-pathway';
    if (path.includes('/patients/post-op-followup')) return 'post-op-followup';
    return 'all';
  }, [location.pathname]);

  // Get page title based on category
  const pageTitle = useMemo(() => {
    switch (category) {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCategoryMap = {
    all: 'all',
    'surgery-pathway': 'surgery-pathway',
    'post-op-followup': 'post-op-followup',
    new: 'new'
  };

  useEffect(() => {
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
  }, [category]);

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

  const getPriorityBadge = (priority, color) => {
    const colorClasses = {
      red: 'bg-red-100 text-red-700',
      purple: 'bg-purple-100 text-purple-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      green: 'bg-green-100 text-green-700',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`} aria-label={`Priority: ${priority}`}>
        {priority}
      </span>
    );
  };

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
          {/* Search Bar and Notification */}
          <div className="w-full lg:w-96 flex items-center gap-3">
            <GlobalPatientSearch 
              placeholder="Search patients..."
              onPatientSelect={(patient) => {
                console.log('Patients page: Patient selected:', patient);
                // Determine category based on care pathway
                let patientCategory = 'new';
                if (patient.carePathway === 'Surgery Pathway') {
                  patientCategory = 'surgery-pathway';
                } else if (patient.carePathway === 'Post-op Transfer' || patient.carePathway === 'Post-op Followup') {
                  patientCategory = 'post-op-followup';
                }
                patientDetailsModalRef.current?.openPatientDetails(patient.name, { age: patient.age }, patientCategory);
              }}
            />
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
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT NAME</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PATIENT ID / MRN</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">PRIORITY</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="py-6 text-center text-gray-500">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan="4" className="py-6 text-center text-red-500">{error}</td></tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="inline-flex flex-col items-center gap-2 text-teal-700">
                        <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                          <IoPeopleOutline className="text-teal-500 text-2xl" />
                        </div>
                        <div className="text-sm font-medium">No patients available</div>
                        <div className="text-xs text-teal-600">Assigned patients for this category will appear here</div>
                      </div>
                    </td>
                  </tr>
                ) : patients.map((patient) => (
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
                      {getPriorityBadge(patient.priority || 'Normal', 'green')}
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
