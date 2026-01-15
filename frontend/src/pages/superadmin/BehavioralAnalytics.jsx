import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  MapPin,
  Loader2,
  X,
  Shield,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import behavioralAnalyticsService from '../../services/behavioralAnalyticsService';
import breachNotificationService from '../../services/breachNotificationService';

const BehavioralAnalytics = () => {
  const [activeTab, setActiveTab] = useState('anomalies');
  const [anomalySubTab, setAnomalySubTab] = useState('all'); // 'all' or 'notified'
  const [anomalies, setAnomalies] = useState([]);
  const [notifiedAnomaliesList, setNotifiedAnomaliesList] = useState([]);
  const [baselines, setBaselines] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userIdentifier, setUserIdentifier] = useState('');
  const [selectedBaselineType, setSelectedBaselineType] = useState('location');
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [anomalyToDismiss, setAnomalyToDismiss] = useState(null);
  const [showNotifyConfirm, setShowNotifyConfirm] = useState(false);
  const [anomalyToNotify, setAnomalyToNotify] = useState(null);
  const [isNotifying, setIsNotifying] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    userId: '',
    startDate: '',
    endDate: ''
  });

  // Fetch anomalies
  const fetchAnomalies = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await behavioralAnalyticsService.getAnomalies(filters);
      if (response.success) {
        setAnomalies(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch anomalies');
      }
    } catch (err) {
      setError('Failed to fetch anomalies');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notified anomalies
  const fetchNotifiedAnomalies = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await behavioralAnalyticsService.getNotifiedAnomalies(filters);
      if (response.success) {
        setNotifiedAnomaliesList(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch notified anomalies');
      }
    } catch (err) {
      setError('Failed to fetch notified anomalies');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch baselines
  const fetchBaselines = async () => {
    if (!userIdentifier) {
      setError('Please enter a user ID or email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await behavioralAnalyticsService.getBaselines(userIdentifier);
      if (response.success) {
        setBaselines(response.data || []);
      } else {
        setError(response.error || 'Failed to fetch baselines');
      }
    } catch (err) {
      setError('Failed to fetch baselines');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await behavioralAnalyticsService.getStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  useEffect(() => {
    fetchStatistics();
    if (activeTab === 'anomalies') {
      if (anomalySubTab === 'notified') {
        fetchNotifiedAnomalies();
      } else {
        fetchAnomalies();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, anomalySubTab, filters]);

  const handleUpdateStatus = async (anomalyId, status) => {
    try {
      const response = await behavioralAnalyticsService.updateAnomalyStatus(anomalyId, status);
      if (response.success) {
        await fetchAnomalies();
      } else {
        setError(response.error || 'Failed to update anomaly status');
      }
    } catch (err) {
      setError('Failed to update anomaly status');
    }
  };

  const handleDismissClick = (anomaly) => {
    setAnomalyToDismiss(anomaly);
    setShowDismissConfirm(true);
  };

  const handleConfirmDismiss = async () => {
    if (anomalyToDismiss) {
      await handleUpdateStatus(anomalyToDismiss.id, 'dismissed');
      setShowDismissConfirm(false);
      setAnomalyToDismiss(null);
    }
  };

  const handleCancelDismiss = () => {
    setShowDismissConfirm(false);
    setAnomalyToDismiss(null);
  };

  const handleCalculateBaseline = async () => {
    if (!userIdentifier) {
      setError('Please enter a user ID or email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await behavioralAnalyticsService.calculateBaseline(
        userIdentifier,
        selectedBaselineType
      );
      if (response.success) {
        await fetchBaselines();
        setError('');
      } else {
        setError(response.error || 'Failed to calculate baseline');
      }
    } catch (err) {
      setError('Failed to calculate baseline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotifyClick = (anomaly) => {
    setAnomalyToNotify(anomaly);
    setShowNotifyConfirm(true);
  };

  // Format anomaly details for display
  const formatAnomalyDetails = (anomaly) => {
    if (!anomaly.details || typeof anomaly.details !== 'object') {
      return 'No additional details available.';
    }

    const details = anomaly.details;
    const parts = [];

    if (details.eventHour !== undefined) {
      parts.push(`Event Hour: ${details.eventHour}:00`);
    }
    if (details.averageHour !== undefined) {
      parts.push(`Average Hour: ${details.averageHour}:00`);
    }
    if (details.expectedHours && Array.isArray(details.expectedHours)) {
      const hoursText = details.expectedHours.map(h => `${h}:00`).join(', ');
      parts.push(`Expected Hours: ${hoursText}`);
    }
    if (details.eventType) {
      parts.push(`Event Type: ${details.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
    }
    if (details.ipAddress) {
      parts.push(`IP Address: ${details.ipAddress}`);
    }
    if (details.location) {
      parts.push(`Location: ${details.location}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No additional details available.';
  };

  const handleConfirmNotify = async () => {
    if (!anomalyToNotify || isNotifying) return;

    setIsNotifying(true);
    try {
      const anomalyTypeFormatted = anomalyToNotify.anomaly_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
      const detailsFormatted = formatAnomalyDetails(anomalyToNotify);
      
      const getSeverity = () => {
        if (anomalyToNotify.severity === 'high') return 'high';
        if (anomalyToNotify.severity === 'medium') return 'medium';
        return 'low';
      };
      const userIdentifier = anomalyToNotify.user_email || anomalyToNotify.user_id;
      const incidentData = {
        incident_type: 'security_incident',
        severity: getSeverity(),
        description: `Behavioral anomaly detected: ${anomalyTypeFormatted} for user ${userIdentifier}.\n\nDetails: ${detailsFormatted}`,
        affected_users: [anomalyToNotify.user_id],
        affected_data_types: ['PII', 'PHI'],
        anomaly_id: anomalyToNotify.id
      };

      const response = await breachNotificationService.createIncident(incidentData);
      if (response.success) {
        setShowNotifyConfirm(false);
        setAnomalyToNotify(null);
        // Show success message
        setError('');
        // Refresh anomalies based on current tab
        if (anomalySubTab === 'notified') {
          await fetchNotifiedAnomalies();
        } else {
          await fetchAnomalies();
        }
      } else {
        setError(response.error || 'Failed to create breach incident');
        setShowNotifyConfirm(false);
        setAnomalyToNotify(null);
      }
    } catch (err) {
      setError('Failed to create breach incident');
      setShowNotifyConfirm(false);
      setAnomalyToNotify(null);
    } finally {
      setIsNotifying(false);
    }
  };

  const handleCancelNotify = () => {
    setShowNotifyConfirm(false);
    setAnomalyToNotify(null);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return { bg: 'bg-red-500/10', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
      case 'medium':
        return { bg: 'bg-orange-500/10', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' };
      case 'low':
        return { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
      default:
        return { bg: 'bg-gray-500/10', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return { bg: 'bg-teal-500/10', text: 'text-teal-700' };
      case 'reviewed':
        return { bg: 'bg-blue-500/10', text: 'text-blue-700' };
      case 'dismissed':
        return { bg: 'bg-gray-500/10', text: 'text-gray-700' };
      case 'escalated':
        return { bg: 'bg-purple-500/10', text: 'text-purple-700' };
      default:
        return { bg: 'bg-gray-500/10', text: 'text-gray-700' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Convert server time to client local time
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true // Ensure AM/PM is shown
    });
  };

  // Format hour (0-23) to 12-hour format with AM/PM
  const formatHour = (hour24) => {
    if (hour24 === null || hour24 === undefined) return 'N/A';
    const hour = parseInt(hour24, 10);
    if (isNaN(hour)) return 'N/A';
    
    // Convert to 12-hour format
    const getHour12 = (h) => {
      if (h === 0) return 12;
      if (h > 12) return h - 12;
      return h;
    };
    const hour12 = getHour12(hour);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour12}:00 ${ampm}`;
  };

  const clearFilters = () => {
    setFilters({ status: '', severity: '', userId: '', startDate: '', endDate: '' });
  };

  const hasActiveFilters = filters.status || filters.severity || filters.userId || filters.startDate || filters.endDate;

  // Helper function to get location display text
  const getLocationDisplayText = (loc) => {
    if (loc.location && loc.location.trim() !== '') {
      return loc.location;
    }
    if (!loc.ip) {
      return 'Unknown Location';
    }
    const ip = loc.ip.trim();
    const isLocalIP = ip === '::1' || ip === '::ffff:127.0.0.1' || 
      ip.startsWith('127.') || ip.startsWith('192.168.') || 
      ip.startsWith('10.') || 
      (ip.startsWith('172.') && parseInt(ip.split('.')[1] || '0') >= 16 && parseInt(ip.split('.')[1] || '0') <= 31);
    if (isLocalIP) {
      return 'Local Connection';
    }
    if (ip !== 'unknown') {
      return `IP: ${ip}`;
    }
    return 'Unknown Location';
  };

  // Helper function to render location item
  const renderLocationItem = (loc, idx) => {
    const displayText = getLocationDisplayText(loc);
    const frequency = loc.frequency || loc.count || 0;
    return (
      <div key={`location-${loc.ip}-${idx}`} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
        <span className="text-xs text-gray-700">{displayText}</span>
        <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">{frequency} login(s)</span>
      </div>
    );
  };

  // Helper function to render hour item
  const renderHourItem = (hourData) => (
    <div key={hourData.hour} className="bg-gray-50 p-2 rounded border border-gray-200 text-center">
      <p className="text-xs text-gray-600 mb-0.5">{formatHour(hourData.hour)}</p>
      <p className="text-sm font-bold text-gray-900">{hourData.frequency}</p>
    </div>
  );

  // Helper function to render action item
  const renderActionItem = (action, idx) => {
    const actionName = action.action || 'Unknown';
    const actionKey = `action-${actionName}-${idx}`;
    const frequency = action.frequency || action.count || 0;
    return (
      <div key={actionKey} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
        <span className="text-xs text-gray-700">{actionName}</span>
        <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">{frequency} time(s)</span>
      </div>
    );
  };

  // Helper function to render location baseline
  const renderLocationBaseline = (baselineData) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
          <p className="text-xs text-teal-600 mb-1">Total Logins</p>
          <p className="text-2xl font-bold text-teal-900">{baselineData?.totalLogins || 0}</p>
        </div>
        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
          <p className="text-xs text-teal-600 mb-1">Unique Locations</p>
          <p className="text-2xl font-bold text-teal-900">{baselineData?.uniqueLocations || 0}</p>
        </div>
      </div>
      {baselineData?.commonLocations && baselineData.commonLocations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Common Locations</p>
          <div className="space-y-1.5">
            {baselineData.commonLocations.map(renderLocationItem)}
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render time baseline
  const renderTimeBaseline = (baselineData) => {
    const sortedHourDistribution = baselineData?.hourDistribution 
      ? [...baselineData.hourDistribution].sort((a, b) => a.hour - b.hour)
      : [];
    
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
            <p className="text-xs text-teal-600 mb-1">Total Logins</p>
            <p className="text-2xl font-bold text-teal-900">{baselineData?.totalLogins || 0}</p>
          </div>
          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
            <p className="text-xs text-teal-600 mb-1">Most Active Hour</p>
            <p className="text-2xl font-bold text-teal-900">
              {formatHour(baselineData?.averageHour)}
            </p>
          </div>
        </div>
        {sortedHourDistribution.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Hourly Distribution</p>
            <div className="grid grid-cols-6 gap-2">
              {sortedHourDistribution.map(renderHourItem)}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper function to render access pattern baseline
  const renderAccessPatternBaseline = (baselineData) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
          <p className="text-xs text-teal-600 mb-1">Total Actions</p>
          <p className="text-2xl font-bold text-teal-900">{baselineData?.totalActions || 0}</p>
        </div>
        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
          <p className="text-xs text-teal-600 mb-1">Unique Actions</p>
          <p className="text-2xl font-bold text-teal-900">{baselineData?.uniqueActions || 0}</p>
        </div>
      </div>
      {baselineData?.commonActions && baselineData.commonActions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Common Actions</p>
          <div className="space-y-1.5">
            {baselineData.commonActions.map(renderActionItem)}
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render baseline data
  const renderBaselineData = (baseline, baselineData) => {
    if (baseline.baseline_type === 'location') {
      return renderLocationBaseline(baselineData);
    }
    if (baseline.baseline_type === 'time') {
      return renderTimeBaseline(baselineData);
    }
    if (baseline.baseline_type === 'access_pattern') {
      return renderAccessPatternBaseline(baselineData);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="w-full px-2 sm:px-3 lg:px-4 py-4">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Behavioral Analytics</h1>
              <p className="text-sm text-gray-500">Advanced user behavior monitoring and anomaly detection</p>
            </div>
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Statistics Dashboard */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Anomalies</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {statistics.total || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">New Anomalies</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <Activity className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {statistics.byStatus?.new || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">High Severity</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <Shield className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {statistics.bySeverity?.high || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recent (7 days)</div>
                <div className="p-1.5 bg-gray-100 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {statistics.recent || 0}
              </div>
            </div>
          </div>
        )}

        {/* Professional Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 font-semibold text-sm transition-all duration-200 cursor-pointer relative ${
                activeTab === 'anomalies'
                  ? 'text-teal-600 bg-teal-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              {activeTab === 'anomalies' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-teal-600" />
              )}
              <AlertTriangle className={`h-5 w-5 ${activeTab === 'anomalies' ? 'text-teal-600' : 'text-gray-400'}`} />
              <span>Anomalies</span>
              {statistics && statistics.total > 0 && (
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'anomalies' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {statistics.total}
                </span>
              )}
            </button>
            <div className="w-px bg-gray-200" />
            <button
              onClick={() => setActiveTab('baselines')}
              className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 font-semibold text-sm transition-all duration-200 cursor-pointer relative ${
                activeTab === 'baselines'
                  ? 'text-teal-600 bg-teal-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              {activeTab === 'baselines' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-teal-600" />
              )}
              <BarChart3 className={`h-5 w-5 ${activeTab === 'baselines' ? 'text-teal-600' : 'text-gray-400'}`} />
              <span>Baselines</span>
            </button>
          </div>
        </div>


        {/* Anomalies Content */}
        {activeTab === 'anomalies' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Detected Anomalies</h2>
              </div>
              
              {/* Sub-tabs for New and Notified */}
              <div className="flex gap-2 border-b border-gray-200 -mb-4">
                <button
                  onClick={() => setAnomalySubTab('all')}
                  className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                    anomalySubTab === 'all'
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  New Anomalies
                </button>
                <button
                  onClick={() => setAnomalySubTab('notified')}
                  className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                    anomalySubTab === 'notified'
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Notified
                  {notifiedAnomaliesList.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700">
                      {notifiedAnomaliesList.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {(() => {
              if (isLoading) {
                const loadingPrefix = anomalySubTab === 'notified' ? 'notified ' : '';
                return (
                  <div className="text-center py-12">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                      <span className="text-gray-600 text-sm">
                        {`Loading ${loadingPrefix}anomalies...`}
                      </span>
                    </div>
                  </div>
                );
              }
              
              const currentList = anomalySubTab === 'notified' ? notifiedAnomaliesList : anomalies;
              const isEmpty = currentList.length === 0;
              
              if (isEmpty) {
                return (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-sm mb-2">
                      {(() => {
                        if (hasActiveFilters) {
                          const prefix = anomalySubTab === 'notified' ? 'notified ' : '';
                          return `No ${prefix}anomalies match your filters`;
                        }
                        if (anomalySubTab === 'notified') {
                          return 'No anomalies have been notified yet';
                        }
                        return 'No behavioral anomalies detected';
                      })()}
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="mt-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                );
              }
              
              return (
                <div className="p-4 space-y-3">
                {(anomalySubTab === 'notified' ? notifiedAnomaliesList : anomalies).map((anomaly) => {
                  const severityColors = getSeverityColor(anomaly.severity);
                  const statusColors = getStatusColor(anomaly.status);
                  
                  return (
                    <div
                      key={anomaly.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-teal-300 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${severityColors.bg} ${severityColors.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${severityColors.dot}`} />
                                {anomaly.severity.toUpperCase()}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                                {anomaly.status}
                              </span>
                              {(anomalySubTab === 'notified' || anomaly.incident_id) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Notified
                                  {anomaly.incident_id && (
                                    <span className="text-green-600">(Incident #{anomaly.incident_id})</span>
                                  )}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatDate(anomaly.detected_at)}
                              </span>
                            </div>
                            
                            <div className="font-medium text-gray-900 text-sm mb-2">
                              {anomaly.anomaly_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>

                            {anomaly.user_email && (
                              <div className="text-xs text-gray-600 mb-1">
                                User: {anomaly.user_email}
                              </div>
                            )}

                            {anomaly.details && typeof anomaly.details === 'object' && (
                              <div className="space-y-1 mt-2">
                                {anomaly.details.ipAddress && (
                                  <div className="text-xs text-gray-600">
                                    IP: <span className="font-mono font-medium">{anomaly.details.ipAddress}</span>
                                  </div>
                                )}
                                {anomaly.details.eventHour !== undefined && (
                                  <div className="text-xs text-gray-600">
                                    Event Hour: <span className="font-medium">{anomaly.details.eventHour}:00</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {anomalySubTab === 'notified' ? (
                            <span className="px-3 py-1.5 text-xs rounded-md bg-green-100 text-green-700 font-medium whitespace-nowrap text-center">
                              Already Notified
                            </span>
                          ) : (
                            <>
                              {(anomaly.status === 'new' || anomaly.status === 'reviewed' || anomaly.status === 'escalated') && (
                                <>
                                  <button
                                    onClick={() => handleNotifyClick(anomaly)}
                                    disabled={anomaly.incident_id}
                                    className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                                      anomaly.incident_id
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-teal-600 text-white hover:bg-teal-700'
                                    }`}
                                  >
                                    {anomaly.incident_id ? 'Notified' : 'Notify'}
                                  </button>
                                  <button
                                    onClick={() => handleDismissClick(anomaly)}
                                    className="px-3 py-1.5 bg-teal-50 text-teal-600 text-xs rounded-md border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                              {anomaly.status === 'dismissed' && (
                                <button
                                  onClick={() => handleUpdateStatus(anomaly.id, 'new')}
                                  className="px-3 py-1.5 bg-white text-teal-600 text-xs rounded-md border border-teal-600 hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  Reopen
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
            })()}
          </div>
        )}

        {/* Baselines Content */}
        {activeTab === 'baselines' && (
          <div className="space-y-4 lg:space-y-6">
            {/* Calculate Baseline Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Baseline Configuration</h2>
                <p className="text-xs text-gray-500 mt-1">Enter user ID or email to calculate behavior baselines</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="user-identifier" className="block text-xs text-gray-600 mb-1">
                      User ID or Email Address
                    </label>
                    <input
                      id="user-identifier"
                      type="text"
                      value={userIdentifier}
                      onChange={(e) => setUserIdentifier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter user ID or email"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="baseline-type" className="block text-xs text-gray-600 mb-1">
                      Baseline Type
                    </label>
                    <select
                      id="baseline-type"
                      value={selectedBaselineType}
                      onChange={(e) => setSelectedBaselineType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="location">Location</option>
                      <option value="time">Time</option>
                      <option value="access_pattern">Access Pattern</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleCalculateBaseline}
                      disabled={isLoading || !userIdentifier}
                      className="w-full px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Calculating...
                        </span>
                      ) : (
                        'Calculate Baseline'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Baselines List */}
            {(() => {
              if (isLoading) {
                return (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-8 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                        <span className="text-gray-600 text-sm">Loading baselines...</span>
                      </div>
                    </div>
                  </div>
                );
              }
              
              const hasNoBaselines = baselines.length === 0;
              if (hasNoBaselines) {
                return (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-8 text-center">
                      <div className="text-gray-500 text-sm mb-2">No baselines found</div>
                      <div className="text-gray-400 text-xs">Calculate a baseline first to view user behavior patterns</div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                  {baselines.map((baseline) => {
                    const baselineData = typeof baseline.baseline_data === 'string' 
                      ? JSON.parse(baseline.baseline_data) 
                      : baseline.baseline_data;
                    
                    const getBaselineIcon = () => {
                      if (baseline.baseline_type === 'location') {
                        return <MapPin className="h-5 w-5 text-white" />;
                      } else if (baseline.baseline_type === 'time') {
                        return <Clock className="h-5 w-5 text-white" />;
                      } else {
                        return <Activity className="h-5 w-5 text-white" />;
                      }
                    };
                    
                    return (
                      <div key={baseline.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                              {getBaselineIcon()}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {baseline.baseline_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h3>
                              <p className="text-xs text-gray-500">Last calculated {formatDate(baseline.calculated_at)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 sm:p-6">
                          {baselineData?.message && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                              <p className="text-xs text-amber-800">{baselineData.message}</p>
                            </div>
                          )}
                          {renderBaselineData(baseline, baselineData)}
                        </div>
                      </div>
                    );
                })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Dismiss Confirmation Modal */}
      {showDismissConfirm && anomalyToDismiss && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 border-none outline-none"
          onClick={handleCancelDismiss}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancelDismiss();
            }
          }}
          aria-label="Close modal"
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Confirm Dismiss</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to dismiss this anomaly? This action will mark it as dismissed.
              </p>
              {anomalyToDismiss.user_email && (
                <p className="text-xs text-gray-500 mb-4">
                  User: {anomalyToDismiss.user_email}
                </p>
              )}
              <p className="text-xs text-gray-500 mb-4">
                Type: {anomalyToDismiss.anomaly_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelDismiss}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDismiss}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
              >
                Confirm Dismiss
              </button>
            </div>
          </div>
        </button>
      )}

      {/* Notify Confirmation Modal */}
      {showNotifyConfirm && anomalyToNotify && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 border-none outline-none"
          onClick={handleCancelNotify}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancelNotify();
            }
          }}
          aria-label="Close modal"
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Confirm Notification</h2>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to create a breach incident notification for this anomaly? This will create an incident in the Breach Management section.
              </p>
              {anomalyToNotify.user_email && (
                <p className="text-xs text-gray-500 mb-2">
                  User: {anomalyToNotify.user_email}
                </p>
              )}
              <p className="text-xs text-gray-500 mb-2">
                Type: {anomalyToNotify.anomaly_type?.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Severity: <span className="font-medium">{anomalyToNotify.severity?.toUpperCase() || 'N/A'}</span>
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCancelNotify}
                disabled={isNotifying}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNotify}
                disabled={isNotifying}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isNotifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Confirm Notify'
                )}
              </button>
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

export default BehavioralAnalytics;
