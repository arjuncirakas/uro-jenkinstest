import React from 'react';
import BaseLayout from './BaseLayout';
import NurseSidebar from '../components/layout/NurseSidebar';

/**
 * NurseLayout - Layout component for Nurse panel
 * Uses BaseLayout to reduce code duplication
 */
const NurseLayout = () => {
  return <BaseLayout SidebarComponent={NurseSidebar} isUrologist={false} />;
};

export default NurseLayout;
