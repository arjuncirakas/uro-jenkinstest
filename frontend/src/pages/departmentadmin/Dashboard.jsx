import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Calendar, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import departmentAdminService from '../../services/departmentAdminService';

const DepartmentAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '', // Empty means no filter - show all data
    endDate: ''
  });
  const [trendPeriod, setTrendPeriod] = useState('month');
  const [trendMonths, setTrendMonths] = useState(12);

  useEffect(() => {
    fetchKPIData();
    fetchTrends();
  }, [dateRange, trendPeriod, trendMonths]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await departmentAdminService.getAllKPIs(
        dateRange.startDate,
        dateRange.endDate
      );
      if (result.success) {
        setKpiData(result.data);
      } else {
        setError(result.message || 'Failed to fetch KPI data');
      }
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError(err.message || 'Failed to fetch KPI data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const result = await departmentAdminService.getKPITrends(trendPeriod, trendMonths);
      if (result.success) {
        setTrends(result.data);
      }
    } catch (err) {
      console.error('Error fetching trends:', err);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading && !kpiData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        <span className="ml-3 text-gray-600">Loading KPI data...</span>
      </div>
    );
  }

  if (error && !kpiData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button
          onClick={fetchKPIData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time performance metrics and analytics</p>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          {(!dateRange.startDate || !dateRange.endDate) && (
            <span className="text-xs text-gray-500 italic">
              (Showing all data - select dates to filter)
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Wait Time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Average Wait Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpiData?.averageWaitTime?.days || '0'} days
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            From referral to first consult
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Based on {kpiData?.averageWaitTime?.totalPatients || 0} patients
          </p>
        </div>

        {/* Active Surveillance Compliance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Surveillance Compliance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpiData?.activeSurveillanceCompliance?.percentage || '0%'}
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Active surveillance follow-ups
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {kpiData?.activeSurveillanceCompliance?.compliantPatients || 0} / {kpiData?.activeSurveillanceCompliance?.totalPatients || 0} patients
          </p>
        </div>

        {/* Discharge to GP */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <ArrowRight className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Discharged to GP</p>
                <p className="text-2xl font-bold text-gray-900">
                  {kpiData?.dischargeToGP?.percentageText || '0%'}
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Patients discharged back to GP
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {kpiData?.dischargeToGP?.dischargedToGP || 0} / {kpiData?.dischargeToGP?.totalDischarged || 0} patients
          </p>
        </div>
      </div>

      {/* Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wait Time Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Wait Time Trends</h3>
            <div className="flex items-center gap-2">
              <select
                value={trendPeriod}
                onChange={(e) => setTrendPeriod(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
              <select
                value={trendMonths}
                onChange={(e) => setTrendMonths(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="3">Last 3 months</option>
                <option value="6">Last 6 months</option>
                <option value="12">Last 12 months</option>
                <option value="24">Last 24 months</option>
              </select>
            </div>
          </div>
          {trends?.waitTimeTrends && trends.waitTimeTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends.waitTimeTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  }}
                />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgWaitDays" 
                  stroke="#0d9488" 
                  strokeWidth={2}
                  name="Average Wait (days)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No trend data available
            </div>
          )}
        </div>

        {/* Compliance Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Trends</h3>
          </div>
          {trends?.complianceTrends && trends.complianceTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends.complianceTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  }}
                />
                <YAxis label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  }}
                />
                <Legend />
                <Bar dataKey="complianceRate" fill="#8b5cf6" name="Compliance Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Wait Time Statistics</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Average:</span>
                <span className="font-medium">{kpiData?.averageWaitTime?.days || '0'} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Patients:</span>
                <span className="font-medium">{kpiData?.averageWaitTime?.totalPatients || 0}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Active Surveillance</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Compliance Rate:</span>
                <span className="font-medium">{kpiData?.activeSurveillanceCompliance?.percentage || '0%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Patients:</span>
                <span className="font-medium">{kpiData?.activeSurveillanceCompliance?.totalPatients || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Compliant:</span>
                <span className="font-medium text-green-600">{kpiData?.activeSurveillanceCompliance?.compliantPatients || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Non-Compliant:</span>
                <span className="font-medium text-red-600">{kpiData?.activeSurveillanceCompliance?.nonCompliantPatients || 0}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Discharge Statistics</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Discharged to GP:</span>
                <span className="font-medium">{kpiData?.dischargeToGP?.percentageText || '0%'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Discharged:</span>
                <span className="font-medium">{kpiData?.dischargeToGP?.totalDischarged || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To GP:</span>
                <span className="font-medium text-green-600">{kpiData?.dischargeToGP?.dischargedToGP || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Without GP:</span>
                <span className="font-medium text-gray-600">{kpiData?.dischargeToGP?.dischargedWithoutGP || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAdminDashboard;

