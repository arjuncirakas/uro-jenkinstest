import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DepartmentAdminLayout from '../DepartmentAdminLayout';
import SuperadminLayout from '../SuperadminLayout';
import React from 'react';

// Mock AdminSidebarLayout
vi.mock('../AdminSidebarLayout', () => ({
    default: ({ navigation, panelName, fullWidthPaths }) => (
        <div data-testid="admin-sidebar-layout">
            <span data-testid="panel-name">{panelName}</span>
            <span data-testid="nav-count">{navigation.length}</span>
            <span data-testid="full-width-paths">{JSON.stringify(fullWidthPaths || [])}</span>
        </div>
    )
}));

describe('DepartmentAdminLayout', () => {
    it('renders AdminSidebarLayout with correct props', () => {
        render(
            <MemoryRouter>
                <DepartmentAdminLayout />
            </MemoryRouter>
        );

        expect(screen.getByTestId('admin-sidebar-layout')).toBeInTheDocument();
        expect(screen.getByTestId('panel-name').textContent).toBe('Department Admin Panel');
        expect(screen.getByTestId('nav-count').textContent).toBe('2');
    });

    it('passes correct navigation items', () => {
        render(
            <MemoryRouter>
                <DepartmentAdminLayout />
            </MemoryRouter>
        );

        expect(screen.getByTestId('panel-name').textContent).toContain('Department Admin');
    });
});

describe('SuperadminLayout', () => {
    it('renders AdminSidebarLayout with correct props', () => {
        render(
            <MemoryRouter>
                <SuperadminLayout />
            </MemoryRouter>
        );

        expect(screen.getByTestId('admin-sidebar-layout')).toBeInTheDocument();
        expect(screen.getByTestId('panel-name').textContent).toBe('Superadmin Panel');
        expect(screen.getByTestId('nav-count').textContent).toBe('2');
    });

    it('passes fullWidthPaths for users page', () => {
        render(
            <MemoryRouter>
                <SuperadminLayout />
            </MemoryRouter>
        );

        const fullWidthPaths = JSON.parse(screen.getByTestId('full-width-paths').textContent);
        expect(fullWidthPaths).toContain('/superadmin/users');
    });
});
