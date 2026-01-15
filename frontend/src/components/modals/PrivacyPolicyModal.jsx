import React from 'react';
import { createPortal } from 'react-dom';
import { X, Shield } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * PrivacyPolicyModal - Modal component displaying Privacy Policy
 */
const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby="privacy-modal-title"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-teal-50 to-white">
          <div className="flex items-center" id="privacy-modal-title">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-teal-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Privacy Policy
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose max-w-none">
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Introduction</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                AhimsaGlobal ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Urology Care System.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">2. Information We Collect</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>Personal identification information (name, email address, phone number)</li>
                <li>Medical information and health records</li>
                <li>Account credentials and authentication information</li>
                <li>Usage data and system interactions</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">3. How We Use Your Information</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and manage patient care</li>
                <li>Send administrative information and updates</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Comply with legal obligations and regulatory requirements</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">4. Data Security</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and audits</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">5. HIPAA and GDPR Compliance</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We are committed to compliance with the Health Insurance Portability and Accountability Act (HIPAA) and the General Data Protection Regulation (GDPR). We maintain appropriate safeguards to protect health information and personal data.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">6. Data Sharing and Disclosure</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We do not sell your personal information. We may share your information only:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and safety</li>
                <li>With authorized healthcare providers involved in your care</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Your Rights</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You have the right to:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal requirements)</li>
                <li>Object to processing of your data</li>
                <li>Request data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Data Retention</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">9. Changes to This Privacy Policy</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">10. Contact Us</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Email: privacy@ahimsaglobal.com<br />
                Address: AhimsaGlobal, [Address]
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 rounded-b-xl flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-teal-600 text-white px-6 py-2 text-sm rounded-lg hover:bg-teal-700 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

PrivacyPolicyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default PrivacyPolicyModal;
