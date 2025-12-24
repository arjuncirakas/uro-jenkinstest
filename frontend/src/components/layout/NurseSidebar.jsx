import React from 'react';
import { FaUsers, FaCalendarAlt, FaStethoscope, FaDatabase, FaHeartbeat, FaClipboardList, FaMicroscope } from 'react-icons/fa';
import BaseSidebar from './BaseSidebar';
import PropTypes from 'prop-types';

/**
 * NurseSidebar - Sidebar component for Nurse panel
 * Uses BaseSidebar to reduce code duplication
 */
const NurseSidebar = ({ isOpen, onClose, onOpenAddPatient }) => {
  const navigationItems = [
    { name: 'OPD Management', icon: FaDatabase, path: '/nurse/opd-management' },
    { name: 'Investigations', icon: FaMicroscope, path: '/nurse/investigations' },
    { name: 'Appointments', icon: FaCalendarAlt, path: '/nurse/appointments' },
    { name: 'Active Monitoring', icon: FaHeartbeat, path: '/nurse/monitoring' },
    { name: 'Surgery', icon: FaStethoscope, path: '/nurse/surgery' },
    { name: 'Post-Op Follow-up', icon: FaClipboardList, path: '/nurse/followup' },
    { name: 'Patient List', icon: FaUsers, path: '/nurse/patients' },
  ];

  return (
    <BaseSidebar
      isOpen={isOpen}
      onClose={onClose}
      onOpenAddPatient={onOpenAddPatient}
      navigationItems={navigationItems}
      panelName="Nurse Panel"
      newButtonLabel="New Patient"
    />
  );
};

NurseSidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenAddPatient: PropTypes.func.isRequired
};

export default NurseSidebar;
