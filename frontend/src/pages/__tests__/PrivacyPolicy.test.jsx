import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPolicy from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('should render privacy policy page', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('should display last updated date', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it('should display all main sections', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText('1. Introduction')).toBeInTheDocument();
    expect(screen.getByText('2. Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('3. How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('4. Data Security')).toBeInTheDocument();
    expect(screen.getByText('5. HIPAA and GDPR Compliance')).toBeInTheDocument();
    expect(screen.getByText('6. Data Sharing and Disclosure')).toBeInTheDocument();
    expect(screen.getByText('7. Your Rights')).toBeInTheDocument();
    expect(screen.getByText('8. Data Retention')).toBeInTheDocument();
  });

  it('should display information collection list', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/personal identification information/i)).toBeInTheDocument();
    expect(screen.getByText(/medical information/i)).toBeInTheDocument();
  });

  it('should display user rights', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByText(/access your personal information/i)).toBeInTheDocument();
    expect(screen.getByText(/request correction/i)).toBeInTheDocument();
    expect(screen.getByText(/request deletion/i)).toBeInTheDocument();
  });
});
