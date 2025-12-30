/**
 * Tests for DepartmentAdminLayout.jsx
 * Ensures 100% coverage including all props and rendering
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DepartmentAdminLayout from '../DepartmentAdminLayout';
import React from 'react';

// Mock AdminSidebarLayout
vi.mock('../AdminSidebarLayout', () => ({
  default: ({ navigation, panelName }) => (
    <div data-testid="admin-sidebar-layout">
      <div data-testid="panel-name">{panelName}</div>
      <div data-testid="navigation">
        {navigation.map((item, index) => (
          <div key={index} data-testid={`nav-item-${index}`}>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  )
}));

describe('DepartmentAdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with correct panel name', () => {
    render(
      <MemoryRouter>
        <DepartmentAdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('panel-name')).toHaveTextContent('Department Admin Panel');
  });

  it('should render navigation items', () => {
    render(
      <MemoryRouter>
        <DepartmentAdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('nav-item-0')).toHaveTextContent('KPI Dashboard');
    expect(screen.getByTestId('nav-item-1')).toHaveTextContent('Data Export');
  });

  it('should pass correct navigation array to AdminSidebarLayout', () => {
    render(
      <MemoryRouter>
        <DepartmentAdminLayout />
      </MemoryRouter>
    );

    const navigation = screen.getByTestId('navigation');
    expect(navigation).toBeInTheDocument();
    expect(screen.getByText('KPI Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Data Export')).toBeInTheDocument();
  });

  it('should render AdminSidebarLayout component', () => {
    render(
      <MemoryRouter>
        <DepartmentAdminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-sidebar-layout')).toBeInTheDocument();
  });

  it('should execute all lines including export statement', () => {
    // Component is imported at the top, so export statement is executed
    render(
      <MemoryRouter>
        <DepartmentAdminLayout />
      </MemoryRouter>
    );

    // Verify component renders (all lines executed)
    expect(screen.getByTestId('admin-sidebar-layout')).toBeInTheDocument();
  });
});






