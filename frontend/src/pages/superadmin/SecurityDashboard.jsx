import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  ShieldCheck
} from 'lucide-react';
import { securityDashboardService } from '../../services/securityDashboardService';
import SecurityTeamModal from '../../components/modals/SecurityTeamModal';
import DPOContactModal from '../../components/modals/DPOContactModal';

const SecurityDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showDPOModal, setShowDPOModal] = useState(false);
  
  // Filter states
  const [filters] = useState({
    status: '',
    severity: ''
  });

  // Fetch alerts and stats
  const fetchData = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [alertsResponse, statsResponse] = await Promise.all([
        securityDashboardService.getSecurityAlerts(filters),
        securityDashboardService.getAlertStats()
      ]);

      if (alertsResponse.success) {
        setAlerts(alertsResponse.data || []);
      } else {
        setError(alertsResponse.error || 'Failed to fetch alerts');
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (err) {
      setError('Failed to fetch security data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleResolve = async (alertId) => {
    try {
      const response = await securityDashboardService.resolveAlert(alertId);
      if (response.success) {
        await fetchData();
      } else {
        setError(response.error || 'Failed to resolve alert');
      }
    } catch (err) {
      setError('Failed to resolve alert');
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
      case 'new':
        return 'bg-teal-100 text-teal-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
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
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Security Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Real-time security monitoring and alert management
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDPOModal(true)}
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-md hover:bg-teal-700 transition-colors text-sm cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Add DPO Contact
            </button>
            <button
              onClick={() => setShowTeamModal(true)}
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-md hover:bg-teal-700 transition-colors text-sm cursor-pointer"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Security Team
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
            {/* Total Alerts Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Alerts</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <Shield className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.total || 0}
              </div>
            </div>

            {/* Critical Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Critical</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.bySeverity?.critical || 0}
              </div>
            </div>

            {/* New Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <XCircle className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.byStatus?.new || 0}
              </div>
            </div>

            {/* Resolved Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resolved</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.byStatus?.resolved || 0}
              </div>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Security Alerts</h2>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                <span className="text-gray-600 text-sm">Loading alerts...</span>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No security alerts found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500">
                          {formatDate(alert.created_at)}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1">
                        {alert.alert_type.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>

                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{alert.message}</p>

                      {alert.user_email && (
                        <p className="text-xs text-gray-500 mb-1">
                          User: {alert.user_email}
                        </p>
                      )}

                      {alert.ip_address && (
                        <p className="text-xs text-gray-500 mb-1">
                          IP: {alert.ip_address}
                        </p>
                      )}

                      {alert.details && typeof alert.details === 'object' && (
                        <div className="mt-2 space-y-1">
                          {alert.alert_type === 'lockout_threshold' && alert.details.failedAttempts !== undefined && (
                            <p className="text-xs text-gray-500">
                              Failed Attempts: <span className="font-medium">{alert.details.failedAttempts}</span> / {alert.details.threshold || 10}
                            </p>
                          )}
                          {alert.alert_type === 'multiple_failed_logins' && alert.details.failedAttempts !== undefined && (
                            <p className="text-xs text-gray-500">
                              Failed Attempts: <span className="font-medium">{alert.details.failedAttempts}</span> in {alert.details.timeWindow || '15 minutes'}
                            </p>
                          )}
                          {alert.alert_type === 'unusual_location' && alert.details.previousIP && (
                            <p className="text-xs text-gray-500">
                              Previous IP: <span className="font-medium">{alert.details.previousIP}</span>
                            </p>
                          )}
                          {alert.alert_type === 'simultaneous_login' && alert.details.activeSessions !== undefined && (
                            <p className="text-xs text-gray-500">
                              Active Sessions: <span className="font-medium">{alert.details.activeSessions}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      {(alert.status === 'new' || alert.status === 'acknowledged') && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Team Modal */}
      <SecurityTeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
      />

      {/* DPO Contact Modal */}
      <DPOContactModal
        isOpen={showDPOModal}
        onClose={() => setShowDPOModal(false)}
      />
    </div>
  );
};

export default SecurityDashboard;
