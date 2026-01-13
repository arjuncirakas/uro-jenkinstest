import React from 'react';
import { Users, FileText, FileSearch, Shield, Activity, AlertTriangle } from 'lucide-react';
import AdminSidebarLayout from './AdminSidebarLayout';

/**
 * SuperadminLayout - Layout for Superadmin panel
 * Uses AdminSidebarLayout to reduce code duplication
 */
const SuperadminLayout = () => {
  const navigation = [
    { name: 'All Users', href: '/superadmin/users', icon: Users },
    { name: 'Consent Forms', href: '/superadmin/consent-forms', icon: FileText },
    { name: 'Data Audit', href: '/superadmin/data-audit', icon: FileSearch },
    { name: 'Security Dashboard', href: '/superadmin/security-dashboard', icon: Shield },
    { name: 'Behavioral Analytics', href: '/superadmin/behavioral-analytics', icon: Activity },
    { name: 'Breach Management', href: '/superadmin/breach-management', icon: AlertTriangle },
  ];

  return (
    <AdminSidebarLayout
      navigation={navigation}
      panelName="Superadmin Panel"
      fullWidthPaths={['/superadmin/users', '/superadmin/data-audit', '/superadmin/security-dashboard', '/superadmin/behavioral-analytics', '/superadmin/breach-management']}
    />
  );
};

export default SuperadminLayout;
