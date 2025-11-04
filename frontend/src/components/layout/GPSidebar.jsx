import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiHome } from 'react-icons/hi';
import { FaUsers, FaHeartbeat, FaPills } from 'react-icons/fa';
import { IoLogOutOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5';

const GPSidebar = ({ isOpen, onClose, onOpenAddPatient }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationItems = [
    { name: 'Dashboard', icon: HiHome, path: '/gp/dashboard', active: location.pathname === '/gp/dashboard' || location.pathname === '/gp' },
    { name: 'Referred Patients', icon: FaUsers, path: '/gp/referred-patients', active: location.pathname === '/gp/referred-patients' },
    { name: 'Active Monitoring', icon: FaHeartbeat, path: '/gp/monitoring', active: location.pathname === '/gp/monitoring' },
    { name: 'Medication', icon: FaPills, path: '/gp/medication', active: location.pathname === '/gp/medication' },
  ];

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className={`
      ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} bg-white flex flex-col h-screen border-r border-gray-200
      fixed lg:static z-40 transition-all duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo Section */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={isCollapsed ? "/qwe.png" : "/rdshgdsr.png"}
              alt="Urology Care System Logo" 
              className={`${isCollapsed ? 'w-10 h-10' : 'w-32 h-auto'} flex-shrink-0 transition-all duration-300`}
            />
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <IoChevronForward className="text-gray-600 text-lg" />
            ) : (
              <IoChevronBack className="text-gray-600 text-lg" />
            )}
          </button>
        </div>
        {!isCollapsed && <div className="mt-2 text-xs text-gray-500">GP Panel</div>}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-all ${
                    item.active
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title={isCollapsed ? item.name : ''}
                >
                  <IconComponent className={`text-xl ${isCollapsed ? '' : 'mr-4'} ${item.active ? 'text-teal-600' : 'text-gray-500'}`} />
                  {!isCollapsed && <span className="font-medium text-base">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 space-y-4">
        <button 
          onClick={onOpenAddPatient}
          className={`w-full bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center ${isCollapsed ? 'text-2xl' : ''}`}
          title={isCollapsed ? "New Patient" : ""}
        >
          <span className={`${isCollapsed ? '' : 'text-xl mr-2'}`}>+</span>
          {!isCollapsed && 'New Patient'}
        </button>
        
        <Link
          to="/login"
          className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors`}
          title={isCollapsed ? "Logout" : ""}
        >
          <IoLogOutOutline className={`text-xl ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </Link>
        
        {/* Powered by AhimsaGlobal */}
        {!isCollapsed && (
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Powered by AhimsaGlobal</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GPSidebar;

