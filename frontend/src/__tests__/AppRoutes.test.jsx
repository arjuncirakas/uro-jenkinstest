import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock all the page components
vi.mock('../components/ProtectedRoute', () => ({
    default: ({ children }) => <div data-testid="protected-route">{children}</div>
}));

vi.mock('../layouts/UrologistLayout', () => ({
    default: () => <div data-testid="urologist-layout">Urologist Layout</div>
}));

vi.mock('../layouts/GPLayout', () => ({
    default: () => <div data-testid="gp-layout">GP Layout</div>
}));

vi.mock('../layouts/NurseLayout', () => ({
    default: () => <div data-testid="nurse-layout">Nurse Layout</div>
}));

vi.mock('../layouts/SuperadminLayout', () => ({
    default: () => <div data-testid="superadmin-layout">Superadmin Layout</div>
}));

vi.mock('../layouts/DepartmentAdminLayout', () => ({
    default: () => <div data-testid="department-admin-layout">Department Admin Layout</div>
}));

vi.mock('../components/auth/Login', () => ({
    default: () => <div data-testid="login-page">Login Page</div>
}));

vi.mock('../components/auth/Register', () => ({
    default: () => <div data-testid="register-page">Register Page</div>
}));

vi.mock('../pages/SetupPassword', () => ({
    default: () => <div data-testid="setup-password-page">Setup Password Page</div>
}));

vi.mock('../pages/Unauthorized', () => ({
    default: () => <div data-testid="unauthorized-page">Unauthorized Page</div>
}));

// Mock Urologist pages
vi.mock('../pages/urologist/Dashboard', () => ({
    default: () => <div data-testid="urologist-dashboard">Urologist Dashboard</div>
}));

vi.mock('../pages/urologist/Patients', () => ({
    default: () => <div data-testid="urologist-patients">Urologist Patients</div>
}));

vi.mock('../pages/urologist/Appointments', () => ({
    default: () => <div data-testid="urologist-appointments">Urologist Appointments</div>
}));

// Mock GP pages
vi.mock('../pages/gp/Dashboard', () => ({
    default: () => <div data-testid="gp-dashboard">GP Dashboard</div>
}));

vi.mock('../pages/gp/ReferredPatients', () => ({
    default: () => <div data-testid="gp-referred-patients">GP Referred Patients</div>
}));

vi.mock('../pages/gp/ActiveMonitoring', () => ({
    default: () => <div data-testid="gp-monitoring">GP Monitoring</div>
}));

vi.mock('../pages/gp/Medication', () => ({
    default: () => <div data-testid="gp-medication">GP Medication</div>
}));

// Mock Nurse pages
vi.mock('../pages/nurse/OPDManagement', () => ({
    default: () => <div data-testid="opd-management">OPD Management</div>
}));

vi.mock('../pages/nurse/InvestigationManagement', () => ({
    default: () => <div data-testid="investigation-management">Investigation Management</div>
}));

vi.mock('../pages/nurse/PatientList', () => ({
    default: () => <div data-testid="patient-list">Patient List</div>
}));

vi.mock('../pages/nurse/Appointments', () => ({
    default: () => <div data-testid="nurse-appointments">Nurse Appointments</div>
}));

vi.mock('../pages/nurse/ActiveMonitoring', () => ({
    default: () => <div data-testid="nurse-monitoring">Nurse Monitoring</div>
}));

vi.mock('../pages/nurse/Surgery', () => ({
    default: () => <div data-testid="surgery">Surgery</div>
}));

vi.mock('../pages/nurse/PostOpFollowup', () => ({
    default: () => <div data-testid="post-op-followup">Post Op Followup</div>
}));

// Mock Superadmin pages
vi.mock('../pages/superadmin/Dashboard', () => ({
    default: () => <div data-testid="superadmin-dashboard">Superadmin Dashboard</div>
}));

vi.mock('../pages/superadmin/Users', () => ({
    default: () => <div data-testid="users-page">Users Page</div>
}));

vi.mock('../pages/superadmin/AddUser', () => ({
    default: () => <div data-testid="add-user-page">Add User Page</div>
}));

vi.mock('../pages/superadmin/Departments', () => ({
    default: () => <div data-testid="departments-page">Departments Page</div>
}));

vi.mock('../pages/superadmin/Doctors', () => ({
    default: () => <div data-testid="doctors-page">Doctors Page</div>
}));

vi.mock('../pages/superadmin/Nurses', () => ({
    default: () => <div data-testid="nurses-page">Nurses Page</div>
}));

vi.mock('../pages/superadmin/ConsentForms', () => ({
    default: () => <div data-testid="consent-forms-page">Consent Forms Page</div>
}));

// Mock Department Admin pages
vi.mock('../pages/departmentadmin/Dashboard', () => ({
    default: () => <div data-testid="department-admin-dashboard">Department Admin Dashboard</div>
}));

vi.mock('../pages/departmentadmin/DataExport', () => ({
    default: () => <div data-testid="data-export-page">Data Export Page</div>
}));

import AppRoutes from '../AppRoutes';

describe('AppRoutes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Public Routes', () => {
        it('should render login page at /login', () => {
            render(
                <MemoryRouter initialEntries={['/login']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });

        it('should render register page at /register', () => {
            render(
                <MemoryRouter initialEntries={['/register']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('register-page')).toBeInTheDocument();
        });

        it('should render setup password page at /setup-password', () => {
            render(
                <MemoryRouter initialEntries={['/setup-password']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('setup-password-page')).toBeInTheDocument();
        });

        it('should render unauthorized page at /unauthorized', () => {
            render(
                <MemoryRouter initialEntries={['/unauthorized']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
        });
    });

    describe('Default Routes', () => {
        it('should redirect to login at root path', () => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });

        it('should redirect unknown routes to login', () => {
            render(
                <MemoryRouter initialEntries={['/unknown-route']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    describe('Protected Routes - Urologist', () => {
        it('should render protected urologist layout', () => {
            render(
                <MemoryRouter initialEntries={['/urologist/dashboard']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        });
    });

    describe('Protected Routes - GP', () => {
        it('should render protected GP layout', () => {
            render(
                <MemoryRouter initialEntries={['/gp/dashboard']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        });
    });

    describe('Protected Routes - Nurse', () => {
        it('should render protected nurse layout', () => {
            render(
                <MemoryRouter initialEntries={['/nurse/opd-management']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        });
    });

    describe('Protected Routes - Superadmin', () => {
        it('should render protected superadmin layout', () => {
            render(
                <MemoryRouter initialEntries={['/superadmin/users']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        });
    });

    describe('Protected Routes - Department Admin', () => {
        it('should render protected department admin layout', () => {
            render(
                <MemoryRouter initialEntries={['/department-admin/dashboard']}>
                    <AppRoutes />
                </MemoryRouter>
            );
            expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        });
    });
});
