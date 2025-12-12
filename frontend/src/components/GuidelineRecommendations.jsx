import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { guidelineService } from '../services/guidelineService';

/**
 * Guideline Recommendations Component
 * Displays applicable guidelines and compliance status for a patient
 */
const GuidelineRecommendations = ({ patientId }) => {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const fetchGuidelines = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await guidelineService.getPatientGuidelines(patientId);
        if (result.success) {
          setGuidelines(result.data || []);
        } else {
          setError(result.error || 'Failed to load guidelines');
        }
      } catch (err) {
        console.error('Error fetching guidelines:', err);
        setError('Failed to load guidelines');
      } finally {
        setLoading(false);
      }
    };

    fetchGuidelines();
  }, [patientId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (guidelines.length === 0) {
    return (
      <div className="p-6">
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
          <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No applicable guidelines found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Applicable Guidelines</h3>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          {guidelines.length}
        </span>
      </div>

      <div className="space-y-3">
        {guidelines.map((guideline) => (
          <div
            key={guideline.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">{guideline.name}</h4>
                {guideline.version && (
                  <p className="text-xs text-gray-500 mt-1">Version {guideline.version}</p>
                )}
              </div>
              {guideline.evidenceLevel && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                  Level {guideline.evidenceLevel}
                </span>
              )}
            </div>

            {guideline.category && (
              <div className="mb-2">
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {guideline.category}
                </span>
              </div>
            )}

            {guideline.recommendations && typeof guideline.recommendations === 'object' && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-1">Recommendations:</p>
                {Array.isArray(guideline.recommendations) ? (
                  <ul className="space-y-1">
                    {guideline.recommendations.map((rec, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start">
                        <CheckCircle className="h-3 w-3 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-600">{JSON.stringify(guideline.recommendations)}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuidelineRecommendations;




