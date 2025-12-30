/**
 * Tests for SuperadminLayout.jsx
 * Ensures 100% coverage including all props and rendering
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SuperadminLayout from '../SuperadminLayout';
import React from 'react';

// Mock AdminSidebarLayout
vi.mock('../AdminSidebarLayout', () => ({
  default: ({ navigation, panelName, fullWidthPaths }) => (
    <div data-testid="admin-sidebar-layout">
      <div data-testid="panel-name">{panelName}</div>
      <div data-testid="navigation">
        {navigation.map((item, index) => (
          <div key={index} data-testid={`nav-item-${index}`}>
            {item.name}
          </div>
        ))}
      </div>
      {fullWidthPaths && (
        <div data-testid="full-width-paths">
          {fullWidthPaths.join(',')}
        </div>
      )}
    </div>
  )
}));

describe('SuperadminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with correct panel name', () => {
    render(
      <MemoryRouter>
        <SuperadminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('panel-name')).toHaveTextContent('Superadmin Panel');
  });

  it('should render navigation items', () => {
    render(
      <MemoryRouter>
        <SuperadminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('nav-item-0')).toHaveTextContent('All Users');
    expect(screen.getByTestId('nav-item-1')).toHaveTextContent('Consent Forms');
  });

  it('should pass correct navigation array to AdminSidebarLayout', () => {
    render(
      <MemoryRouter>
        <SuperadminLayout />
      </MemoryRouter>
    );

    const navigation = screen.getByTestId('navigation');
    expect(navigation).toBeInTheDocument();
    expect(screen.getByText('All Users')).toBeInTheDocument();
    expect(screen.getByText('Consent Forms')).toBeInTheDocument();
  });

  it('should pass fullWidthPaths prop to AdminSidebarLayout', () => {
    render(
      <MemoryRouter>
        <SuperadminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('full-width-paths')).toHaveTextContent('/superadmin/users');
  });

  it('should render AdminSidebarLayout component', () => {
    render(
      <MemoryRouter>
        <SuperadminLayout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-sidebar-layout')).toBeInTheDocument();
  });

  it('should execute all lines including export statement', () => {
    // Component is imported at the top, so export statement is executed
    render(
      <MemoryRouter>
        <SuperadminLayout />
      </MemoryRouter>
    );

    // Verify component renders (all lines executed)
    expect(screen.getByTestId('admin-sidebar-layout')).toBeInTheDocument();
  });
});






