import React from 'react';
import { Eye } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Shared component for rendering individual investigation result items
 * Reduces duplication between UrologistPatientDetailsModal and NursePatientDetailsModal
 */
const InvestigationResultItem = ({ result, index, totalResults, onViewFile }) => {
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

  const handleViewFileClick = () => {
    if (!result.filePath) return;
    const fileUrl = result.filePath.startsWith('http')
      ? result.filePath
      : `${import.meta.env.VITE_API_URL || 'https://uroprep.ahimsa.global/api'}/investigations/files/${result.filePath}`;
    if (onViewFile) {
      onViewFile(fileUrl);
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-md p-3 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Result #{totalResults - index}</span>
          {result.status && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusClassName(result.status)}`}>
              {result.status}
            </span>
          )}
        </div>
        {result.filePath && onViewFile ? (
          <button
            onClick={handleViewFileClick}
            className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
            title="View file"
          >
            <Eye className="w-3 h-3" />
            View File
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5">
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
  totalResults: PropTypes.number.isRequired,
  onViewFile: PropTypes.func
};

export default InvestigationResultItem;

