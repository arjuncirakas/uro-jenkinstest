import React from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * TermsAndConditionsModal - Modal component displaying Terms and Conditions
 */
const TermsAndConditionsModal = ({ isOpen, onClose }) => {
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
      aria-labelledby="terms-modal-title"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-teal-50 to-white">
          <div className="flex items-center" id="terms-modal-title">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-teal-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Terms and Conditions
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
              <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Acceptance of Terms</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                By accessing and using the Urology Care System, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">2. Use License</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Permission is granted to temporarily use the Urology Care System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software contained in the system</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Medical Disclaimer</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                The information provided by the Urology Care System is for general informational purposes only. All information is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability or completeness of any information.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                The system is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">4. User Responsibilities</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Users are responsible for:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>Maintaining the confidentiality of their account credentials</li>
                <li>All activities that occur under their account</li>
                <li>Ensuring the accuracy of information entered into the system</li>
                <li>Complying with all applicable laws and regulations</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">5. Privacy and Data Protection</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Your use of the system is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices regarding the collection and use of your information.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">6. Limitation of Liability</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                In no event shall AhimsaGlobal or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the system, even if AhimsaGlobal or an authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Revisions and Errata</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                The materials appearing on the system could include technical, typographical, or photographic errors. AhimsaGlobal does not warrant that any of the materials on its system are accurate, complete, or current. AhimsaGlobal may make changes to the materials contained on its system at any time without notice.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Contact Information</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                If you have any questions about these Terms and Conditions, please contact us at support@ahimsaglobal.com.
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

TermsAndConditionsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default TermsAndConditionsModal;
