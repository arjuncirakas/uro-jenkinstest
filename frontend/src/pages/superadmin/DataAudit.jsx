import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Database,
  Activity,
  Shield,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { dataAuditService } from '../../services/dataAuditService';
import InfoTooltip from '../../components/InfoTooltip';

const DataAudit = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data states
  const [complianceMetrics, setComplianceMetrics] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [dataInventory, setDataInventory] = useState(null);
  const [accessLogs, setAccessLogs] = useState({ logs: [], pagination: {} });
  // Note: These state variables are used in commented-out code sections
  // Keeping them for future use when those features are enabled
  // eslint-disable-next-line no-unused-vars
  const [processingActivities, setProcessingActivities] = useState({ activities: [] });
  // eslint-disable-next-line no-unused-vars
  const [retentionInfo, setRetentionInfo] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [thirdPartySharing, setThirdPartySharing] = useState({ sharingEvents: [] });
  
  // Modal states
  const [showPHIUsersModal, setShowPHIUsersModal] = useState(false);
  const [showDataExportsModal, setShowDataExportsModal] = useState(false);
  const [showVerifiedUsersModal, setShowVerifiedUsersModal] = useState(false);
  const [phiUsers, setPhiUsers] = useState([]);
  const [dataExports, setDataExports] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Filter states
  const [accessLogsFilters, setAccessLogsFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    actionType: '',
    resourceType: '',
    status: '',
    page: 1,
    limit: 20
  });
  
  // Note: These filter setters are used in commented-out code sections
  // eslint-disable-next-line no-unused-vars
  const [processingFilters, setProcessingFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: '',
    resourceType: ''
  });
  
  // eslint-disable-next-line no-unused-vars
  const [sharingFilters, setSharingFilters] = useState({
    startDate: '',
    endDate: '',
    userId: ''
  });

  // Fetch compliance metrics (overview)
  const fetchComplianceMetrics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [metricsResponse, chartResponse] = await Promise.all([
        dataAuditService.getComplianceMetrics(),
        dataAuditService.getChartData()
      ]);
      if (metricsResponse.success) {
        setComplianceMetrics(metricsResponse.data);
      } else {
        setError(metricsResponse.error || 'Failed to fetch compliance metrics');
      }
      if (chartResponse.success) {
        setChartData(chartResponse.data);
      }
    } catch (err) {
      setError('Failed to fetch compliance metrics');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data inventory
  const fetchDataInventory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dataAuditService.getDataInventory();
      if (response.success) {
        setDataInventory(response.data);
      } else {
        setError(response.error || 'Failed to fetch data inventory');
      }
    } catch (err) {
      setError('Failed to fetch data inventory');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch access logs
  const fetchAccessLogs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dataAuditService.getAccessLogs(accessLogsFilters);
      if (response.success) {
        setAccessLogs(response.data);
      } else {
        setError(response.error || 'Failed to fetch access logs');
      }
    } catch (err) {
      setError('Failed to fetch access logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch processing activities (currently unused but kept for future use)
  // eslint-disable-next-line no-unused-vars
  const fetchProcessingActivities = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dataAuditService.getProcessingActivities(processingFilters);
      if (response.success) {
        setProcessingActivities(response.data);
      } else {
        setError(response.error || 'Failed to fetch processing activities');
      }
    } catch (err) {
      setError('Failed to fetch processing activities');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch retention info (currently unused but kept for future use)
  // eslint-disable-next-line no-unused-vars
  const fetchRetentionInfo = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dataAuditService.getRetentionInfo();
      if (response.success) {
        setRetentionInfo(response.data);
      } else {
        setError(response.error || 'Failed to fetch retention info');
      }
    } catch (err) {
      setError('Failed to fetch retention info');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch third-party sharing (currently unused but kept for future use)
  // eslint-disable-next-line no-unused-vars
  const fetchThirdPartySharing = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dataAuditService.getThirdPartySharing(sharingFilters);
      if (response.success) {
        setThirdPartySharing(response.data);
      } else {
        setError(response.error || 'Failed to fetch third-party sharing');
      }
    } catch (err) {
      setError('Failed to fetch third-party sharing');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchComplianceMetrics();
    } else if (activeTab === 'inventory') {
      fetchDataInventory();
    } else if (activeTab === 'access-logs') {
      fetchAccessLogs();
    } 
    // else if (activeTab === 'processing') {
    //   fetchProcessingActivities();
    // } else if (activeTab === 'retention') {
    //   fetchRetentionInfo();
    // } 
    // else if (activeTab === 'sharing') {
    //   fetchThirdPartySharing();
    // }
  }, [activeTab]);

  // Reload access logs when filters change
  useEffect(() => {
    if (activeTab === 'access-logs') {
      fetchAccessLogs();
    }
  }, [accessLogsFilters]);

  // Reload processing activities when filters change - Commented out
  // useEffect(() => {
  //   if (activeTab === 'processing') {
  //     fetchProcessingActivities();
  //   }
  // }, [processingFilters]);

  // Reload sharing when filters change - Commented out
  // useEffect(() => {
  //   if (activeTab === 'sharing') {
  //     fetchThirdPartySharing();
  //   }
  // }, [sharingFilters]);

  // Export handler
  const handleExport = async (format) => {
    try {
      const response = await dataAuditService.exportAuditReport(format, 'all');
      if (response.success) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-audit-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('Failed to export report');
    }
  };

  // Fetch unique users accessing PHI
  const fetchPHIUsers = async () => {
    setModalLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      const response = await dataAuditService.getAccessLogs({
        startDate,
        resourceType: 'patient',
        limit: 1000
      });
      
      if (response.success && response.data.logs) {
        // Get unique users from PHI access logs (filter by phi actions or patient resource type)
        const uniqueUsersMap = new Map();
        response.data.logs.forEach(log => {
          const isPHIAccess = log.action?.includes('phi') || log.action?.includes('patient') || log.resource_type === 'patient';
          if (isPHIAccess && log.user_id && log.user_email) {
            if (!uniqueUsersMap.has(log.user_id)) {
              uniqueUsersMap.set(log.user_id, {
                id: log.user_id,
                email: log.user_email,
                role: log.user_role || 'N/A',
                lastAccess: log.timestamp
              });
            } else {
              // Update last access if this is more recent
              const existing = uniqueUsersMap.get(log.user_id);
              if (new Date(log.timestamp) > new Date(existing.lastAccess)) {
                existing.lastAccess = log.timestamp;
              }
            }
          }
        });
        setPhiUsers(Array.from(uniqueUsersMap.values()));
      }
    } catch (err) {
      setError('Failed to fetch PHI users');
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch data exports
  const fetchDataExports = async () => {
    setModalLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      const response = await dataAuditService.getAccessLogs({
        startDate,
        limit: 1000
      });
      
      if (response.success && response.data.logs) {
        // Filter logs that contain 'export' in the action
        const exportLogs = response.data.logs.filter(log => 
          log.action?.toLowerCase().includes('export') || 
          log.action?.toLowerCase().includes('download')
        );
        setDataExports(exportLogs);
      }
    } catch (err) {
      setError('Failed to fetch data exports');
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch verified users
  const fetchVerifiedUsers = async () => {
    setModalLoading(true);
    try {
      const response = await dataAuditService.getVerifiedUsers();
      if (response.success && response.data) {
        setVerifiedUsers(response.data);
      }
    } catch (err) {
      setError('Failed to fetch verified users');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle modal opens
  const handleViewPHIUsers = () => {
    setShowPHIUsersModal(true);
    if (phiUsers.length === 0) {
      fetchPHIUsers();
    }
  };

  const handleViewDataExports = () => {
    setShowDataExportsModal(true);
    if (dataExports.length === 0) {
      fetchDataExports();
    }
  };

  const handleViewVerifiedUsers = () => {
    setShowVerifiedUsersModal(true);
    if (verifiedUsers.length === 0) {
      fetchVerifiedUsers();
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format IP address - handle IPv6 localhost and edge cases
  const formatIPAddress = (ip) => {
    if (!ip) return 'N/A';
    
    // Handle empty or invalid IPs
    if (typeof ip !== 'string' || ip.trim() === '') return 'N/A';
    
    const trimmedIp = ip.trim();
    
    // Handle incomplete IPv6 localhost (like ":1")
    if (trimmedIp === ':1' || trimmedIp === '::1' || trimmedIp === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    
    // Remove IPv6 prefix if present
    if (trimmedIp.startsWith('::ffff:')) {
      return trimmedIp.replace('::ffff:', '');
    }
    
    // Handle IPv6 localhost variations
    if (trimmedIp === '::' || trimmedIp.startsWith('::')) {
      return '127.0.0.1';
    }
    
    return trimmedIp;
  };

  // Helper functions for access logs formatting
  const formatTimestampUTC = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toISOString().replace('T', ' ').substring(0, 23);
  };

  const formatAction = (action) => {
    if (!action) return 'N/A';
    
    // Replace dots and underscores with spaces, then capitalize
    let formatted = action
      .replace(/\./g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Handle common action patterns
    if (formatted.includes('Data Audit')) {
      formatted = formatted.replace('Data Audit', 'Data Audit');
    }
    if (formatted.includes('Access Logs View')) {
      formatted = 'View Access Logs';
    }
    if (formatted.includes('Compliance Metrics View')) {
      formatted = 'View Compliance Metrics';
    }
    if (formatted.includes('Auth Login')) {
      formatted = 'User Login';
    }
    if (formatted.includes('Auth Token Refresh')) {
      formatted = 'Token Refresh';
    }
    if (formatted.includes('Auth Logout')) {
      formatted = 'User Logout';
    }
    if (formatted.includes('Phi')) {
      formatted = formatted.replace('Phi', 'PHI');
    }
    if (formatted.includes('Export')) {
      formatted = formatted.replace('Export', 'Data Export');
    }
    
    return formatted;
  };

  // Extract reason/ticket from metadata, error_message, or other fields
  const getReasonOrTicket = (log) => {
    // First, try metadata
    if (log.metadata) {
      try {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        
        // Check various metadata fields
        if (metadata.reason) return metadata.reason;
        if (metadata.ticket) return metadata.ticket;
        if (metadata.ticketNumber) return `Ticket #${metadata.ticketNumber}`;
        if (metadata.auditReq) return `Audit Req #${metadata.auditReq}`;
        if (metadata.endpoint) {
          // Extract ticket/audit req from endpoint if present
          const ticketMatch = metadata.endpoint.match(/ticket[#\s]*(\d+)/i) || metadata.endpoint.match(/audit[_\s]*req[#\s]*(\d+)/i);
          if (ticketMatch) return ticketMatch[0];
        }
        // Check if there's any meaningful description
        if (metadata.description) return metadata.description;
        if (metadata.message) return metadata.message;
      } catch (e) {
        // If parsing fails, try to extract from string
        if (typeof log.metadata === 'string') {
          const ticketMatch = log.metadata.match(/ticket[#\s]*(\d+)/i) || log.metadata.match(/audit[_\s]*req[#\s]*(\d+)/i);
          if (ticketMatch) return ticketMatch[0];
          // If it's a short meaningful string, return it
          if (log.metadata.length < 100 && log.metadata.trim() !== '{}') {
            return log.metadata;
          }
        }
      }
    }
    
    // Check error_message
    if (log.error_message) {
      return log.error_message;
    }
    
    // Check request_path for clues
    if (log.request_path) {
      // If it's an export or specific action, provide context
      if (log.request_path.includes('export')) {
        return 'Data Export Request';
      }
      if (log.request_path.includes('audit')) {
        return 'Audit Request';
      }
    }
    
    // For successful actions, provide a default based on action type
    if (log.status === 'success') {
      if (log.action?.includes('view') || log.action?.includes('get')) {
        return 'View Request';
      }
      if (log.action?.includes('export')) {
        return 'Export Request';
      }
      if (log.action?.includes('login') || log.action?.includes('auth')) {
        return 'Authentication';
      }
      return 'Standard Operation';
    }
    
    // For failures, return error context
    if (log.status === 'failure' || log.status === 'error') {
      return log.error_message || 'Access Denied';
    }
    
    return '-';
  };


  // Tabs configuration
  const tabs = [
    { id: 'overview', name: 'Overview', icon: Shield },
    { id: 'inventory', name: 'Data Inventory', icon: Database },
    { id: 'access-logs', name: 'Access Logs', icon: Activity },
    // { id: 'processing', name: 'Processing Activities', icon: Activity },
    // { id: 'retention', name: 'Retention & Lifecycle', icon: Clock },
    // { id: 'sharing', name: 'Third-Party Sharing', icon: Share2 }
  ];

  return (
    <div className="w-full min-h-screen overflow-x-hidden">
      <div className="w-full max-w-full p-2 sm:p-3 lg:p-4">
        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Data Audit
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              GDPR/HIPAA compliance monitoring and data audit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
              <p className="mt-2 text-sm text-gray-500">Loading data...</p>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && complianceMetrics && (
                <div className="space-y-6">
                  {/* Top Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-600">Successful Logins (30d)</div>
                        <div className="group">
                          <InfoTooltip infoKey="successful-logins" ariaLabel="Info about Successful Logins" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-teal-600">{complianceMetrics.successfulLoginAttempts30Days || 0}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-600">Failed Logins (30d)</div>
                        <div className="group">
                          <InfoTooltip infoKey="failed-logins" ariaLabel="Info about Failed Logins" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-teal-600">{complianceMetrics.failedLoginAttempts30Days || 0}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-600">PHI Access (30d)</div>
                        <div className="group">
                          <InfoTooltip infoKey="phi-access" ariaLabel="Info about PHI Access" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-teal-600">{complianceMetrics.phiAccessEvents30Days || 0}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-600">Account Lockouts (30d)</div>
                        <div className="group">
                          <InfoTooltip infoKey="account-lockouts" ariaLabel="Info about Account Lockouts" forcePosition="right" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-teal-600">{complianceMetrics.accountLockouts30Days || 0}</div>
                    </div>
                  </div>

                  {/* Bottom Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-900 text-sm">Security Metrics</h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Unique Users Accessing PHI (30d)</span>
                            <InfoTooltip infoKey="unique-users-phi" ariaLabel="Info about Unique Users Accessing PHI" forcePosition="left" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{complianceMetrics.uniqueUsersAccessingPHI30Days || 0}</span>
                            <button
                              onClick={handleViewPHIUsers}
                              className="ml-2 inline-flex items-center px-2.5 py-1 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                              title="View users"
                            >
                              View
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Data Exports (30d)</span>
                            <InfoTooltip infoKey="data-exports" ariaLabel="Info about Data Exports" forcePosition="left" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{complianceMetrics.dataExports30Days || 0}</span>
                            <button
                              onClick={handleViewDataExports}
                              className="ml-2 inline-flex items-center px-2.5 py-1 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                              title="View exports"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-900 text-sm">User Statistics</h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Total Verified Users</span>
                            <InfoTooltip infoKey="total-verified-users" ariaLabel="Info about Total Verified Users" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{complianceMetrics.totalVerifiedUsers || 0}</span>
                            <button
                              onClick={handleViewVerifiedUsers}
                              className="ml-2 inline-flex items-center px-2.5 py-1 text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                              title="View users"
                            >
                              View
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Login Success Rate (30d)</span>
                            <InfoTooltip infoKey="login-success-rate" ariaLabel="Info about Login Success Rate" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {(() => {
                              const successful = complianceMetrics.successfulLoginAttempts30Days || 0;
                              const failed = complianceMetrics.failedLoginAttempts30Days || 0;
                              const total = successful + failed;
                              if (total > 0) {
                                return Math.round((successful / total) * 100);
                              }
                              return 0;
                            })()}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Section */}
                  {chartData?.loginTrends?.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Activity Trends (Last 30 Days)</h3>
                        <p className="text-sm text-gray-500">Track login attempts, PHI access, and data exports over time</p>
                      </div>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart 
                          data={chartData.loginTrends} 
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <defs>
                            <linearGradient id="successfulLoginsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="phiAccessGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="failedLoginsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="dataExportsGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="#e5e7eb" 
                            vertical={false}
                            opacity={0.5}
                          />
                          <XAxis 
                            dataKey="date" 
                            stroke="#9ca3af"
                            style={{ fontSize: '11px', fontWeight: 500 }}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                            tick={{ fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis 
                            stroke="#9ca3af"
                            style={{ fontSize: '11px', fontWeight: 500 }}
                            tick={{ fill: '#6b7280' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            width={60}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: 'none', 
                              borderRadius: '12px',
                              color: '#fff',
                              padding: '12px 16px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
                            }}
                            labelStyle={{ 
                              color: '#fff',
                              fontWeight: 600,
                              marginBottom: '8px',
                              fontSize: '13px'
                            }}
                            itemStyle={{ 
                              color: '#fff',
                              fontSize: '12px',
                              padding: '4px 0'
                            }}
                            cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '5 5' }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="line"
                            formatter={(value) => <span style={{ color: '#374151', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
                          />
                          {/* Gradient area fills for depth */}
                          <Area
                            type="monotone"
                            dataKey="successfulLogins"
                            fill="url(#successfulLoginsGradient)"
                            stroke="none"
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                          <Area
                            type="monotone"
                            dataKey="phiAccess"
                            fill="url(#phiAccessGradient)"
                            stroke="none"
                            isAnimationActive={true}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                          {/* Lines on top */}
                          <Line 
                            type="monotone" 
                            dataKey="successfulLogins" 
                            stroke="#14b8a6" 
                            strokeWidth={3}
                            name="Successful Logins"
                            dot={{ r: 0 }}
                            activeDot={{ r: 7, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2.5 }}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="phiAccess" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            name="PHI Access"
                            dot={{ r: 0 }}
                            activeDot={{ r: 7, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2.5 }}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="failedLogins" 
                            stroke="#ef4444" 
                            strokeWidth={2.5}
                            name="Failed Logins"
                            dot={{ r: 0 }}
                            activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
                            strokeDasharray="5 5"
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="dataExports" 
                            stroke="#8b5cf6" 
                            strokeWidth={2.5}
                            name="Data Exports"
                            dot={{ r: 0 }}
                            activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Data Inventory Tab */}
              {activeTab === 'inventory' && dataInventory && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 font-medium">Total Tables</div>
                        <div className="group">
                          <InfoTooltip infoKey="total-tables" ariaLabel="Info about Total Tables" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-teal-600 mt-1">{dataInventory.totals?.totalTables || 0}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 font-medium">Total Records</div>
                        <div className="group">
                          <InfoTooltip infoKey="total-records" ariaLabel="Info about Total Records" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-teal-600 mt-1">{dataInventory.totals?.totalRecords?.toLocaleString() || 0}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 font-medium">Total Size</div>
                        <div className="group">
                          <InfoTooltip infoKey="total-size" ariaLabel="Info about Total Size" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-teal-600 mt-1">{dataInventory.totals?.totalSize || '0 Bytes'}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 font-medium">Categories</div>
                        <div className="group">
                          <InfoTooltip infoKey="categories" ariaLabel="Info about Categories" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-teal-600 mt-1">{Object.keys(dataInventory.byCategory || {}).length}</div>
                    </div>
                  </div>

                  {/* Data Classification Summary */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Data Classification Summary</h3>
                      <InfoTooltip infoKey="data-classification" ariaLabel="Info about Data Classification" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((level) => {
                        const levelData = dataInventory?.inventory?.filter(
                          t => t.classificationLevel === level
                        ) || [];
                        const count = levelData.length;
                        const getLabel = (lvl) => {
                          if (lvl === 5) return 'Critical';
                          if (lvl === 4) return 'Highly Sensitive';
                          if (lvl === 3) return 'Sensitive';
                          if (lvl === 2) return 'Internal';
                          return 'Non-Sensitive';
                        };
                        const label = getLabel(level);
                        const getColor = (lvl) => {
                          if (lvl === 5) return 'text-red-600';
                          if (lvl === 4) return 'text-orange-600';
                          if (lvl === 3) return 'text-yellow-600';
                          if (lvl === 2) return 'text-blue-600';
                          return 'text-gray-600';
                        };
                        return (
                          <div key={level} className="text-center p-3 border border-gray-200 rounded-lg">
                            <div className={`text-2xl font-bold mb-1 ${getColor(level)}`}>
                              {count}
                            </div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Level {level}</div>
                            <div className="text-xs text-gray-500">{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {dataInventory.byCategory && Object.entries(dataInventory.byCategory).map(([category, data]) => (
                      <div key={category} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                          <h3 className="font-semibold text-gray-900 text-sm">{category}</h3>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <span className="text-sm text-gray-600">Tables: </span>
                              <span className="text-sm font-medium text-gray-900">{data.tables?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Records: </span>
                              <span className="text-sm font-medium text-gray-900">{data.recordCount?.toLocaleString() || 0}</span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Size: </span>
                              <span className="text-sm font-medium text-gray-900">{data.size || '0 Bytes'}</span>
                            </div>
                          </div>
                          {data.tables && data.tables.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Table Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Size</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Records</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Classification</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {data.tables.map((table) => (
                                    <tr key={table.tableName} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 text-gray-900 font-mono text-xs">{table.tableName}</td>
                                      <td className="px-4 py-2 text-gray-600">{table.size || '0 Bytes'}</td>
                                      <td className="px-4 py-2 text-gray-600">{table.recordCount?.toLocaleString() || 0}</td>
                                      <td className="px-4 py-2">
                                        {(() => {
                                          if (!table.classificationLevel) {
                                            return <span className="text-gray-400 text-xs">Not classified</span>;
                                          }
                                          const getClassificationClass = (level) => {
                                            if (level === 5) return 'bg-red-100 text-red-800 border border-red-200';
                                            if (level === 4) return 'bg-orange-100 text-orange-800 border border-orange-200';
                                            if (level === 3) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
                                            if (level === 2) return 'bg-blue-100 text-blue-800 border border-blue-200';
                                            return 'bg-gray-100 text-gray-800 border border-gray-200';
                                          };
                                          return (
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getClassificationClass(table.classificationLevel)}`}>
                                              Level {table.classificationLevel}: {table.classificationLabel || 'Unknown'}
                                            </span>
                                          );
                                        })()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Access Logs Tab */}
              {activeTab === 'access-logs' && (
                <div className="space-y-6">
                  {/* Filters */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="access-logs-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          id="access-logs-start-date"
                          type="date"
                          value={accessLogsFilters.startDate}
                          onChange={(e) => setAccessLogsFilters({ ...accessLogsFilters, startDate: e.target.value, page: 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="access-logs-end-date" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          id="access-logs-end-date"
                          type="date"
                          value={accessLogsFilters.endDate}
                          onChange={(e) => setAccessLogsFilters({ ...accessLogsFilters, endDate: e.target.value, page: 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="access-logs-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          id="access-logs-status"
                          value={accessLogsFilters.status}
                          onChange={(e) => setAccessLogsFilters({ ...accessLogsFilters, status: e.target.value, page: 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        >
                          <option value="">All</option>
                          <option value="success">Success</option>
                          <option value="failure">Failure</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto overflow-y-visible"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#cbd5e1 #f1f5f9'
                    }}
                  >
                    <style>{`
                      div::-webkit-scrollbar {
                        height: 8px;
                      }
                      div::-webkit-scrollbar:vertical {
                        display: none;
                      }
                      div::-webkit-scrollbar-track {
                        background: #f1f5f9;
                        border-radius: 4px;
                      }
                      div::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                      }
                      div::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                      }
                    `}</style>
                    <table className="w-full min-w-[1100px]">
                      <thead className="sticky top-0 bg-gray-50 z-10">
                        <tr className="border-b border-gray-200">
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">Timestamp (UTC)</th>
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">Admin User</th>
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">Role</th>
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">Action</th>
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap min-w-[150px]">Reason/Ticket</th>
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">IP Address</th>
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessLogs.logs?.length > 0 ? (
                          accessLogs.logs.map((log) => {
                            return (
                              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-900 font-mono whitespace-nowrap">{formatTimestampUTC(log.timestamp)}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 break-words max-w-[200px]">{log.user_email || 'N/A'}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 whitespace-nowrap">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                                    {log.user_role || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 break-words">{formatAction(log.action)}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 break-words min-w-[150px]">{getReasonOrTicket(log)}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 font-mono whitespace-nowrap">{formatIPAddress(log.ip_address)}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                    log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {log.status.toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">
                              No access logs found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {accessLogs.pagination && accessLogs.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Page {accessLogs.pagination.page} of {accessLogs.pagination.totalPages} ({accessLogs.pagination.total} total)
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAccessLogsFilters({ ...accessLogsFilters, page: accessLogsFilters.page - 1 })}
                          disabled={accessLogsFilters.page <= 1}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setAccessLogsFilters({ ...accessLogsFilters, page: accessLogsFilters.page + 1 })}
                          disabled={accessLogsFilters.page >= accessLogs.pagination.totalPages}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* PHI Users Modal */}
      {showPHIUsersModal && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 border-none outline-none"
          onClick={() => setShowPHIUsersModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowPHIUsersModal(false);
            }
          }}
          aria-label="Close modal"
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Unique Users Accessing PHI (Last 30 Days)</h2>
              <button
                onClick={() => setShowPHIUsersModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                  <p className="mt-2 text-sm text-gray-500">Loading users...</p>
                </div>
              ) : (() => {
                if (phiUsers.length > 0) return true;
                return false;
              })() ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Last Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {phiUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">{user.email}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(user.lastAccess)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-gray-500">
                  No users found
                </div>
              )}
            </div>
          </div>
        </button>
      )}

      {/* Data Exports Modal */}
      {showDataExportsModal && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 border-none outline-none"
          onClick={() => setShowDataExportsModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowDataExportsModal(false);
            }
          }}
          aria-label="Close modal"
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Data Exports (Last 30 Days)</h2>
              <button
                onClick={() => setShowDataExportsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                  <p className="mt-2 text-sm text-gray-500">Loading exports...</p>
                </div>
              ) : (() => {
                if (dataExports.length > 0) return true;
                return false;
              })() ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dataExports.map((exportItem) => (
                        <tr key={exportItem.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-mono text-xs">{formatDate(exportItem.timestamp)}</td>
                          <td className="px-4 py-3 text-gray-600">{exportItem.user_email || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                              {exportItem.user_role || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{exportItem.action || 'N/A'}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const getStatusClass = (status) => {
                                if (status === 'success') return 'bg-green-100 text-green-800';
                                return 'bg-red-100 text-red-800';
                              };
                              return (
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(exportItem.status)}`}>
                                  {exportItem.status?.toUpperCase() || 'N/A'}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{formatIPAddress(exportItem.ip_address)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-gray-500">
                  No data exports found
                </div>
              )}
            </div>
          </div>
        </button>
      )}

      {/* Verified Users Modal */}
      {showVerifiedUsersModal && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 border-none outline-none"
          onClick={() => setShowVerifiedUsersModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowVerifiedUsersModal(false);
            }
          }}
          aria-label="Close modal"
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Total Verified Users</h2>
              <button
                onClick={() => setShowVerifiedUsersModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
                  <p className="mt-2 text-sm text-gray-500">Loading users...</p>
                </div>
              ) : (() => {
                if (verifiedUsers.length > 0) return true;
                return false;
              })() ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {verifiedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900">
                            {(() => {
                              if (user.first_name && user.last_name) {
                                return `${user.first_name} ${user.last_name}`;
                              }
                              return 'N/A';
                            })()}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{user.email || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                              {user.role || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(user.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-gray-500">
                  No verified users found
                </div>
              )}
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

export default DataAudit;
