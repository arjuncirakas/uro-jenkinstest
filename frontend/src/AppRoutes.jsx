import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Security
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import UrologistLayout from './layouts/UrologistLayout';
import GPLayout from './layouts/GPLayout';
import NurseLayout from './layouts/NurseLayout';
import SuperadminLayout from './layouts/SuperadminLayout';

// Auth
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import SetupPassword from './pages/SetupPassword';
import Unauthorized from './pages/Unauthorized';

// Urologist Pages
import UrologistDashboard from './pages/urologist/Dashboard';
import Patients from './pages/urologist/Patients';
import Appointments from './pages/urologist/Appointments';

// GP Pages
import GPDashboard from './pages/gp/Dashboard';
import GPReferredPatients from './pages/gp/ReferredPatients';
import GPActiveMonitoring from './pages/gp/ActiveMonitoring';
import GPMedication from './pages/gp/Medication';

// Nurse Pages
import OPDManagement from './pages/nurse/OPDManagement';
import InvestigationManagement from './pages/nurse/InvestigationManagement';
import PatientList from './pages/nurse/PatientList';
import NurseAppointments from './pages/nurse/Appointments';
import ActiveMonitoring from './pages/nurse/ActiveMonitoring';
import Surgery from './pages/nurse/Surgery';
import PostOpFollowup from './pages/nurse/PostOpFollowup';

// Superadmin Pages
import SuperadminDashboard from './pages/superadmin/Dashboard';
import Users from './pages/superadmin/Users';
import AddUser from './pages/superadmin/AddUser';
import Departments from './pages/superadmin/Departments';
import Doctors from './pages/superadmin/Doctors';
import Nurses from './pages/superadmin/Nurses';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes - No authentication required */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/setup-password" element={<SetupPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes - Authentication + Role-based authorization required */}
      
      {/* Urologist Routes - Only accessible by urologists */}
      <Route 
        path="/urologist" 
        element={
          <ProtectedRoute allowedRoles={['urologist']}>
            <UrologistLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/urologist/dashboard" replace />} />
        <Route path="dashboard" element={<UrologistDashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/new" element={<Patients />} />
        <Route path="patients/surgery-pathway" element={<Patients />} />
        <Route path="patients/post-op-followup" element={<Patients />} />
        <Route path="appointments" element={<Appointments />} />
      </Route>

      {/* GP Routes - Only accessible by GPs */}
      <Route 
        path="/gp" 
        element={
          <ProtectedRoute allowedRoles={['gp']}>
            <GPLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/gp/dashboard" replace />} />
        <Route path="dashboard" element={<GPDashboard />} />
        <Route path="referred-patients" element={<GPReferredPatients />} />
        <Route path="monitoring" element={<GPActiveMonitoring />} />
        <Route path="medication" element={<GPMedication />} />
      </Route>

      {/* Nurse Routes - Only accessible by urology nurses */}
      <Route 
        path="/nurse" 
        element={
          <ProtectedRoute allowedRoles={['urology_nurse']}>
            <NurseLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/nurse/opd-management" replace />} />
        <Route path="opd-management" element={<OPDManagement />} />
        <Route path="investigations" element={<InvestigationManagement />} />
        <Route path="patients" element={<PatientList />} />
        <Route path="appointments" element={<NurseAppointments />} />
        <Route path="monitoring" element={<ActiveMonitoring />} />
        <Route path="surgery" element={<Surgery />} />
        <Route path="followup" element={<PostOpFollowup />} />
      </Route>

      {/* Superadmin Routes - Only accessible by superadmins */}
      <Route 
        path="/superadmin" 
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <SuperadminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperadminDashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="users/new" element={<AddUser />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="nurses" element={<Nurses />} />
        <Route path="departments" element={<Departments />} />
      </Route>

      {/* Default Route - Redirect to Login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch all - Redirect to Login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;

