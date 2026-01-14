import React, { useState, useEffect } from 'react';
import {
  Shield,
  Mail,
  FileText,
  Loader2,
  X,
  Plus,
  Send,
  CheckCircle,
  Settings
} from 'lucide-react';
import breachNotificationService from '../../services/breachNotificationService';

const BreachManagement = () => {
  const [activeTab, setActiveTab] = useState('incidents');
  const [incidents, setIncidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [remediations, setRemediations] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showRemediationModal, setShowRemediationModal] = useState(false);
  const [showViewRemediationsModal, setShowViewRemediationsModal] = useState(false);
  const [showEditRemediationModal, setShowEditRemediationModal] = useState(false);
  const [showGovAuthorityModal, setShowGovAuthorityModal] = useState(false);
  const [incidentToNotify, setIncidentToNotify] = useState(null);
  const [incidentForRemediation, setIncidentForRemediation] = useState(null);
  const [remediationToEdit, setRemediationToEdit] = useState(null);
  const [isNotifyingGov, setIsNotifyingGov] = useState(false);
  const [notifiedIncidents, setNotifiedIncidents] = useState(new Set());
  const [notifiedIncidentsList, setNotifiedIncidentsList] = useState([]);
  
  // Form states
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'data_breach',
    severity: 'medium',
    description: '',
    affected_users: [],
    affected_data_types: []
  });

  const [notificationForm, setNotificationForm] = useState({
    notification_type: 'gdpr_supervisory',
    recipient_email: '',
    recipient_name: ''
  });

  const [govAuthorityForm, setGovAuthorityForm] = useState({
    notification_type: 'gdpr_supervisory',
    recipient_email: '',
    recipient_name: ''
  });

  const [remediationForm, setRemediationForm] = useState({
    action_taken: '',
    effectiveness: 'pending',
    notes: ''
  });

  // Helper function to check if incident has government notification
  const checkIncidentGovNotification = async (incidentId) => {
    try {
      const notifResponse = await breachNotificationService.getNotifications(incidentId);
      if (notifResponse.success && notifResponse.data) {
        return notifResponse.data.some(notif => 
          (notif.notification_type === 'gdpr_supervisory' || notif.notification_type === 'hipaa_hhs') &&
          notif.status === 'sent'
        );
      }
      return false;
    } catch (err) {
      console.error(`Error checking notifications for incident ${incidentId}:`, err);
      return false;
    }
  };

  // Fetch incidents
  const fetchIncidents = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await breachNotificationService.getIncidents({});
      if (response.success) {
        const incidentsList = response.data || [];
        setIncidents(incidentsList);
        
        // Check which incidents have been notified to government authorities
        const notifiedSet = new Set();
        for (const incident of incidentsList) {
          const hasGovNotif = await checkIncidentGovNotification(incident.id);
          if (hasGovNotif) {
            notifiedSet.add(incident.id);
          }
        }
        setNotifiedIncidents(notifiedSet);
      } else {
        setError(response.error || 'Failed to fetch incidents');
      }
    } catch (err) {
      setError('Failed to fetch incidents');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to process notifications for an incident
  const processIncidentNotifications = async (incident, allNotifications, notifiedIncidents) => {
    try {
      const notifResponse = await breachNotificationService.getNotifications(incident.id);
      if (notifResponse.success && notifResponse.data) {
        // Filter only government authority notifications
        const govNotifications = notifResponse.data.filter(notif => 
          notif.notification_type === 'gdpr_supervisory' || notif.notification_type === 'hipaa_hhs'
        );
        
        // If incident has been notified, add to notified incidents list
        if (govNotifications.length > 0 && govNotifications.some(n => n.status === 'sent')) {
          notifiedIncidents.push({
            ...incident,
            notifications: govNotifications
          });
        }
        
        // Add incident info to each notification
        govNotifications.forEach(notif => {
          allNotifications.push({
            ...notif,
            incident_id: incident.id,
            incident_type: incident.incident_type,
            incident_severity: incident.severity
          });
        });
      }
    } catch (err) {
      console.error(`Failed to fetch notifications for incident ${incident.id}:`, err);
    }
  };

  // Helper function to sort notifications by date
  const sortNotificationsByDate = (notifications) => {
    return notifications.sort((a, b) => {
      const dateA = a.sent_at || a.created_at;
      const dateB = b.sent_at || b.created_at;
      return new Date(dateB) - new Date(dateA);
    });
  };

  // Helper function to sort incidents by notification date
  const sortIncidentsByNotificationDate = (incidents) => {
    return incidents.sort((a, b) => {
      const dateA = a.notifications[0]?.sent_at || a.notifications[0]?.created_at || a.detected_at;
      const dateB = b.notifications[0]?.sent_at || b.notifications[0]?.created_at || b.detected_at;
      return new Date(dateB) - new Date(dateA);
    });
  };

  // Fetch all government authority notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      // Get all incidents first
      const incidentsResponse = await breachNotificationService.getIncidents({});
      if (incidentsResponse.success && incidentsResponse.data) {
        const allNotifications = [];
        const notifiedIncidents = [];
        
        // Fetch notifications for each incident
        for (const incident of incidentsResponse.data) {
          await processIncidentNotifications(incident, allNotifications, notifiedIncidents);
        }
        
        // Sort by sent_at or created_at (most recent first)
        sortNotificationsByDate(allNotifications);
        sortIncidentsByNotificationDate(notifiedIncidents);
        
        setNotifications(allNotifications);
        setNotifiedIncidentsList(notifiedIncidents);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch remediations for selected incident
  const fetchRemediations = async () => {
    if (!selectedIncidentId) return;

    try {
      const response = await breachNotificationService.getRemediations(selectedIncidentId);
      if (response.success) {
        setRemediations(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch remediations:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'incidents') {
      fetchIncidents();
    } else if (activeTab === 'notifications' || activeTab === 'notified') {
      fetchNotifications();
    }
  }, [activeTab]);

  const handleCreateIncident = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await breachNotificationService.createIncident(incidentForm);
      if (response.success) {
        setShowCreateModal(false);
        setIncidentForm({
          incident_type: 'data_breach',
          severity: 'medium',
          description: '',
          affected_users: [],
          affected_data_types: []
        });
        await fetchIncidents();
      } else {
        setError(response.error || 'Failed to create incident');
      }
    } catch (err) {
      setError('Failed to create incident');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (incidentId, status) => {
    try {
      const response = await breachNotificationService.updateIncidentStatus(incidentId, status);
      if (response.success) {
        await fetchIncidents();
      } else {
        setError(response.error || 'Failed to update incident status');
      }
    } catch (err) {
      setError('Failed to update incident status');
    }
  };

  const handleCreateNotification = async () => {
    if (!selectedIncidentId) {
      setError('Please select an incident first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await breachNotificationService.createNotification(selectedIncidentId, notificationForm);
      if (response.success) {
        setShowNotificationModal(false);
        setNotificationForm({
          notification_type: 'gdpr_supervisory',
          recipient_email: '',
          recipient_name: ''
        });
        await fetchNotifications();
      } else {
        setError(response.error || 'Failed to create notification');
      }
    } catch (err) {
      setError('Failed to create notification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotification = async (notificationId) => {
    try {
      const response = await breachNotificationService.sendNotification(notificationId);
      if (response.success) {
        // Refresh notifications list
        await fetchNotifications();
      } else {
        setError(response.error || 'Failed to send notification');
      }
    } catch (err) {
      setError('Failed to send notification');
    }
  };

  // Helper function to format incident description with JSON parsing
  const formatIncidentDescription = (description) => {
    if (!description) return '';
    
    // Check if description contains JSON string
    const jsonMatch = description.match(/Details:\s*(\{.*\})/s);
    if (!jsonMatch) {
      return description;
    }
    
    try {
      const jsonStr = jsonMatch[1];
      const jsonData = JSON.parse(jsonStr);
      
      // Format the JSON data nicely
      const parts = [];
      if (jsonData.eventHour !== undefined) {
        parts.push(`Event Hour: ${jsonData.eventHour}:00`);
      }
      if (jsonData.averageHour !== undefined) {
        parts.push(`Average Hour: ${jsonData.averageHour}:00`);
      }
      if (jsonData.expectedHours && Array.isArray(jsonData.expectedHours)) {
        const hoursText = jsonData.expectedHours.map(h => `${h}:00`).join(', ');
        parts.push(`Expected Hours: ${hoursText}`);
      }
      if (jsonData.eventType) {
        parts.push(`Event Type: ${jsonData.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      }
      if (jsonData.ipAddress) {
        parts.push(`IP Address: ${jsonData.ipAddress}`);
      }
      if (jsonData.location) {
        parts.push(`Location: ${jsonData.location}`);
      }
      
      // Replace JSON with formatted details
      if (parts.length > 0) {
        return description.replace(jsonMatch[0], `Details: ${parts.join(' | ')}`);
      }
      return description;
    } catch (e) {
      // If parsing fails, just show as is
      return description;
    }
  };

  const handleNotifyGovAuthority = async () => {
    if (!incidentToNotify || !govAuthorityForm.recipient_email) {
      setError('Please provide recipient email');
      return;
    }

    setIsNotifyingGov(true);
    setError('');

    try {
      // Create notification record
      const notificationData = {
        notification_type: govAuthorityForm.notification_type,
        recipient_type: govAuthorityForm.notification_type === 'gdpr_supervisory' ? 'supervisory_authority' : 'hhs',
        recipient_email: govAuthorityForm.recipient_email,
        recipient_name: govAuthorityForm.recipient_name || null
      };

      const createResponse = await breachNotificationService.createNotification(incidentToNotify.id, notificationData);
      
      if (createResponse.success) {
        // Send notification immediately
        const sendResponse = await breachNotificationService.sendNotification(createResponse.data.id);
        
        if (sendResponse.success) {
          setShowGovAuthorityModal(false);
          setIncidentToNotify(null);
          setGovAuthorityForm({
            notification_type: 'gdpr_supervisory',
            recipient_email: '',
            recipient_name: ''
          });
          // Refresh incidents to show updated notification status
          await fetchIncidents();
          // Refresh notifications if on notifications tab
          if (activeTab === 'notifications') {
            await fetchNotifications();
          }
        } else {
          setError(sendResponse.error || 'Failed to send notification email');
        }
      } else {
        setError(createResponse.error || 'Failed to create notification');
      }
    } catch (err) {
      setError('Failed to notify government authority');
    } finally {
      setIsNotifyingGov(false);
    }
  };

  const handleOpenGovAuthorityModal = (incident) => {
    setIncidentToNotify(incident);
    setGovAuthorityForm({
      notification_type: 'gdpr_supervisory',
      recipient_email: '',
      recipient_name: ''
    });
    setShowGovAuthorityModal(true);
  };

  const handleCancelGovAuthority = () => {
    setShowGovAuthorityModal(false);
    setIncidentToNotify(null);
    setGovAuthorityForm({
      notification_type: 'gdpr_supervisory',
      recipient_email: '',
      recipient_name: ''
    });
  };


  const handleAddRemediation = async () => {
    const incidentId = incidentForRemediation?.id || selectedIncidentId;
    if (!incidentId) {
      setError('Please select an incident first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await breachNotificationService.addRemediation(incidentId, remediationForm);
      if (response.success) {
        setShowRemediationModal(false);
        setIncidentForRemediation(null);
        setRemediationForm({
          action_taken: '',
          effectiveness: 'pending',
          notes: ''
        });
        if (selectedIncidentId) {
          await fetchRemediations();
        }
        // Refresh notified incidents list
        await fetchNotifications();
      } else {
        setError(response.error || 'Failed to add remediation');
      }
    } catch (err) {
      setError('Failed to add remediation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddRemediation = (incident) => {
    setIncidentForRemediation(incident);
    setShowRemediationModal(true);
  };

  const handleViewRemediations = async (incident) => {
    setIncidentForRemediation(incident);
    setIsLoading(true);
    try {
      const response = await breachNotificationService.getRemediations(incident.id);
      if (response.success) {
        setRemediations(response.data || []);
        setShowViewRemediationsModal(true);
      } else {
        setError(response.error || 'Failed to fetch remediations');
      }
    } catch (err) {
      setError('Failed to fetch remediations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRemediation = (remediation) => {
    setRemediationToEdit(remediation);
    setRemediationForm({
      action_taken: remediation.action_taken || '',
      effectiveness: remediation.effectiveness || 'pending',
      notes: remediation.notes || ''
    });
    setShowEditRemediationModal(true);
  };

  const handleUpdateRemediation = async () => {
    if (!remediationToEdit || !remediationForm.action_taken) {
      setError('Please provide action taken');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await breachNotificationService.updateRemediation(remediationToEdit.id, remediationForm);
      if (response.success) {
        setShowEditRemediationModal(false);
        setRemediationToEdit(null);
        setRemediationForm({
          action_taken: '',
          effectiveness: 'pending',
          notes: ''
        });
        // Refresh remediations if viewing modal is open
        if (showViewRemediationsModal && incidentForRemediation) {
          const refreshResponse = await breachNotificationService.getRemediations(incidentForRemediation.id);
          if (refreshResponse.success) {
            setRemediations(refreshResponse.data || []);
          }
        }
        // Refresh notified incidents list
        if (activeTab === 'notified') {
          await fetchNotifications();
        }
      } else {
        setError(response.error || 'Failed to update remediation');
      }
    } catch (err) {
      setError('Failed to update remediation');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'under_investigation':
        return 'bg-yellow-100 text-yellow-800';
      case 'contained':
        return 'bg-green-100 text-green-800';
      case 'resolved':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <div className="w-full p-2 sm:p-3 lg:p-4">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Breach Management
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage data breach incidents, notifications, and remediations
            </p>
          </div>

          {activeTab === 'incidents' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors text-sm cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Incident
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('incidents');
                setSelectedIncidentId(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'incidents'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Incidents
            </button>
            <button
              onClick={() => {
                setActiveTab('notifications');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'notifications'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => {
                setActiveTab('notified');
                fetchNotifications();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'notified'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Remediations
              {notifiedIncidentsList.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700">
                  {notifiedIncidentsList.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <>
            {/* Incidents List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Breach Incidents</h2>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                  <p className="mt-2 text-sm text-gray-500">Loading incidents...</p>
                </div>
              ) : incidents.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No incidents found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                              {incident.severity.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                              {incident.status.replaceAll('_', ' ')}
                            </span>
                            {notifiedIncidents.has(incident.id) && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Authority Notified
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              {formatDate(incident.detected_at)}
                            </span>
                          </div>

                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            Incident #{incident.id} - {incident.incident_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>

                          <div className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                            {formatIncidentDescription(incident.description)}
                          </div>

                          {incident.affected_data_types && incident.affected_data_types.length > 0 && (
                            <p className="text-xs text-gray-500 mb-1">
                              Affected Data: {incident.affected_data_types.join(', ')}
                            </p>
                          )}

                          {incident.affected_users && incident.affected_users.length > 0 && (
                            <p className="text-xs text-gray-500">
                              Affected Users: {incident.affected_users.length} individual(s)
                            </p>
                          )}
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          <select
                            value={incident.status}
                            onChange={(e) => handleUpdateStatus(incident.id, e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                          >
                            <option value="draft">Draft</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="under_investigation">Under Investigation</option>
                            <option value="contained">Contained</option>
                            <option value="resolved">Resolved</option>
                          </select>
                          <button
                            onClick={() => handleOpenGovAuthorityModal(incident)}
                            className="px-4 py-2 text-sm font-medium bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            Notify Government Authority
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Government Authority Notifications</h2>
              <p className="text-sm text-gray-500 mt-1">All notifications sent to GDPR Supervisory Authority and HIPAA HHS</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No government authority notifications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">
                            {notification.notification_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          {(() => {
                            const getStatusClass = (status) => {
                              if (status === 'sent') return 'bg-green-100 text-green-800';
                              if (status === 'failed') return 'bg-red-100 text-red-800';
                              return 'bg-yellow-100 text-yellow-800';
                            };
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(notification.status)}`}>
                                {notification.status}
                              </span>
                            );
                          })()}
                          {notification.incident_id && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Incident #{notification.incident_id}
                            </span>
                          )}
                          {notification.incident_severity && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(notification.incident_severity)}`}>
                              {notification.incident_severity.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">To:</span> {notification.recipient_email}
                          {notification.recipient_name && ` (${notification.recipient_name})`}
                        </p>
                        {notification.sent_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Sent:</span> {formatDate(notification.sent_at)}
                          </p>
                        )}
                        {notification.created_at && !notification.sent_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Created:</span> {formatDate(notification.created_at)}
                          </p>
                        )}
                        {notification.error_message && (
                          <p className="text-xs text-red-600 mt-1">
                            <span className="font-medium">Error:</span> {notification.error_message}
                          </p>
                        )}
                      </div>
                      {notification.status === 'pending' && (
                        <button
                          onClick={() => handleSendNotification(notification.id)}
                          className="ml-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-100 text-teal-800 rounded-lg hover:bg-teal-200 transition-colors cursor-pointer"
                        >
                          <Send className="h-4 w-4" />
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Remediations Tab */}
        {activeTab === 'notified' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Remediations</h2>
              <p className="text-sm text-gray-500 mt-1">Manage remediations for incidents that have been notified to government authorities</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Loading incidents...</p>
              </div>
            ) : notifiedIncidentsList.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No notified incidents found. Notify an incident first to add remediations.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifiedIncidentsList.map((incident) => {
                  const severityColors = getSeverityColor(incident.severity);
                  const statusColors = getStatusColor(incident.status);
                  
                  return (
                    <div key={incident.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                              Incident #{incident.id}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityColors}`}>
                              {incident.severity?.toUpperCase() || 'N/A'}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors}`}>
                              {incident.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Draft'}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Notified
                            </span>
                          </div>
                          
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {incident.incident_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Type'}
                          </p>
                          
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {incident.description || 'No description provided.'}
                          </p>

                          {incident.affected_data_types && incident.affected_data_types.length > 0 && (
                            <p className="text-xs text-gray-500 mb-1">
                              Affected Data: {incident.affected_data_types.join(', ')}
                            </p>
                          )}

                          {incident.affected_users && incident.affected_users.length > 0 && (
                            <p className="text-xs text-gray-500 mb-2">
                              Affected Users: {incident.affected_users.length} individual(s)
                            </p>
                          )}

                          {incident.notifications && incident.notifications.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Notifications Sent:</p>
                              <div className="flex flex-wrap gap-2">
                                {incident.notifications.map((notif) => (
                                  <span key={notif.id} className="text-xs text-gray-600">
                                    {notif.notification_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                                    {notif.sent_at && ` - ${formatDate(notif.sent_at)}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-gray-500 mt-2">
                            Detected: {formatDate(incident.detected_at || incident.created_at)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleOpenAddRemediation(incident)}
                            className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            <Plus className="h-4 w-4" />
                            Add Remediation
                          </button>
                          <button
                            onClick={() => handleViewRemediations(incident)}
                            className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            <FileText className="h-4 w-4" />
                            View Remediations
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Incident Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Breach Incident</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="incident-type" className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                  <select
                    id="incident-type"
                    value={incidentForm.incident_type}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, incident_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="data_breach">Data Breach</option>
                    <option value="security_incident">Security Incident</option>
                    <option value="unauthorized_access">Unauthorized Access</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="incident-severity" className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    id="incident-severity"
                    value={incidentForm.severity}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="incident-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="incident-description"
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Describe the breach incident..."
                  />
                </div>
                <div>
                  <label htmlFor="affected-data-types" className="block text-sm font-medium text-gray-700 mb-1">Affected Data Types (comma-separated)</label>
                  <input
                    id="affected-data-types"
                    type="text"
                    value={incidentForm.affected_data_types.join(', ')}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, affected_data_types: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="PHI, PII, financial"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateIncident}
                  disabled={isLoading || !incidentForm.description}
                  className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Notification Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Notification</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="notification-type" className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
                  <select
                    id="notification-type"
                    value={notificationForm.notification_type}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, notification_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="gdpr_supervisory">GDPR Supervisory Authority</option>
                    <option value="hipaa_hhs">HIPAA HHS</option>
                    <option value="individual_patient">Individual Patient</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="notification-recipient-email" className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                  <input
                    id="notification-recipient-email"
                    type="email"
                    value={notificationForm.recipient_email}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, recipient_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="notification-recipient-name" className="block text-sm font-medium text-gray-700 mb-1">Recipient Name (optional)</label>
                  <input
                    id="notification-recipient-name"
                    type="text"
                    value={notificationForm.recipient_name}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Recipient Name"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNotification}
                  disabled={isLoading || !notificationForm.recipient_email}
                  className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Remediation Modal */}
        {showRemediationModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Add Remediation
                {incidentForRemediation && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (Incident #{incidentForRemediation.id})
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                  <textarea
                    value={remediationForm.action_taken}
                    onChange={(e) => setRemediationForm(prev => ({ ...prev, action_taken: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Describe the remediation action..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effectiveness</label>
                  <select
                    value={remediationForm.effectiveness}
                    onChange={(e) => setRemediationForm(prev => ({ ...prev, effectiveness: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="effective">Effective</option>
                    <option value="partial">Partial</option>
                    <option value="ineffective">Ineffective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={remediationForm.notes}
                    onChange={(e) => setRemediationForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRemediationModal(false);
                    setIncidentForRemediation(null);
                    setRemediationForm({
                      action_taken: '',
                      effectiveness: 'pending',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRemediation}
                  disabled={isLoading || !remediationForm.action_taken}
                  className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Remediations Modal */}
        {showViewRemediationsModal && incidentForRemediation && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Remediations for Incident #{incidentForRemediation.id}
                </h2>
                <button
                  onClick={() => {
                    setShowViewRemediationsModal(false);
                    setIncidentForRemediation(null);
                    setRemediations([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                  <p className="mt-2 text-sm text-gray-500">Loading remediations...</p>
                </div>
              ) : remediations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No remediations found for this incident</p>
                  <button
                    onClick={() => {
                      setShowViewRemediationsModal(false);
                      handleOpenAddRemediation(incidentForRemediation);
                    }}
                    className="mt-4 px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add First Remediation
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {remediations.map((remediation) => (
                    <div key={remediation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">{remediation.action_taken}</p>
                          <p className="text-xs text-gray-500 mb-2">
                            Taken: {formatDate(remediation.taken_at)} by {remediation.taken_by_email || 'System'}
                          </p>
                          {remediation.effectiveness && (() => {
                            const getEffectivenessClass = (eff) => {
                              if (eff === 'effective') return 'bg-green-100 text-green-800';
                              if (eff === 'partial') return 'bg-yellow-100 text-yellow-800';
                              if (eff === 'ineffective') return 'bg-red-100 text-red-800';
                              return 'bg-gray-100 text-gray-800';
                            };
                            return (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEffectivenessClass(remediation.effectiveness)}`}>
                                {remediation.effectiveness}
                              </span>
                            );
                          })()}
                          {remediation.notes && (
                            <p className="text-sm text-gray-600 mt-2">{remediation.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditRemediation(remediation)}
                          className="ml-4 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowViewRemediationsModal(false);
                        handleOpenAddRemediation(incidentForRemediation);
                      }}
                      className="w-full px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Remediation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Remediation Modal */}
        {showEditRemediationModal && remediationToEdit && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Remediation
                  {incidentForRemediation && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Incident #{incidentForRemediation.id})
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setShowEditRemediationModal(false);
                    setRemediationToEdit(null);
                    setRemediationForm({
                      action_taken: '',
                      effectiveness: 'pending',
                      notes: ''
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                  <textarea
                    value={remediationForm.action_taken}
                    onChange={(e) => setRemediationForm(prev => ({ ...prev, action_taken: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Describe the remediation action..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effectiveness</label>
                  <select
                    value={remediationForm.effectiveness}
                    onChange={(e) => setRemediationForm(prev => ({ ...prev, effectiveness: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="effective">Effective</option>
                    <option value="partial">Partial</option>
                    <option value="ineffective">Ineffective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={remediationForm.notes}
                    onChange={(e) => setRemediationForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditRemediationModal(false);
                    setRemediationToEdit(null);
                    setRemediationForm({
                      action_taken: '',
                      effectiveness: 'pending',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRemediation}
                  disabled={isLoading || !remediationForm.action_taken}
                  className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notify Government Authority Modal */}
        {showGovAuthorityModal && incidentToNotify && (
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 border-none outline-none"
            onClick={handleCancelGovAuthority}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCancelGovAuthority();
              }
            }}
            aria-label="Close modal"
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Notify Government Authority</h2>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 mb-4">
                  Send a breach notification to the appropriate government authority. This will create a notification record and send the email immediately.
                </p>
                {incidentToNotify && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Incident ID:</p>
                    <p className="text-sm font-medium text-gray-900">#{incidentToNotify.id}</p>
                    <p className="text-xs text-gray-500 mt-2 mb-1">Type:</p>
                    <p className="text-sm text-gray-700">{incidentToNotify.incident_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p className="text-xs text-gray-500 mt-2 mb-1">Severity:</p>
                    <p className="text-sm font-medium text-gray-900">{incidentToNotify.severity?.toUpperCase() || 'N/A'}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="gov-authority-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Authority Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="gov-authority-type"
                      value={govAuthorityForm.notification_type}
                      onChange={(e) => setGovAuthorityForm(prev => ({ ...prev, notification_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      disabled={isNotifyingGov}
                    >
                      <option value="gdpr_supervisory">GDPR Supervisory Authority</option>
                      <option value="hipaa_hhs">HIPAA HHS</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {(() => {
                        if (govAuthorityForm.notification_type === 'gdpr_supervisory') {
                          return 'GDPR requires notification within 72 hours';
                        }
                        return 'HIPAA requires notification within 60 days';
                      })()}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="gov-recipient-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="gov-recipient-email"
                      type="email"
                      value={govAuthorityForm.recipient_email}
                      onChange={(e) => setGovAuthorityForm(prev => ({ ...prev, recipient_email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="authority@example.com"
                      disabled={isNotifyingGov}
                    />
                  </div>
                  <div>
                    <label htmlFor="gov-recipient-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Name (optional)
                    </label>
                    <input
                      id="gov-recipient-name"
                      type="text"
                      value={govAuthorityForm.recipient_name}
                      onChange={(e) => setGovAuthorityForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Supervisory Authority Name"
                      disabled={isNotifyingGov}
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={handleCancelGovAuthority}
                  disabled={isNotifyingGov}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNotifyGovAuthority}
                  disabled={isNotifyingGov || !govAuthorityForm.recipient_email}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isNotifyingGov ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Notification
                    </>
                  )}
                </button>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default BreachManagement;
