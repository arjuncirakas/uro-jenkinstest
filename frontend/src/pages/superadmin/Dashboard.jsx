import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Activity, Shield, AlertCircle, CheckCircle, Building2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getDashboardStats } from '../../store/slices/superadminSlice';
import ErrorModal from '../../components/modals/ErrorModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { stats, isLoading, error } = useAppSelector((state) => state.superadmin);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    dispatch(getDashboardStats());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      setShowErrorModal(true);
    }
  }, [error]);

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'urologist': 'Urologist',
      'gp': 'General Practitioner',
      'urology_nurse': 'Urology Nurse'
    };
    return roleMap[role] || role;
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'text-green-600' : 'text-yellow-600';
  };

  const getStatusIcon = (status) => {
    return status === 'active' ? CheckCircle : AlertCircle;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const handleRetry = () => {
    setShowErrorModal(false);
    dispatch(getDashboardStats());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage users and system settings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Users */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-teal-500 rounded-lg p-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.activeUsers}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-teal-600 rounded-lg p-3">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Users */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending Setup</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stats.pendingUsers}</p>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-teal-400 rounded-lg p-3">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => navigate('/superadmin/users/new')}
              className="bg-white p-5 rounded-lg border border-gray-300 hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-lg inline-flex p-3 bg-teal-50 mb-3">
                  <UserPlus className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Add New User
                </h3>
                <p className="text-sm text-gray-500">
                  Create a new user account and send password setup email
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/superadmin/users')}
              className="bg-white p-5 rounded-lg border border-gray-300 hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-lg inline-flex p-3 bg-teal-50 mb-3">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Manage Users
                </h3>
                <p className="text-sm text-gray-500">
                  View, edit, and manage all user accounts
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/superadmin/doctors')}
              className="bg-white p-5 rounded-lg border border-gray-300 hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-lg inline-flex p-3 bg-teal-50 mb-3">
                  <User className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Manage Doctors
                </h3>
                <p className="text-sm text-gray-500">
                  Add, edit, and manage hospital doctors
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('/superadmin/departments')}
              className="bg-white p-5 rounded-lg border border-gray-300 hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="rounded-lg inline-flex p-3 bg-teal-50 mb-3">
                  <Building2 className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  Manage Departments
                </h3>
                <p className="text-sm text-gray-500">
                  Add, edit, and manage hospital departments
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white shadow rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Users</h3>
          <div className="flow-root">
            {stats.recentUsers.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {stats.recentUsers.map((user) => {
                  const StatusIcon = getStatusIcon(user.status);
                  return (
                    <li key={user.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-teal-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getRoleDisplayName(user.role)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`h-4 w-4 ${getStatusColor(user.status)}`} />
                          <span className={`text-sm font-medium ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-6">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/superadmin/users/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        error={error}
        title="Dashboard Error"
      />
    </div>
  );
};

export default Dashboard;
