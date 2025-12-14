import React, { useState, useEffect } from 'react';
import { Lightbulb, AlertCircle, CheckCircle, TrendingUp, BookOpen, Clock } from 'lucide-react';
import { decisionSupportService } from '../services/decisionSupportService';

/**
 * Decision Support Panel Component
 * Displays guideline-based recommendations for a patient
 */
const DecisionSupportPanel = ({ patientId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [riskScore, setRiskScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await decisionSupportService.getRecommendations(patientId);
        if (result.success) {
          setRecommendations(result.data.recommendations || []);
          setRiskScore(result.data.riskScore);
        } else {
          setError(result.error || 'Failed to load recommendations');
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [patientId]);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEvidenceLevelColor = (level) => {
    switch (level) {
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      {/* Risk Score */}
      {riskScore && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-sm font-medium text-gray-700">Risk Assessment</h3>
                <p className="text-2xl font-bold text-gray-900">{riskScore.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Risk Score</p>
              <p className="text-xl font-semibold text-blue-600">{riskScore.score}/10</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
          {recommendations.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {recommendations.length}
            </span>
          )}
        </div>

        {recommendations.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recommendations at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={rec.id || index}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(rec.priority)}`}>
                      {rec.priority || 'Medium'} Priority
                    </span>
                    {rec.evidenceLevel && (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getEvidenceLevelColor(rec.evidenceLevel)}`}>
                        Level {rec.evidenceLevel}
                      </span>
                    )}
                  </div>
                  {rec.type && (
                    <span className="text-xs text-gray-500 capitalize">{rec.type}</span>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-3">{rec.text || rec.recommendation_text}</p>

                {rec.action && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Action: {rec.action}</span>
                  </div>
                )}

                {rec.guidelineReference && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center space-x-2 text-xs text-gray-500">
                    <BookOpen className="h-3 w-3" />
                    <span>{rec.guidelineReference}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionSupportPanel;






