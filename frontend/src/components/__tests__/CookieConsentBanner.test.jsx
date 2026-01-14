import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CookieConsentBanner from '../CookieConsentBanner';
import tokenService from '../../services/tokenService';

// Mock tokenService
vi.mock('../../services/tokenService', () => ({
  default: {
    isAuthenticated: vi.fn()
  }
}));

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard' })
  };
});

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    tokenService.isAuthenticated.mockReturnValue(true);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should not render when user is not authenticated', () => {
      tokenService.isAuthenticated.mockReturnValue(false);
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });

    it('should not render when user has already consented', () => {
      localStorage.setItem('cookieConsent', 'true');
      sessionStorage.setItem('showCookieBanner', 'true');
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });

    it('should not render when banner flag is not set', () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.removeItem('showCookieBanner');
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });

    it('should render when all conditions are met', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      tokenService.isAuthenticated.mockReturnValue(true);
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
    });

    it('should not render on auth routes', () => {
      const { useLocation } = await import('react-router-dom');
      vi.mocked(useLocation).mockReturnValue({ pathname: '/login' });
      
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });
  });

  describe('Accept Action', () => {
    it('should save consent to localStorage when Accept is clicked', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const acceptButton = screen.getByText('Accept All');
        fireEvent.click(acceptButton);
      });
      
      expect(localStorage.getItem('cookieConsent')).toBe('true');
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
    });

    it('should hide banner after accepting', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const acceptButton = screen.getByText('Accept All');
        fireEvent.click(acceptButton);
      });
      
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });
  });

  describe('Decline Action', () => {
    it('should save declined consent to localStorage when Decline is clicked', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const declineButton = screen.getByText('Decline');
        fireEvent.click(declineButton);
      });
      
      expect(localStorage.getItem('cookieConsent')).toBe('declined');
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
    });

    it('should hide banner after declining', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const declineButton = screen.getByText('Decline');
        fireEvent.click(declineButton);
      });
      
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });
  });

  describe('Close Action', () => {
    it('should hide banner when close button is clicked', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);
      });
      
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });
  });

  describe('Privacy Policy Navigation', () => {
    it('should navigate to privacy policy when Learn more is clicked', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const learnMoreButton = screen.getByText('Learn more');
        fireEvent.click(learnMoreButton);
      });
      
      expect(mockNavigate).toHaveBeenCalledWith('/privacy-policy');
      expect(sessionStorage.getItem('showCookieBanner')).toBeNull();
    });

    it('should hide banner when navigating to privacy policy', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const learnMoreButton = screen.getByText('Learn more');
        fireEvent.click(learnMoreButton);
      });
      
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });
  });

  describe('Polling Behavior', () => {
    it('should poll for sessionStorage changes', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.removeItem('showCookieBanner');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      // Set flag after initial render
      vi.advanceTimersByTime(200);
      sessionStorage.setItem('showCookieBanner', 'true');
      
      vi.advanceTimersByTime(200);
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
    });

    it('should stop polling after 5 seconds', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.removeItem('showCookieBanner');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(5000);
      
      // Set flag after polling stopped
      sessionStorage.setItem('showCookieBanner', 'true');
      vi.advanceTimersByTime(200);
      
      // Should not show banner
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });

    it('should stop polling when banner becomes visible', async () => {
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
      
      // Polling should have stopped
      vi.advanceTimersByTime(1000);
      // Banner should still be visible
      expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
    });
  });

  describe('Route Changes', () => {
    it('should hide banner when navigating to auth route', async () => {
      const { useLocation } = await import('react-router-dom');
      const mockLocation = { pathname: '/dashboard' };
      vi.mocked(useLocation).mockReturnValue(mockLocation);
      
      localStorage.removeItem('cookieConsent');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      const { rerender } = render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
      });
      
      // Change to auth route
      vi.mocked(useLocation).mockReturnValue({ pathname: '/login' });
      rerender(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle declined consent', () => {
      localStorage.setItem('cookieConsent', 'declined');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
    });

    it('should handle null localStorage values', () => {
      localStorage.setItem('cookieConsent', 'null');
      sessionStorage.setItem('showCookieBanner', 'true');
      
      render(
        <BrowserRouter>
          <CookieConsentBanner />
        </BrowserRouter>
      );
      
      vi.advanceTimersByTime(300);
      
      // Should still show if consent is not 'true'
      expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
    });
  });
});
