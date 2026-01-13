import React, { useState, useEffect, useRef } from 'react';
import {
  FileSearch,
  Database,
  Activity,
  Clock,
  Share2,
  Shield,
  Loader2,
  Download,
  Calendar,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Info
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
  const [processingActivities, setProcessingActivities] = useState({ activities: [] });
  const [retentionInfo, setRetentionInfo] = useState(null);
  const [thirdPartySharing, setThirdPartySharing] = useState({ sharingEvents: [] });
  
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
  
  const [processingFilters, setProcessingFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: '',
    resourceType: ''
  });
  
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

  // Fetch processing activities
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

  // Fetch retention info
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

  // Fetch third-party sharing
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

  // Info explanations
  const infoExplanations = {
    'successful-logins': {
      title: 'Successful Logins (30 days)',
      description: 'This shows the total number of successful login attempts in the last 30 days. Successful logins occur when users correctly authenticate with their credentials. This metric helps track normal user activity and system usage patterns.'
    },
    'account-lockouts': {
      title: 'Account Lockouts (30 days)',
      description: 'This shows how many times user accounts were locked due to multiple failed login attempts in the last 30 days. Account lockouts are a security measure to prevent brute-force attacks. A high number might indicate security threats or users having trouble with their passwords.'
    },
    'suspicious-activities': {
      title: 'Suspicious Activities (30 days)',
      description: 'This shows the number of failed access attempts to Protected Health Information (PHI) in the last 30 days. These are unauthorized attempts to access patient data that were blocked. A high number indicates potential security threats or unauthorized access attempts.'
    },
    'login-success-rate': {
      title: 'Login Success Rate (30 days)',
      description: 'This shows the percentage of successful login attempts out of total login attempts (successful + failed) in the last 30 days. A high success rate indicates good user experience and security, while a low rate might indicate password issues or security threats.'
    },
    'failed-logins': {
      title: 'Failed Login Attempts (30 days)',
      description: 'This shows the total number of failed login attempts in the last 30 days. Failed attempts occur when someone tries to log in with incorrect credentials. A high number might indicate security concerns or users having trouble with their passwords.'
    },
    'phi-access': {
      title: 'PHI Access Events (30 days)',
      description: 'PHI (Protected Health Information) access events track how many times patient health data was accessed in the last 30 days. This includes viewing patient records, medical history, test results, and other sensitive health information. All access is logged for compliance and security purposes.'
    },
    'unique-users-phi': {
      title: 'Unique Users Accessing PHI (30 days)',
      description: 'This shows how many different users have accessed Protected Health Information (PHI) in the last 30 days. This helps track who has been viewing patient data and ensures only authorized personnel are accessing sensitive information.'
    },
    'data-exports': {
      title: 'Data Exports (30 days)',
      description: 'This counts how many times data has been exported from the system in the last 30 days. Data exports include downloading patient information, reports, or other data. All exports are logged to track data sharing and ensure compliance with data protection regulations.'
    },
    'total-verified-users': {
      title: 'Total Verified Users',
      description: 'This is the total number of users who have completed email verification. Verified users have confirmed their email addresses and can access the system. This helps ensure that only legitimate users with valid email addresses can use the system.'
    },
    'data-classification': {
      title: 'Data Classification Levels',
      description: 'Data is classified into 5 levels based on sensitivity: Level 1 (Non-Sensitive) - Public information; Level 2 (Internal) - Employee data; Level 3 (Sensitive) - Patient demographics; Level 4 (Highly Sensitive) - Medical diagnoses; Level 5 (Critical) - Full medical records. This classification helps ensure appropriate security controls are applied to protect sensitive data according to GDPR and HIPAA requirements.'
    },
    'total-tables': {
      title: 'Total Tables',
      description: 'This shows the total number of database tables in the system. Each table stores different types of information - for example, one table might store patient information, another might store appointments, etc. This helps understand the overall data structure.'
    },
    'total-records': {
      title: 'Total Records',
      description: 'This is the total number of records stored across all database tables. A record is a single entry - for example, one patient record, one appointment record, etc. This gives you an idea of the total amount of data stored in the system.'
    },
    'total-size': {
      title: 'Total Size',
      description: 'This shows the total amount of storage space used by all database tables. It includes all data, indexes, and other database structures. This helps monitor storage usage and plan for future capacity needs.'
    },
    'categories': {
      title: 'Categories',
      description: 'This shows how many different data categories exist in the system. Data is organized into categories like Medical/PHI (patient health information), Demographic (user information), Operational (appointments, bookings), and System Usage (logs, audit trails).'
    },
    'total-tables-monitored': {
      title: 'Total Tables Monitored',
      description: 'This shows how many database tables are being monitored for data retention. Retention monitoring tracks how long data has been stored and when it should be deleted according to retention policies (for example, patient records might be kept for 10 years).'
    },
    'approaching-deletion': {
      title: 'Approaching Deletion',
      description: 'This shows how many tables have data that is approaching its deletion date based on retention policies. When data reaches its retention limit, it should be deleted or archived to comply with data protection regulations and free up storage space.'
    }
  };

  // Get info explanation for tooltip
  const getInfoExplanation = (key) => {
    return infoExplanations[key] || null;
  };

  // Tooltip component helper - dynamically positioned to avoid viewport overflow
  const InfoTooltip = ({ infoKey, ariaLabel, forcePosition = null }) => {
    const explanation = getInfoExplanation(infoKey);
    const [position, setPosition] = useState(forcePosition || 'right');
    const buttonRef = useRef(null);
    const tooltipRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
      // If position is forced, don't calculate dynamically
      if (forcePosition) {
        setPosition(forcePosition);
        return;
      }

      if (!buttonRef.current || !containerRef.current) return;

      const updatePosition = () => {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const tooltipWidth = 320; // w-80 = 20rem = 320px
        const padding = 16; // 1rem padding from viewport edge
        
        // Calculate space on both sides
        const spaceOnRight = viewportWidth - buttonRect.right;
        const spaceOnLeft = buttonRect.left;

        // Check if tooltip would overflow when positioned to the right
        const wouldOverflowRight = (spaceOnRight + buttonRect.width) < (tooltipWidth + padding);
        
        // Check if tooltip would overflow when positioned to the left
        const wouldOverflowLeft = (spaceOnLeft + buttonRect.width) < (tooltipWidth + padding);

        // Position tooltip to avoid overflow
        if (wouldOverflowRight && !wouldOverflowLeft) {
          // Right would overflow, left has space - position to left
          setPosition('left');
        } else if (wouldOverflowLeft && !wouldOverflowRight) {
          // Left would overflow, right has space - position to right
          setPosition('right');
        } else if (wouldOverflowRight && wouldOverflowLeft) {
          // Both would overflow - choose side with more space
          setPosition(spaceOnRight >= spaceOnLeft ? 'right' : 'left');
        } else {
          // Neither would overflow - default to right
          setPosition('right');
        }
      };

      const handleMouseEnter = () => {
        // Small delay to ensure button position is calculated
        requestAnimationFrame(() => {
          setTimeout(updatePosition, 0);
        });
      };

      const groupElement = containerRef.current;
      if (groupElement) {
        groupElement.addEventListener('mouseenter', handleMouseEnter);
        window.addEventListener('resize', updatePosition);
        return () => {
          groupElement.removeEventListener('mouseenter', handleMouseEnter);
          window.removeEventListener('resize', updatePosition);
        };
      }
    }, [forcePosition]);

    if (!explanation) return null;

    return (
      <div ref={containerRef} className="relative inline-block group">
        <button
          ref={buttonRef}
          className="text-teal-600 hover:text-teal-700 transition-colors cursor-pointer focus:outline-none"
          aria-label={ariaLabel}
          type="button"
        >
          <Info className="h-4 w-4" />
        </button>
        <div
          ref={tooltipRef}
          className={`absolute bottom-full mb-2 w-80 max-w-[min(20rem,calc(100vw-3rem))] p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none whitespace-normal ${
            position === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="font-semibold mb-1.5 text-sm">{explanation.title}</div>
          <div className="text-gray-300 leading-relaxed break-words">{explanation.description}</div>
          <div className={`absolute top-full -mt-1 border-4 border-transparent border-t-gray-900 ${
            position === 'right' ? 'right-4' : 'left-4'
          }`}></div>
        </div>
      </div>
    );
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
      <div className="w-full max-w-full p-4 sm:p-6 lg:p-8">
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
                          <span className="text-sm font-medium text-gray-900">{complianceMetrics.uniqueUsersAccessingPHI30Days || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Data Exports (30d)</span>
                            <InfoTooltip infoKey="data-exports" ariaLabel="Info about Data Exports" forcePosition="left" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{complianceMetrics.dataExports30Days || 0}</span>
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
                          <span className="text-sm font-medium text-gray-900">{complianceMetrics.totalVerifiedUsers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Login Success Rate (30d)</span>
                            <InfoTooltip infoKey="login-success-rate" ariaLabel="Info about Login Success Rate" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {complianceMetrics.successfulLoginAttempts30Days + complianceMetrics.failedLoginAttempts30Days > 0
                              ? Math.round((complianceMetrics.successfulLoginAttempts30Days / (complianceMetrics.successfulLoginAttempts30Days + complianceMetrics.failedLoginAttempts30Days)) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Section */}
                  {chartData && chartData.loginTrends && chartData.loginTrends.length > 0 && (
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
                        const label = level === 5 ? 'Critical' : 
                                     level === 4 ? 'Highly Sensitive' :
                                     level === 3 ? 'Sensitive' :
                                     level === 2 ? 'Internal' : 'Non-Sensitive';
                        return (
                          <div key={level} className="text-center p-3 border border-gray-200 rounded-lg">
                            <div className={`text-2xl font-bold mb-1 ${
                              level === 5 ? 'text-red-600' :
                              level === 4 ? 'text-orange-600' :
                              level === 3 ? 'text-yellow-600' :
                              level === 2 ? 'text-blue-600' :
                              'text-gray-600'
                            }`}>
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
                                        {table.classificationLevel ? (
                                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                            table.classificationLevel === 5 ? 'bg-red-100 text-red-800 border border-red-200' :
                                            table.classificationLevel === 4 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                            table.classificationLevel === 3 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                            table.classificationLevel === 2 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                            'bg-gray-100 text-gray-800 border border-gray-200'
                                          }`}>
                                            Level {table.classificationLevel}: {table.classificationLabel || 'Unknown'}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">Not classified</span>
                                        )}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={accessLogsFilters.startDate}
                          onChange={(e) => setAccessLogsFilters({ ...accessLogsFilters, startDate: e.target.value, page: 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={accessLogsFilters.endDate}
                          onChange={(e) => setAccessLogsFilters({ ...accessLogsFilters, endDate: e.target.value, page: 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
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
                            // Format timestamp as UTC
                            const formatTimestampUTC = (timestamp) => {
                              if (!timestamp) return 'N/A';
                              const date = new Date(timestamp);
                              return date.toISOString().replace('T', ' ').substring(0, 23);
                            };

                            // Format action to be user-friendly
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

                            // Format IP address - handle IPv6 localhost
                            const formatIPAddress = (ip) => {
                              if (!ip) return 'N/A';
                              // Convert IPv6 localhost to IPv4
                              if (ip === '::1' || ip === '::ffff:127.0.0.1') {
                                return '127.0.0.1';
                              }
                              // Remove IPv6 prefix if present
                              if (ip.startsWith('::ffff:')) {
                                return ip.replace('::ffff:', '');
                              }
                              return ip;
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

              {/* Processing Activities Tab - Commented out */}
              {/* {activeTab === 'processing' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={processingFilters.startDate}
                          onChange={(e) => setProcessingFilters({ ...processingFilters, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={processingFilters.endDate}
                          onChange={(e) => setProcessingFilters({ ...processingFilters, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Resource Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Count</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">First Occurrence</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Last Occurrence</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Unique Users</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processingActivities.activities?.length > 0 ? (
                          processingActivities.activities.map((activity, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900">{activity.action}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{activity.resourceType || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{activity.count || 0}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(activity.firstOccurrence)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{formatDate(activity.lastOccurrence)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{activity.uniqueUsers || 0}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                              No processing activities found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )} */}

              {/* Retention & Lifecycle Tab - Commented out */}
              {/* {activeTab === 'retention' && retentionInfo && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 font-medium">Total Tables Monitored</div>
                        <div className="group">
                          <InfoTooltip infoKey="total-tables-monitored" ariaLabel="Info about Total Tables Monitored" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-teal-600 mt-1">{retentionInfo.summary?.totalTables || 0}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600 font-medium">Approaching Deletion</div>
                        <div className="group">
                          <InfoTooltip infoKey="approaching-deletion" ariaLabel="Info about Approaching Deletion" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-teal-600 mt-1">{retentionInfo.summary?.tablesApproachingDeletion || 0}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {retentionInfo.tables && retentionInfo.tables.length > 0 ? (
                      retentionInfo.tables.map((data, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-semibold text-gray-900 text-sm">{data.tableName}</h3>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-sm text-gray-600">Retention Period</div>
                                <div className="text-sm font-medium text-gray-900">{data.retentionYears} years</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Total Records</div>
                                <div className="text-sm font-medium text-gray-900">{data.totalRecords?.toLocaleString() || 0}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Age (Years)</div>
                                <div className="text-sm font-medium text-gray-900">{data.ageInYears?.toFixed(2) || 'N/A'}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Years Until Deletion</div>
                                <div className={`text-sm font-medium ${data.approachingDeletion ? 'text-red-600' : 'text-gray-900'}`}>
                                  {data.yearsUntilDeletion?.toFixed(2) || 'N/A'}
                                </div>
                              </div>
                            </div>
                            {data.oldestRecord && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">Oldest Record: <span className="font-medium text-gray-900">{formatDate(data.oldestRecord)}</span></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500">
                        No retention information available
                      </div>
                    )}
                  </div>
                </div>
              )} */}

              {/* Third-Party Sharing Tab - Commented out */}
              {/* {activeTab === 'sharing' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={sharingFilters.startDate}
                          onChange={(e) => setSharingFilters({ ...sharingFilters, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={sharingFilters.endDate}
                          onChange={(e) => setSharingFilters({ ...sharingFilters, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>

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
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">Resource Type</th>
                          <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase whitespace-nowrap">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {thirdPartySharing.sharingEvents?.length > 0 ? (
                          thirdPartySharing.sharingEvents.map((event) => {
                            const formatTimestampUTC = (timestamp) => {
                              if (!timestamp) return 'N/A';
                              const date = new Date(timestamp);
                              return date.toISOString().replace('T', ' ').substring(0, 23);
                            };

                            const formatAction = (action) => {
                              if (!action) return 'N/A';
                              let formatted = action
                                .replace(/\./g, ' ')
                                .replace(/_/g, ' ')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ');
                              if (formatted.includes('Data Audit')) {
                                formatted = formatted.replace('Data Audit', 'Data Audit');
                              }
                              if (formatted.includes('Report Export')) {
                                formatted = 'Export Report';
                              }
                              if (formatted.includes('Data Export')) {
                                formatted = 'Data Export';
                              }
                              if (formatted.includes('Export')) {
                                formatted = formatted.replace('Export', 'Data Export');
                              }
                              if (formatted.includes('Share')) {
                                formatted = formatted.replace('Share', 'Data Share');
                              }
                              if (formatted.includes('Transfer')) {
                                formatted = formatted.replace('Transfer', 'Data Transfer');
                              }
                              if (formatted.includes('Phi')) {
                                formatted = formatted.replace('Phi', 'PHI');
                              }
                              return formatted;
                            };

                            const formatIPAddress = (ip) => {
                              if (!ip) return 'N/A';
                              if (ip === '::1' || ip === '::ffff:127.0.0.1') {
                                return '127.0.0.1';
                              }
                              if (ip.startsWith('::ffff:')) {
                                return ip.replace('::ffff:', '');
                              }
                              return ip;
                            };

                            return (
                              <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-900 font-mono whitespace-nowrap">{formatTimestampUTC(event.timestamp)}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 break-words max-w-[200px]">{event.userEmail || 'N/A'}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 whitespace-nowrap">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                                    {event.userRole || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 break-words">{formatAction(event.action)}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 break-words">{event.resourceType || 'N/A'}</td>
                                <td className="px-3 md:px-4 py-3 text-xs md:text-sm text-gray-600 font-mono whitespace-nowrap">{formatIPAddress(event.ipAddress)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                              No sharing events found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )} */}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataAudit;
