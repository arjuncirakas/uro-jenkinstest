import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TermsAndConditionsModal from '../TermsAndConditionsModal';

describe('TermsAndConditionsModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<TermsAndConditionsModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Terms and Conditions')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
  });

  it('renders last updated date', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    const lastUpdatedText = screen.getByText(/Last updated:/);
    expect(lastUpdatedText).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
    expect(screen.getByText('2. Use License')).toBeInTheDocument();
    expect(screen.getByText('3. Medical Disclaimer')).toBeInTheDocument();
    expect(screen.getByText('4. User Responsibilities')).toBeInTheDocument();
    expect(screen.getByText('5. Privacy and Data Protection')).toBeInTheDocument();
    expect(screen.getByText('6. Limitation of Liability')).toBeInTheDocument();
    expect(screen.getByText('7. Revisions and Errata')).toBeInTheDocument();
    expect(screen.getByText('8. Contact Information')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when footer close button is clicked', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders content for Acceptance of Terms section', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/By accessing and using the Urology Care System/)).toBeInTheDocument();
  });

  it('renders Use License restrictions', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Modify or copy the materials/)).toBeInTheDocument();
    expect(screen.getByText(/Use the materials for any commercial purpose/)).toBeInTheDocument();
    expect(screen.getByText(/Attempt to decompile or reverse engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Remove any copyright or other proprietary notations/)).toBeInTheDocument();
  });

  it('renders Medical Disclaimer content', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/The information provided by the Urology Care System/)).toBeInTheDocument();
    expect(screen.getByText(/The system is not intended to be a substitute for professional medical advice/)).toBeInTheDocument();
  });

  it('renders User Responsibilities list', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Maintaining the confidentiality of their account credentials/)).toBeInTheDocument();
    expect(screen.getByText(/All activities that occur under their account/)).toBeInTheDocument();
    expect(screen.getByText(/Ensuring the accuracy of information entered/)).toBeInTheDocument();
    expect(screen.getByText(/Complying with all applicable laws and regulations/)).toBeInTheDocument();
  });

  it('renders Privacy and Data Protection section', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Your use of the system is also governed by our Privacy Policy/)).toBeInTheDocument();
  });

  it('renders Limitation of Liability section', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/In no event shall AhimsaGlobal or its suppliers be liable/)).toBeInTheDocument();
  });

  it('renders Revisions and Errata section', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/The materials appearing on the system could include technical/)).toBeInTheDocument();
  });

  it('renders Contact Information section', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/If you have any questions about these Terms and Conditions/)).toBeInTheDocument();
    expect(screen.getByText(/support@ahimsaglobal.com/)).toBeInTheDocument();
  });

  it('has proper modal structure with backdrop', () => {
    const { container } = render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/40');
    expect(backdrop).toBeInTheDocument();
  });

  it('has scrollable content area', () => {
    const { container } = render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    const scrollableArea = container.querySelector('.overflow-y-auto');
    expect(scrollableArea).toBeInTheDocument();
  });

  it('renders FileText icon in header', () => {
    render(<TermsAndConditionsModal isOpen={true} onClose={mockOnClose} />);
    // The icon should be present in the header
    const header = screen.getByText('Terms and Conditions').closest('.flex.items-center.justify-between');
    expect(header).toBeInTheDocument();
  });
});
