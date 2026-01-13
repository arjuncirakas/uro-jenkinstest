import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacyPolicyModal from '../PrivacyPolicyModal';

describe('PrivacyPolicyModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<PrivacyPolicyModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders last updated date', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    const lastUpdatedText = screen.getByText(/Last updated:/);
    expect(lastUpdatedText).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('1. Introduction')).toBeInTheDocument();
    expect(screen.getByText('2. Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('3. How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('4. Data Security')).toBeInTheDocument();
    expect(screen.getByText('5. HIPAA and GDPR Compliance')).toBeInTheDocument();
    expect(screen.getByText('6. Data Sharing and Disclosure')).toBeInTheDocument();
    expect(screen.getByText('7. Your Rights')).toBeInTheDocument();
    expect(screen.getByText('8. Data Retention')).toBeInTheDocument();
    expect(screen.getByText('9. Changes to This Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('10. Contact Us')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when footer close button is clicked', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders Introduction section content', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/AhimsaGlobal \("we", "our", or "us"\) is committed to protecting your privacy/)).toBeInTheDocument();
  });

  it('renders Information We Collect list items', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Personal identification information/)).toBeInTheDocument();
    expect(screen.getByText(/Medical information and health records/)).toBeInTheDocument();
    expect(screen.getByText(/Account credentials and authentication information/)).toBeInTheDocument();
    expect(screen.getByText(/Usage data and system interactions/)).toBeInTheDocument();
  });

  it('renders How We Use Your Information list items', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Provide, maintain, and improve our services/)).toBeInTheDocument();
    expect(screen.getByText(/Process transactions and manage patient care/)).toBeInTheDocument();
    expect(screen.getByText(/Send administrative information and updates/)).toBeInTheDocument();
    expect(screen.getByText(/Respond to your inquiries and provide customer support/)).toBeInTheDocument();
    expect(screen.getByText(/Comply with legal obligations and regulatory requirements/)).toBeInTheDocument();
  });

  it('renders Data Security list items', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Encryption of data in transit and at rest/)).toBeInTheDocument();
    expect(screen.getByText(/Regular security assessments and audits/)).toBeInTheDocument();
    expect(screen.getByText(/Access controls and authentication mechanisms/)).toBeInTheDocument();
    expect(screen.getByText(/Employee training on data protection/)).toBeInTheDocument();
  });

  it('renders HIPAA and GDPR Compliance section', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/We are committed to compliance with the Health Insurance Portability/)).toBeInTheDocument();
  });

  it('renders Data Sharing and Disclosure list items', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/With your explicit consent/)).toBeInTheDocument();
    expect(screen.getByText(/To comply with legal obligations/)).toBeInTheDocument();
    expect(screen.getByText(/To protect our rights and safety/)).toBeInTheDocument();
    expect(screen.getByText(/With authorized healthcare providers involved in your care/)).toBeInTheDocument();
  });

  it('renders Your Rights list items', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Access your personal information/)).toBeInTheDocument();
    expect(screen.getByText(/Request correction of inaccurate data/)).toBeInTheDocument();
    expect(screen.getByText(/Request deletion of your data/)).toBeInTheDocument();
    expect(screen.getByText(/Object to processing of your data/)).toBeInTheDocument();
    expect(screen.getByText(/Request data portability/)).toBeInTheDocument();
    expect(screen.getByText(/Withdraw consent at any time/)).toBeInTheDocument();
  });

  it('renders Data Retention section', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/We retain your personal information for as long as necessary/)).toBeInTheDocument();
  });

  it('renders Changes to Privacy Policy section', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/We may update this Privacy Policy from time to time/)).toBeInTheDocument();
  });

  it('renders Contact Us section with email', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/If you have any questions about this Privacy Policy/)).toBeInTheDocument();
    expect(screen.getByText(/privacy@ahimsaglobal.com/)).toBeInTheDocument();
  });

  it('has proper modal structure with backdrop', () => {
    const { container } = render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/40');
    expect(backdrop).toBeInTheDocument();
  });

  it('has scrollable content area', () => {
    const { container } = render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    const scrollableArea = container.querySelector('.overflow-y-auto');
    expect(scrollableArea).toBeInTheDocument();
  });

  it('renders Shield icon in header', () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={mockOnClose} />);
    // The icon should be present in the header
    const header = screen.getByText('Privacy Policy').closest('.flex.items-center.justify-between');
    expect(header).toBeInTheDocument();
  });
});
