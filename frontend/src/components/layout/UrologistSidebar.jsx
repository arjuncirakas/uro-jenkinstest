import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HiHome } from 'react-icons/hi';
import { FaUsers, FaCalendarAlt, FaChevronDown, FaChevronRight, FaProcedures, FaHeartbeat, FaEye } from 'react-icons/fa';
import { IoLogOutOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import authService from '../../services/authService';
import TermsAndConditionsModal from '../modals/TermsAndConditionsModal';
import PrivacyPolicyModal from '../modals/PrivacyPolicyModal';
import NoticeOfPrivacyPracticesModal from '../modals/NoticeOfPrivacyPracticesModal';

// SubNavItem component
const SubNavItem = ({ subItem, onLinkClick }) => {
  const SubIconComponent = subItem.icon;

  return (
    <li className="relative group">
      {/* Horizontal line connecting to vertical line */}
      <div className="absolute left-[20px] top-[20px] w-[16px] h-[2px] bg-teal-300"></div>

      <Link
        to={subItem.path}
        onClick={onLinkClick}
        className={`flex items-center pl-8 py-2.5 rounded-lg transition-all ${subItem.active
            ? 'bg-teal-50 text-teal-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50'
          }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${subItem.active
            ? 'bg-teal-100'
            : 'bg-gray-100'
          }`}>
          <SubIconComponent className={`text-sm ${subItem.active ? 'text-teal-600' : 'text-gray-500'}`} />
        </div>
        <span className="text-sm font-medium">{subItem.name}</span>
      </Link>
    </li>
  );
};

const UrologistSidebar = ({ isOpen, onClose, onOpenAddPatient }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isNPPModalOpen, setIsNPPModalOpen] = useState(false);

  // Auto-expand Patients menu when on any patients route or active-surveillance
  const isPatientsExpanded = location.pathname.startsWith('/urologist/patients') || location.pathname === '/urologist/active-surveillance';
  // Track manual expand/collapse state - initialize based on whether we're on patients route or active-surveillance
  const [isPatientsMenuOpen, setIsPatientsMenuOpen] = useState(() =>
    location.pathname.startsWith('/urologist/patients') || location.pathname === '/urologist/active-surveillance'
  );

  // Auto-expand when navigating to patients route or active-surveillance, but preserve manual state when navigating away
  useEffect(() => {
    if (isPatientsExpanded) {
      setIsPatientsMenuOpen(true);
    }
  }, [isPatientsExpanded]);

  const navigationItems = [
    { name: 'Dashboard', icon: HiHome, path: '/urologist/dashboard', active: location.pathname === '/urologist/dashboard' || location.pathname === '/urologist' },
    {
      name: 'Patients',
      icon: FaUsers,
      path: '/urologist/patients/patients-under-me',
      active: location.pathname.startsWith('/urologist/patients') || location.pathname === '/urologist/active-surveillance',
      hasSubItems: true,
      subItems: [
        { name: 'Patients Under Me', icon: FaUsers, path: '/urologist/patients/patients-under-me', active: location.pathname === '/urologist/patients/patients-under-me' },
        { name: 'Surgery Pathway', icon: FaProcedures, path: '/urologist/patients/surgery-pathway', active: location.pathname === '/urologist/patients/surgery-pathway' },
        { name: 'Post-op Followup', icon: FaHeartbeat, path: '/urologist/patients/post-op-followup', active: location.pathname === '/urologist/patients/post-op-followup' },
        { name: 'Active Surveillance', icon: FaEye, path: '/urologist/active-surveillance', active: location.pathname === '/urologist/active-surveillance' },
        { name: 'All Patients', icon: FaUsers, path: '/urologist/patients/all', active: location.pathname === '/urologist/patients/all' },
      ]
    },
    { name: 'Appointments', icon: FaCalendarAlt, path: '/urologist/appointments', active: location.pathname === '/urologist/appointments' },
  ];

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      navigate('/login');
    }
  };


  return (
    <div className={`
      ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} bg-white flex flex-col h-screen border-r border-gray-200
      fixed lg:static z-40 transition-all duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `} style={{ overflow: 'visible' }}>
      {/* Logo Section */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/logo-uroprep.png"
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
        {!isCollapsed && <div className="mt-2 text-xs text-gray-500">Urologist Panel</div>}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-2 relative" style={{ overflowY: 'auto', overflowX: 'visible', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          nav::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <ul className="space-y-1" style={{ overflow: 'visible' }}>
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <li key={item.name}>
                {item.hasSubItems ? (
                  <>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-lg transition-all ${item.active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-50'
                      }`}>
                      <Link
                        to={item.path}
                        onClick={() => {
                          setIsPatientsMenuOpen(true); // Always expand when clicking main Patients link
                          handleLinkClick();
                        }}
                        className="flex items-center flex-1"
                        title={isCollapsed ? item.name : ''}
                      >
                        <IconComponent className={`text-xl ${isCollapsed ? '' : 'mr-4'} ${item.active ? 'text-teal-600' : 'text-gray-500'}`} />
                        {!isCollapsed && <span className="font-medium text-base">{item.name}</span>}
                      </Link>
                      {!isCollapsed && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsPatientsMenuOpen(!isPatientsMenuOpen);
                          }}
                          className="p-1 hover:bg-teal-100 rounded transition-colors"
                          aria-label={isPatientsMenuOpen ? "Collapse patients menu" : "Expand patients menu"}
                        >
                          {isPatientsMenuOpen ? (
                            <FaChevronDown className={`text-sm ${item.active ? 'text-teal-600' : 'text-gray-500'}`} />
                          ) : (
                            <FaChevronRight className={`text-sm ${item.active ? 'text-teal-600' : 'text-gray-500'}`} />
                          )}
                        </button>
                      )}
                    </div>
                    {!isCollapsed && isPatientsMenuOpen && (
                      <div className="mt-2 ml-4 relative">
                        {/* Main vertical line */}
                        <div className="absolute left-[20px] top-0 w-[2px] h-full bg-teal-300"></div>

                        <ul className="space-y-1">
                          {item.subItems.map((subItem, index) => (
                            <SubNavItem
                              key={subItem.name}
                              subItem={subItem}
                              onLinkClick={handleLinkClick}
                            />
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-all ${item.active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    title={isCollapsed ? item.name : ''}
                  >
                    <IconComponent className={`text-xl ${isCollapsed ? '' : 'mr-4'} ${item.active ? 'text-teal-600' : 'text-gray-500'}`} />
                    {!isCollapsed && <span className="font-medium text-base">{item.name}</span>}
                  </Link>
                )}
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

        <button
          onClick={handleLogout}
          className={`flex items-center ${isCollapsed ? 'justify-center' : ''} w-full px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors`}
          title={isCollapsed ? "Logout" : ""}
        >
          <IoLogOutOutline className={`text-xl ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>

        {/* Powered by AhimsaGlobal */}
        {!isCollapsed && (
          <div className="text-center pt-4 border-t border-gray-100 space-y-2">
            <p className="text-xs text-gray-400">Powered by AhimsaGlobal</p>
            <div className="flex justify-center gap-3 text-xs">
              <button
                onClick={() => setIsTermsModalOpen(true)}
                className="text-gray-500 hover:text-teal-600 transition-colors cursor-pointer"
              >
                Terms
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setIsPrivacyModalOpen(true)}
                className="text-gray-500 hover:text-teal-600 transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setIsNPPModalOpen(true)}
                className="text-gray-500 hover:text-teal-600 transition-colors cursor-pointer"
              >
                NPP
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
      <NoticeOfPrivacyPracticesModal
        isOpen={isNPPModalOpen}
        onClose={() => setIsNPPModalOpen(false)}
      />
    </div>
  );
};

export default UrologistSidebar;

