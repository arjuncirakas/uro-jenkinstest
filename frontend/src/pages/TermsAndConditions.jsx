import React from 'react';

/**
 * TermsAndConditions - Terms and Conditions page
 * Displays the terms and conditions for using the Urology Care System
 */
const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms and Conditions</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using the Urology Care System, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Use License</h2>
            <p className="text-gray-700 mb-4">
              Permission is granted to temporarily use the Urology Care System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained in the system</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Medical Disclaimer</h2>
            <p className="text-gray-700 mb-4">
              The information provided by the Urology Care System is for general informational purposes only. All information is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability or completeness of any information.
            </p>
            <p className="text-gray-700 mb-4">
              The system is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. User Responsibilities</h2>
            <p className="text-gray-700 mb-4">
              Users are responsible for:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Maintaining the confidentiality of their account credentials</li>
              <li>All activities that occur under their account</li>
              <li>Ensuring the accuracy of information entered into the system</li>
              <li>Complying with all applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Privacy and Data Protection</h2>
            <p className="text-gray-700 mb-4">
              Your use of the system is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices regarding the collection and use of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              In no event shall AhimsaGlobal or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the system, even if AhimsaGlobal or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Revisions and Errata</h2>
            <p className="text-gray-700 mb-4">
              The materials appearing on the system could include technical, typographical, or photographic errors. AhimsaGlobal does not warrant that any of the materials on its system are accurate, complete, or current. AhimsaGlobal may make changes to the materials contained on its system at any time without notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms and Conditions, please contact us at support@ahimsaglobal.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
