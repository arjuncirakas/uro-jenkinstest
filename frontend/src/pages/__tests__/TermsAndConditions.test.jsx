import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TermsAndConditions from '../TermsAndConditions';

describe('TermsAndConditions', () => {
  it('should render terms and conditions page', () => {
    render(<TermsAndConditions />);
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
  });

  it('should display last updated date', () => {
    render(<TermsAndConditions />);
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it('should display all main sections', () => {
    render(<TermsAndConditions />);
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
    expect(screen.getByText('2. Use License')).toBeInTheDocument();
    expect(screen.getByText('3. Medical Disclaimer')).toBeInTheDocument();
    expect(screen.getByText('4. User Responsibilities')).toBeInTheDocument();
    expect(screen.getByText('5. Privacy and Data Protection')).toBeInTheDocument();
    expect(screen.getByText('6. Limitation of Liability')).toBeInTheDocument();
    expect(screen.getByText('7. Revisions and Errata')).toBeInTheDocument();
    expect(screen.getByText('8. Contact Information')).toBeInTheDocument();
  });

  it('should display use license restrictions', () => {
    render(<TermsAndConditions />);
    expect(screen.getByText(/modify or copy the materials/i)).toBeInTheDocument();
  });

  it('should display medical disclaimer', () => {
    render(<TermsAndConditions />);
    expect(screen.getByText(/not intended to be a substitute for professional medical advice/i)).toBeInTheDocument();
  });

  it('should display contact information', () => {
    render(<TermsAndConditions />);
    expect(screen.getByText(/support@ahimsaglobal.com/i)).toBeInTheDocument();
  });
});
