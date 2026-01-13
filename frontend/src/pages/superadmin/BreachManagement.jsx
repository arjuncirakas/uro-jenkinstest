import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Mail,
  FileText,
  Loader2,
  Filter,
  X,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock
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

  const [remediationForm, setRemediationForm] = useState({
    action_taken: '',
    effectiveness: 'pending',
    notes: ''
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    severity: ''
  });

  // Fetch incidents
  const fetchIncidents = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await breachNotificationService.getIncidents(filters);
      if (response.success) {
        setIncidents(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch incidents');
      }
    } catch (err) {
      setError('Failed to fetch incidents');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notifications for selected incident
  const fetchNotifications = async () => {
    if (!selectedIncidentId) return;

    try {
      const response = await breachNotificationService.getNotifications(selectedIncidentId);
      if (response.success) {
        setNotifications(response.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
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
    } else if (activeTab === 'notifications' && selectedIncidentId) {
      fetchNotifications();
    } else if (activeTab === 'remediations' && selectedIncidentId) {
      fetchRemediations();
    }
  }, [activeTab, filters, selectedIncidentId]);

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
        await fetchNotifications();
      } else {
        setError(response.error || 'Failed to send notification');
      }
    } catch (err) {
      setError('Failed to send notification');
    }
  };

  const handleAddRemediation = async () => {
    if (!selectedIncidentId) {
      setError('Please select an incident first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await breachNotificationService.addRemediation(selectedIncidentId, remediationForm);
      if (response.success) {
        setShowRemediationModal(false);
        setRemediationForm({
          action_taken: '',
          effectiveness: 'pending',
          notes: ''
        });
        await fetchRemediations();
      } else {
        setError(response.error || 'Failed to add remediation');
      }
    } catch (err) {
      setError('Failed to add remediation');
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
      <div className="w-full p-4 sm:p-6 lg:p-8">
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
                if (!selectedIncidentId && incidents.length > 0) {
                  setSelectedIncidentId(incidents[0].id);
                }
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
                setActiveTab('remediations');
                if (!selectedIncidentId && incidents.length > 0) {
                  setSelectedIncidentId(incidents[0].id);
                }
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === 'remediations'
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Remediations
            </button>
          </nav>
        </div>

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <>
            {/* Filters */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filters:</span>
                </div>

                <div>
                  <label htmlFor="status-filter" className="block text-xs text-gray-600 mb-1">
                    Status
                  </label>
                  <select
                    id="status-filter"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">All</option>
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="severity-filter" className="block text-xs text-gray-600 mb-1">
                    Severity
                  </label>
                  <select
                    id="severity-filter"
                    value={filters.severity}
                    onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">All</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {(filters.status || filters.severity) && (
                  <button
                    onClick={() => setFilters({ status: '', severity: '' })}
                    className="ml-auto inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

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
                            <span className="text-sm text-gray-500">
                              {formatDate(incident.detected_at)}
                            </span>
                          </div>

                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            Incident #{incident.id} - {incident.incident_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>

                          <p className="text-sm text-gray-600 mb-2">{incident.description}</p>

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
                            onClick={() => {
                              setSelectedIncidentId(incident.id);
                              setActiveTab('notifications');
                            }}
                            className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer"
                          >
                            View Notifications
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
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                {selectedIncidentId && (
                  <p className="text-sm text-gray-500 mt-1">Incident ID: {selectedIncidentId}</p>
                )}
              </div>
              {selectedIncidentId && (
                <button
                  onClick={() => setShowNotificationModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors text-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Notification
                </button>
              )}
            </div>

            {!selectedIncidentId ? (
              <div className="text-center py-12">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Please select an incident from the Incidents tab</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No notifications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {notification.notification_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                            notification.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {notification.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          To: {notification.recipient_email} {notification.recipient_name && `(${notification.recipient_name})`}
                        </p>
                        {notification.sent_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Sent: {formatDate(notification.sent_at)}
                          </p>
                        )}
                        {notification.error_message && (
                          <p className="text-xs text-red-600 mt-1">
                            Error: {notification.error_message}
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
        {activeTab === 'remediations' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Remediations</h2>
                {selectedIncidentId && (
                  <p className="text-sm text-gray-500 mt-1">Incident ID: {selectedIncidentId}</p>
                )}
              </div>
              {selectedIncidentId && (
                <button
                  onClick={() => setShowRemediationModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors text-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Remediation
                </button>
              )}
            </div>

            {!selectedIncidentId ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Please select an incident from the Incidents tab</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Loading remediations...</p>
              </div>
            ) : remediations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No remediations found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {remediations.map((remediation) => (
                  <div key={remediation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">{remediation.action_taken}</p>
                        <p className="text-xs text-gray-500">
                          Taken: {formatDate(remediation.taken_at)} by {remediation.taken_by_email || 'System'}
                        </p>
                        {remediation.effectiveness && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                            remediation.effectiveness === 'effective' ? 'bg-green-100 text-green-800' :
                            remediation.effectiveness === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            remediation.effectiveness === 'ineffective' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {remediation.effectiveness}
                          </span>
                        )}
                        {remediation.notes && (
                          <p className="text-sm text-gray-600 mt-2">{remediation.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Incident Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Breach Incident</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Describe the breach incident..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Affected Data Types (comma-separated)</label>
                  <input
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create Notification</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                  <input
                    type="email"
                    value={notificationForm.recipient_email}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, recipient_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name (optional)</label>
                  <input
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Remediation</h2>
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
                  onClick={() => setShowRemediationModal(false)}
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
      </div>
    </div>
  );
};

export default BreachManagement;
