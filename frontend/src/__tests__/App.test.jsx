import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock tokenRefresh before importing App
const mockStart = vi.fn();
const mockStop = vi.fn();

vi.mock('../utils/tokenRefresh', () => ({
    default: {
        start: mockStart,
        stop: mockStop
    }
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
    Routes: ({ children }) => <div data-testid="routes">{children}</div>,
    Route: () => null,
    Navigate: () => null
}));

// Mock Redux
vi.mock('react-redux', () => ({
    Provider: ({ children }) => <div data-testid="provider">{children}</div>
}));

// Mock store
vi.mock('../store', () => ({
    store: {}
}));

// Mock AppRoutes
vi.mock('../AppRoutes', () => ({
    default: () => <div data-testid="app-routes">AppRoutes</div>
}));

// Import App after mocks
import App from '../App';

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('should render the app with Provider and Router', () => {
        render(<App />);
        expect(screen.getByTestId('provider')).toBeInTheDocument();
        expect(screen.getByTestId('router')).toBeInTheDocument();
        expect(screen.getByTestId('app-routes')).toBeInTheDocument();
    });

    it('should start token refresh manager on mount', () => {
        render(<App />);
        expect(mockStart).toHaveBeenCalled();
    });

    it('should stop token refresh manager on unmount', () => {
        const { unmount } = render(<App />);
        unmount();
        expect(mockStop).toHaveBeenCalled();
    });

    it('should render AppRoutes inside Provider and Router', () => {
        render(<App />);
        const provider = screen.getByTestId('provider');
        const router = screen.getByTestId('router');
        const appRoutes = screen.getByTestId('app-routes');

        expect(provider).toContainElement(router);
        expect(router).toContainElement(appRoutes);
    });
});
