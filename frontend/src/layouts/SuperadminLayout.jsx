import React from 'react';
import { Users, FileText } from 'lucide-react';
import AdminSidebarLayout from './AdminSidebarLayout';

/**
 * SuperadminLayout - Layout for Superadmin panel
 * Uses AdminSidebarLayout to reduce code duplication
 */
const SuperadminLayout = () => {
  const navigation = [
    { name: 'All Users', href: '/superadmin/users', icon: Users },
    { name: 'Consent Forms', href: '/superadmin/consent-forms', icon: FileText },
  ];

  return (
    <AdminSidebarLayout
      navigation={navigation}
      panelName="Superadmin Panel"
      fullWidthPaths={['/superadmin/users']}
    />
  );
};

export default SuperadminLayout;
