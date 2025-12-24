import React from 'react';
import { HiHome } from 'react-icons/hi';
import { FaUsers, FaHeartbeat, FaPills } from 'react-icons/fa';
import BaseSidebar from './BaseSidebar';
import PropTypes from 'prop-types';

/**
 * GPSidebar - Sidebar component for GP panel
 * Uses BaseSidebar to reduce code duplication
 */
const GPSidebar = ({ isOpen, onClose, onOpenAddPatient }) => {
  const navigationItems = [
    { name: 'Dashboard', icon: HiHome, path: '/gp/dashboard', paths: ['/gp/dashboard', '/gp'] },
    { name: 'Referred Patients', icon: FaUsers, path: '/gp/referred-patients' },
    { name: 'Active Monitoring', icon: FaHeartbeat, path: '/gp/monitoring' },
    { name: 'Medication', icon: FaPills, path: '/gp/medication' },
  ];

  return (
    <BaseSidebar
      isOpen={isOpen}
      onClose={onClose}
      onOpenAddPatient={onOpenAddPatient}
      navigationItems={navigationItems}
      panelName="GP Panel"
      newButtonLabel="New Patient"
    />
  );
};

GPSidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenAddPatient: PropTypes.func.isRequired
};

export default GPSidebar;
