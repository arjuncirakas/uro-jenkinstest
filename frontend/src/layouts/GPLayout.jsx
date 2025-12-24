import React from 'react';
import BaseLayout from './BaseLayout';
import GPSidebar from '../components/layout/GPSidebar';

/**
 * GPLayout - Layout component for GP panel
 * Uses BaseLayout to reduce code duplication
 */
const GPLayout = () => {
  return <BaseLayout SidebarComponent={GPSidebar} isUrologist={false} />;
};

export default GPLayout;
