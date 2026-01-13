/**
 * Tests for CookieConsentBanner.jsx
 * Ensures 100% coverage including all rendering paths and interactions
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CookieConsentBanner from '../CookieConsentBanner';
import React from 'react';

// Hoist mocks
const mocks = vi.hoisted(() => ({
  isAuthenticated: vi.fn()
}));

// Mock tokenService
vi.mock('../../services/tokenService', () => ({
  default: {
    isAuthenticated: mocks.isAuthenticated
  }
}));

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/urologist/dashboard' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation
  };
});

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockClear();
    // Reset location to a default protected route
    mockLocation.pathname = '/urologist/dashboard';
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <CookieConsentBanner />
      </BrowserRouter>
    );
  };

  describe('Rendering Logic', () => {
    it('should not render when user is not authenticated', () => {
      mocks.isAuthenticated.mockReturnValue(false);
      mockLocation.pathname = '/urologist/dashboard';
      
      const { container } = renderComponent();
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should not render on login page even if authenticated', () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/login';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should not render on register page even if authenticated', () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/register';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should not render on setup-password page even if authenticated', () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/setup-password';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should not render on unauthorized page even if authenticated', () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/unauthorized';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should hide banner when navigating to login page', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container, rerender } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
      
      // Navigate to login page
      mockLocation.pathname = '/login';
      rerender(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
      });
    });

    it('should not render when user has already accepted cookies', () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      localStorage.setItem('cookieConsent', 'true');
      
      const { container } = renderComponent();
      
      // Advance timers to trigger useEffect
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should not render when user has declined cookies', () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      localStorage.setItem('cookieConsent', 'declined');
      
      const { container } = renderComponent();
      
      // Advance timers to trigger useEffect
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should show cookie icon', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        const icon = screen.getByText('Cookie Consent').closest('.flex').querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should display correct message text', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/We use cookies to enhance your experience/)).toBeInTheDocument();
        expect(screen.getByText(/By clicking "Accept All", you consent to our use of cookies/)).toBeInTheDocument();
      });
    });
  });

  describe('Accept Button', () => {
    it('should save consent to localStorage when Accept All is clicked', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Accept All')).toBeInTheDocument();
      });
      
      const acceptButton = screen.getByText('Accept All');
      fireEvent.click(acceptButton);
      
      expect(localStorage.getItem('cookieConsent')).toBe('true');
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
    });

    it('should hide banner after accepting', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Accept All')).toBeInTheDocument();
      });
      
      const acceptButton = screen.getByText('Accept All');
      fireEvent.click(acceptButton);
      
      await waitFor(() => {
        expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Decline Button', () => {
    it('should save declined status to localStorage when Decline is clicked', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Decline')).toBeInTheDocument();
      });
      
      const declineButton = screen.getByText('Decline');
      fireEvent.click(declineButton);
      
      expect(localStorage.getItem('cookieConsent')).toBe('declined');
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
    });

    it('should hide banner after declining', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Decline')).toBeInTheDocument();
      });
      
      const declineButton = screen.getByText('Decline');
      fireEvent.click(declineButton);
      
      await waitFor(() => {
        expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Close Button', () => {
    it('should hide banner when close button is clicked', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
      });
    });

    it('should not save consent when close button is clicked', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      // Consent should not be saved
      expect(localStorage.getItem('cookieConsent')).toBeNull();
      // Session flag should be cleared
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
    });
  });

  describe('Privacy Policy Link', () => {
    it('should navigate to privacy policy page when Learn more is clicked', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Learn more')).toBeInTheDocument();
      });
      
      const learnMoreButton = screen.getByText('Learn more');
      fireEvent.click(learnMoreButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/privacy-policy');
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
    });

    it('should hide banner when Learn more is clicked', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { container } = renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Learn more')).toBeInTheDocument();
      });
      
      const learnMoreButton = screen.getByText('Learn more');
      fireEvent.click(learnMoreButton);
      
      await waitFor(() => {
        expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage being unavailable gracefully', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      
      renderComponent();
      
      vi.advanceTimersByTime(600);
      
      await waitFor(() => {
        expect(screen.getByText('Accept All')).toBeInTheDocument();
      });
      
      const acceptButton = screen.getByText('Accept All');
      
      // Should not throw error
      expect(() => fireEvent.click(acceptButton)).not.toThrow();
      
      // Restore localStorage
      localStorage.setItem = originalSetItem;
    });

    it('should handle null authentication status', () => {
      mocks.isAuthenticated.mockReturnValue(null);
      mockLocation.pathname = '/urologist/dashboard';
      
      const { container } = renderComponent();
      
      vi.advanceTimersByTime(600);
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should handle undefined authentication status', () => {
      mocks.isAuthenticated.mockReturnValue(undefined);
      mockLocation.pathname = '/urologist/dashboard';
      
      const { container } = renderComponent();
      
      vi.advanceTimersByTime(600);
      
      expect(container.querySelector('.fixed.bottom-0')).not.toBeInTheDocument();
    });

    it('should handle empty localStorage consent value', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      localStorage.setItem('cookieConsent', '');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
    });
  });

  describe('Timing and Delays', () => {
    it('should show banner after 500ms delay', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      // Should not be visible immediately
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
      
      // Advance by less than 500ms
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
      
      // Advance to 500ms
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
    });
  });

  describe('Button Interactions', () => {
    it('should have all required buttons visible', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Accept All')).toBeInTheDocument();
        expect(screen.getByText('Decline')).toBeInTheDocument();
        expect(screen.getByLabelText('Close')).toBeInTheDocument();
        expect(screen.getByText('Learn more')).toBeInTheDocument();
      });
    });

    it('should have correct button styles and classes', async () => {
      mocks.isAuthenticated.mockReturnValue(true);
      mockLocation.pathname = '/urologist/dashboard';
      sessionStorage.setItem('showCookieBanner', 'true');
      
      renderComponent();
      
      act(() => {
        vi.advanceTimersByTime(600);
      });
      
      await waitFor(() => {
        const acceptButton = screen.getByText('Accept All');
        const declineButton = screen.getByText('Decline');
        
        expect(acceptButton).toHaveClass('bg-teal-600');
        expect(declineButton).toHaveClass('border-gray-300');
      });
    });
  });
});
