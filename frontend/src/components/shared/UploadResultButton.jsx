import React from 'react';
import { Plus, Upload } from 'lucide-react';
import PropTypes from 'prop-types';
import { isPSATest } from '../../utils/investigationRequestHelpers';

/**
 * Shared component for rendering upload result button
 * Reduces duplication between UrologistPatientDetailsModal and NursePatientDetailsModal
 */
const UploadResultButton = ({ request, investigationName, onUploadClick }) => {
  const isNotRequired = (request.status || '').toLowerCase() === 'not_required';
  if (isNotRequired) {
    return null;
  }

  const isPSA = isPSATest(investigationName);

  return (
    <button
      onClick={onUploadClick}
      className="px-2.5 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-md hover:bg-teal-700 transition-colors flex items-center gap-1.5"
    >
      {isPSA ? (
        <>
          <Plus className="w-3.5 h-3.5" />
          Add Value
        </>
      ) : (
        <>
          <Upload className="w-3.5 h-3.5" />
          Upload {investigationName} Result
        </>
      )}
    </button>
  );
};

UploadResultButton.propTypes = {
  request: PropTypes.object.isRequired,
  investigationName: PropTypes.string.isRequired,
  onUploadClick: PropTypes.func.isRequired
};

export default UploadResultButton;

