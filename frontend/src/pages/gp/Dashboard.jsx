import React, { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import { IoChevronForward, IoNotificationsOutline } from 'react-icons/io5';
import { BsCalendar3 } from 'react-icons/bs';
import NotificationModal from '../../components/NotificationModal';
import GPPatientDetailsModal from '../../components/GPPatientDetailsModal';
import { gpService } from '../../services/gpService';
import authService from '../../services/authService';

const Dashboard = () => {
  // State for tracking active tab
  const [activeTab, setActiveTab] = useState('referrals');
  // State for notification modal
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  // State for patient details modal
  const [isPatientDetailsModalOpen, setIsPatientDetailsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  // State for data
  const [recentReferrals, setRecentReferrals] = useState([]);
  const [activeMonitoringPatients, setActiveMonitoringPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  // State for notification count
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    // Get current user info
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Listen for patient added event to refresh dashboard
  useEffect(() => {
    const handlePatientAdded = (event) => {
      console.log('Patient added event received in GP Dashboard:', event.detail);
      // Refresh dashboard data to show the newly added patient
      fetchDashboardData();
    };

    window.addEventListener('patientAdded', handlePatientAdded);
    
    return () => {
      window.removeEventListener('patientAdded', handlePatientAdded);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch recent referrals (new patients)
      const referralsResponse = await gpService.getRecentReferrals();
      if (referralsResponse.success && referralsResponse.data && referralsResponse.data.patients) {
        const patients = Array.isArray(referralsResponse.data.patients) ? referralsResponse.data.patients : [];
        const formattedReferrals = patients.map(patient => ({
          date: patient.dateOfEntry || patient.createdAt?.split('T')[0],
          patient: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          patientId: patient.id,
          age: patient.age,
          psa: patient.psa || 0,
          status: patient.status || 'Pending Review',
          priority: patient.priority || 'Normal'
        }));
        setRecentReferrals(formattedReferrals.slice(0, 4)); // Get last 4
      } else {
        setRecentReferrals([]);
      }

      // Fetch active monitoring and medication patients
      const monitoringResponse = await gpService.getActiveMonitoringAndMedicationPatients();
      if (monitoringResponse.success && monitoringResponse.data && monitoringResponse.data.patients) {
        const patients = Array.isArray(monitoringResponse.data.patients) ? monitoringResponse.data.patients : [];
        const formattedMonitoring = patients.map(patient => ({
          patient: patient.fullName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
          patientId: patient.id,
          age: patient.age,
          lastPSA: patient.initialPSA || 0,
          lastPSADate: patient.initialPSADate?.split('T')[0] || patient.createdAt?.split('T')[0],
          nextReview: patient.nextReview || 'Not Scheduled',
          status: patient.carePathway === 'Medication' ? 'On Medication' : (patient.monitoringStatus || 'Stable'),
          pathway: patient.carePathway || 'Active Monitoring'
        }));
        setActiveMonitoringPatients(formattedMonitoring.slice(0, 3)); // Get last 3
      } else {
        setActiveMonitoringPatients([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };


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

  // Handle patient details modal
  const handleViewPatient = (patientId) => {
    setSelectedPatient(patientId);
    setIsPatientDetailsModalOpen(true);
  };

  // Handle patient click from notification
  const handlePatientClickFromNotification = (patientName, patientId, metadata) => {
    console.log('Notification clicked - navigating to patient:', patientName, 'ID:', patientId);
    setSelectedPatient(patientId);
    setIsPatientDetailsModalOpen(true);
    setIsNotificationOpen(false); // Close notification modal
  };

  // Handle notification count update
  const handleNotificationCountChange = (count) => {
    setNotificationCount(count);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <span className="ml-3 text-gray-600">Loading dashboard...</span>
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
            <div className="text-red-500 text-lg mb-4">Error loading dashboard</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
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
      {/* Main Content Area */}
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">GP Dashboard</h1>
          </div>
          {/* Search Bar and Notification */}
          <div className="w-full lg:w-96 flex items-center gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Quick Access to Patient Records"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>
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


        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Takes 2/3 width */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Recent Referrals / Active Monitoring */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    {activeTab === 'referrals' ? "Recent Referrals" : "Active Monitoring"}
                  </h2>
                  {/* Tabs */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('referrals')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'referrals'
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Referrals
                    </button>
                    <button
                      onClick={() => setActiveTab('monitoring')}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'monitoring'
                          ? 'bg-teal-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Monitoring & Medication
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">
                        {activeTab === 'referrals' ? 'Date' : 'Patient'}
                      </th>
                      <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Patient Name</th>
                      <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">
                        {activeTab === 'referrals' ? 'PSA Level' : 'Last PSA'}
                      </th>
                      <th className="text-left py-3 px-3 sm:px-6 font-medium text-gray-600 text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'referrals' ? (
                      recentReferrals.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center">
                            <div className="text-gray-500">
                              <p className="text-sm font-medium mb-1">No patients available</p>
                              <p className="text-xs">There are no referrals to display at this time.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        recentReferrals.map((referral, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">{referral.date}</td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-900 text-xs sm:text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{referral.patient}</span>
                                {getPriorityBadge(referral.priority)}
                              </div>
                            </td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6">
                              <span className="text-sm font-medium text-gray-900">{referral.psa} ng/mL</span>
                            </td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6">
                              <button
                                onClick={() => handleViewPatient(referral.patientId)}
                                className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors"
                                aria-label={`View details for ${referral.patient}`}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    ) : (
                      activeMonitoringPatients.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center">
                            <div className="text-gray-500">
                              <p className="text-sm font-medium mb-1">No patients available</p>
                              <p className="text-xs">There are no patients under active monitoring at this time.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        activeMonitoringPatients.map((patient, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-700 text-xs sm:text-sm">{patient.lastPSADate}</td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6 text-gray-900 text-xs sm:text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{patient.patient}</span>
                              </div>
                            </td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6">
                              <span className="text-sm font-medium text-gray-900">{patient.lastPSA} ng/mL</span>
                            </td>
                            <td className="py-3 sm:py-4 px-3 sm:px-6">
                              <button
                                onClick={() => handleViewPatient(patient.patientId)}
                                className="px-3 py-1 bg-teal-600 text-white text-xs rounded-md hover:bg-teal-700 transition-colors"
                                aria-label={`View details for ${patient.patient}`}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column - Takes 1/3 width */}
          <div className="lg:col-span-1 space-y-4 lg:space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Quick Stats</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Referrals</span>
                    <span className="text-lg font-semibold text-teal-600">{recentReferrals.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Monitoring</span>
                    <span className="text-lg font-semibold text-teal-600">{activeMonitoringPatients.length}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onPatientClick={handlePatientClickFromNotification}
        onNotificationCountChange={handleNotificationCountChange}
      />

      {/* GP Patient Details Modal */}
      <GPPatientDetailsModal 
        isOpen={isPatientDetailsModalOpen}
        onClose={() => setIsPatientDetailsModalOpen(false)}
        patientId={selectedPatient}
      />
    </div>
  );
};

export default Dashboard;

