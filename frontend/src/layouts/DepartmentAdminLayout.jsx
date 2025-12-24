import React from 'react';
import { BarChart3, Download } from 'lucide-react';
import AdminSidebarLayout from './AdminSidebarLayout';

/**
 * DepartmentAdminLayout - Layout for Department Admin panel
 * Uses AdminSidebarLayout to reduce code duplication
 */
const DepartmentAdminLayout = () => {
  const navigation = [
    { name: 'KPI Dashboard', href: '/department-admin/dashboard', icon: BarChart3 },
    { name: 'Data Export', href: '/department-admin/export', icon: Download },
  ];

  return (
    <AdminSidebarLayout
      navigation={navigation}
      panelName="Department Admin Panel"
    />
  );
};

export default DepartmentAdminLayout;
