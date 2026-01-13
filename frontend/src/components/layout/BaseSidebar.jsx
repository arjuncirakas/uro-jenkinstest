import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoLogOutOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import authService from '../../services/authService';
import PropTypes from 'prop-types';
import TermsAndConditionsModal from '../modals/TermsAndConditionsModal';
import PrivacyPolicyModal from '../modals/PrivacyPolicyModal';
import NoticeOfPrivacyPracticesModal from '../modals/NoticeOfPrivacyPracticesModal';

/**
 * BaseSidebar - Shared sidebar component for all panels
 * Reduces code duplication by extracting common sidebar logic
 */
const BaseSidebar = ({
    isOpen,
    onClose,
    onOpenAddPatient,
    navigationItems,
    panelName = 'Panel',
    newButtonLabel = 'New Patient'
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isNPPModalOpen, setIsNPPModalOpen] = useState(false);

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

    // Compute active state for navigation items
    const itemsWithActiveState = navigationItems.map(item => ({
        ...item,
        active: item.paths
            ? item.paths.includes(location.pathname)
            : location.pathname === item.path
    }));

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
                {!isCollapsed && <div className="mt-2 text-xs text-gray-500">{panelName}</div>}
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-4 py-2">
                <ul className="space-y-1">
                    {itemsWithActiveState.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <li key={item.name}>
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
                    title={isCollapsed ? newButtonLabel : ""}
                >
                    <span className={`${isCollapsed ? '' : 'text-xl mr-2'}`}>+</span>
                    {!isCollapsed && newButtonLabel}
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

BaseSidebar.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onOpenAddPatient: PropTypes.func.isRequired,
    navigationItems: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        icon: PropTypes.elementType.isRequired,
        path: PropTypes.string.isRequired,
        paths: PropTypes.arrayOf(PropTypes.string)
    })).isRequired,
    panelName: PropTypes.string,
    newButtonLabel: PropTypes.string
};

export default BaseSidebar;
