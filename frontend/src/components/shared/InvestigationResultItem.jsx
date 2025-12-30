import React from 'react';
import PropTypes from 'prop-types';

/**
 * Shared component for rendering individual investigation result items
 * Reduces duplication between UrologistPatientDetailsModal and NursePatientDetailsModal
 */
const InvestigationResultItem = ({ result, index, totalResults }) => {
  const resultDate = result.date ? new Date(result.date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : 'N/A';

  const getStatusClassName = (status) => {
    if (!status) return '';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'normal') return 'bg-green-100 text-green-700';
    if (lowerStatus === 'high' || lowerStatus === 'elevated') return 'bg-red-100 text-red-700';
    if (lowerStatus === 'intermediate') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="bg-white rounded-md p-3 border border-gray-200 w-full max-w-full box-border">
      <div className="flex items-start justify-between mb-2 w-full">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-gray-600">Result #{totalResults - index}</span>
          {result.status && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusClassName(result.status)}`}>
              {result.status}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 w-full">
        <div className="text-xs text-gray-600">
          <span className="font-medium">Date: </span>
          <span className="text-gray-900">{resultDate}</span>
        </div>

        {result.authorName && (
          <div className="text-xs text-gray-600">
            <span className="font-medium">Added by: </span>
            <span className="text-gray-900">{result.authorName}</span>
            {result.authorRole && (
              <span className="text-gray-500"> ({result.authorRole})</span>
            )}
          </div>
        )}

        {result.result && (
          <div className="text-sm text-gray-700">
            <span className="font-medium text-gray-600">Result Value: </span>
            <span className="text-lg font-semibold text-gray-900">{result.result}</span>
          </div>
        )}

        {result.referenceRange && result.referenceRange !== 'N/A' ? (
          <div className="text-xs text-gray-600">
            <span className="font-medium">Reference Range: </span>
            <span className="text-gray-900">{result.referenceRange}</span>
          </div>
        ) : null}

        {result.notes && (
          <div className="text-xs text-gray-600 pt-1 border-t border-gray-100">
            <span className="font-medium">Notes: </span>
            <span className="text-gray-900">{result.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};

InvestigationResultItem.propTypes = {
  result: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  totalResults: PropTypes.number.isRequired
};

export default InvestigationResultItem;

