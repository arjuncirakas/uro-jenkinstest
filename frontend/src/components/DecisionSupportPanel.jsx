import React, { useState, useEffect } from 'react';
import { Lightbulb, AlertCircle, CheckCircle, TrendingUp, BookOpen, Clock, Activity, ChevronRight } from 'lucide-react';
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

  const getPriorityStyles = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return {
          badge: 'bg-rose-50 text-rose-700 border border-rose-200',
          accent: 'bg-rose-500'
        };
      case 'medium':
        return {
          badge: 'bg-amber-50 text-amber-700 border border-amber-200',
          accent: 'bg-amber-500'
        };
      case 'low':
        return {
          badge: 'bg-sky-50 text-sky-700 border border-sky-200',
          accent: 'bg-sky-500'
        };
      default:
        return {
          badge: 'bg-slate-50 text-slate-600 border border-slate-200',
          accent: 'bg-slate-400'
        };
    }
  };

  const getEvidenceLevelStyles = (level) => {
    switch (level) {
      case 'A':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'B':
        return 'bg-sky-50 text-sky-700 border border-sky-200';
      case 'C':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-200';
    }
  };

  const getRiskScoreColor = (score) => {
    if (score <= 3) return { text: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Low' };
    if (score <= 6) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'Medium' };
    return { text: 'text-rose-600', bg: 'bg-rose-500', label: 'High' };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-slate-200"></div>
            <div className="absolute top-0 left-0 h-10 w-10 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-sm text-slate-500">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-5 bg-rose-50/50 rounded-xl border border-rose-100">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-rose-800">Unable to Load</h4>
              <p className="text-sm text-rose-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Risk Score Card */}
      {riskScore && (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-teal-50/30"></div>

          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                  <Activity className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Risk Assessment</p>
                  <p className="text-xl font-semibold text-slate-900 mt-0.5">{riskScore.category}</p>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-1">Risk Score</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${getRiskScoreColor(riskScore.score).text}`}>
                      {riskScore.score}
                    </span>
                    <span className="text-sm text-slate-400">/10</span>
                  </div>
                </div>

                {/* Visual Score Indicator */}
                <div className="flex flex-col gap-0.5">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${9 - i < riskScore.score
                        ? getRiskScoreColor(riskScore.score).bg
                        : 'bg-slate-200'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 rounded-lg">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Recommendations</h3>
            {recommendations.length > 0 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                {recommendations.length}
              </span>
            )}
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="py-10 px-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
            <div className="p-3 bg-white rounded-full border border-slate-200 w-fit mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No recommendations</p>
            <p className="text-xs text-slate-400 mt-1">All clinical indicators are within normal range</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, index) => {
              const priorityStyles = getPriorityStyles(rec.priority);

              return (
                <div
                  key={rec.id || index}
                  className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50/50"
                >
                  {/* Header with badges */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${priorityStyles.badge}`}>
                        {(rec.priority || 'Medium').charAt(0).toUpperCase() + (rec.priority || 'medium').slice(1).toLowerCase()} Priority
                      </span>
                      {rec.evidenceLevel && (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getEvidenceLevelStyles(rec.evidenceLevel)}`}>
                          Level {rec.evidenceLevel}
                        </span>
                      )}
                    </div>
                    {rec.type && (
                      <span className="text-xs text-slate-400 font-medium capitalize">
                        {rec.type}
                      </span>
                    )}
                  </div>

                  {/* Recommendation text */}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {rec.text || rec.recommendation_text}
                  </p>

                  {/* Action item - simple inline style */}
                  {rec.action && (
                    <div className="flex items-center gap-1.5 mt-2.5 text-teal-600">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">Action: {rec.action}</span>
                    </div>
                  )}

                  {/* Guideline reference */}
                  {rec.guidelineReference && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                      <BookOpen className="h-3 w-3" />
                      <span>{rec.guidelineReference}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionSupportPanel;






