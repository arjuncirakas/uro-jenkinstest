import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { IoLogOutOutline, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import authService from '../services/authService.js';
import tokenService from '../services/tokenService.js';
import PropTypes from 'prop-types';
import TermsAndConditionsModal from '../components/modals/TermsAndConditionsModal';
import PrivacyPolicyModal from '../components/modals/PrivacyPolicyModal';
import NoticeOfPrivacyPracticesModal from '../components/modals/NoticeOfPrivacyPracticesModal';

/**
 * AdminSidebarLayout - Shared layout component for admin panels
 * Reduces code duplication between SuperadminLayout and DepartmentAdminLayout
 */
const AdminSidebarLayout = ({
    navigation,
    panelName,
    fullWidthPaths = []
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isNPPModalOpen, setIsNPPModalOpen] = useState(false);

    // Proactive token refresh - check every 5 minutes
    useEffect(() => {
        const refreshTokenIfNeeded = async () => {
            try {
                if (tokenService.needsRefresh()) {
                    console.log('🔄 Proactively refreshing token...');
                    await authService.autoRefreshToken();
                }
            } catch (error) {
                console.error('Token refresh check failed:', error);
            }
        };

        refreshTokenIfNeeded();
        const interval = setInterval(refreshTokenIfNeeded, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await authService.logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    const isCurrentPath = (path) => location.pathname === path;

    const handleLinkClick = () => setSidebarOpen(false);

    const isFullWidth = fullWidthPaths.includes(location.pathname);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <button
                    type="button"
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden cursor-default border-none"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                />
            )}

            {/* Sidebar */}
            <div className={`
        ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} bg-white flex flex-col h-screen border-r border-gray-200
        fixed lg:static z-50 transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-gray-400 hover:text-gray-600"
                            aria-label="Close mobile sidebar"
                        >
                            <X className="h-6 w-6" />
                        </button>
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
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.name}>
                                    <Link
                                        to={item.href}
                                        onClick={handleLinkClick}
                                        className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-lg transition-all ${isCurrentPath(item.href)
                                            ? 'bg-teal-50 text-teal-700'
                                            : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        title={isCollapsed ? item.name : ''}
                                    >
                                        <Icon className={`text-xl ${isCollapsed ? '' : 'mr-4'} ${isCurrentPath(item.href) ? 'text-teal-600' : 'text-gray-500'}`} />
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
                        onClick={handleLogout}
                        className={`flex items-center ${isCollapsed ? 'justify-center' : ''} px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors w-full`}
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

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile menu button - floating */}
                <button
                    type="button"
                    className="fixed top-4 left-4 z-30 p-2.5 bg-white rounded-lg shadow-lg text-gray-700 lg:hidden border border-gray-200"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open sidebar"
                >
                    <Menu className="h-6 w-6" />
                </button>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="py-6">
                        <div className={`${isFullWidth ? 'max-w-full' : 'max-w-full'} px-2 sm:px-3 lg:px-4`}>
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

AdminSidebarLayout.propTypes = {
    navigation: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        href: PropTypes.string.isRequired,
        icon: PropTypes.elementType.isRequired
    })).isRequired,
    panelName: PropTypes.string.isRequired,
    fullWidthPaths: PropTypes.arrayOf(PropTypes.string)
};

export default AdminSidebarLayout;
