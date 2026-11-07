/**
 * @file AssessmentCompletePage.jsx
 * @description Assessment summary and results page displayed upon completion.
 * Shows overall score, topic breakdown, response analytics, and difficulty progression.
 * Produces structured output for Module 3 analytics.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdaptiveService } from '../services/adaptiveService';
import DifficultyBadge from '../components/DifficultyBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { getMasteryConfig, getDifficultyConfig } from '../utils/difficultyUtils';

export default function AssessmentCompletePage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!attemptId) return;
    AdaptiveService.getSummary(attemptId)
      .then((res) => { setSummary(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <LoadingSpinner message="Generating your results…" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <ErrorAlert message={error} onRetry={() => { setError(null); setLoading(true); }} />
          <button type="button" onClick={() => navigate('/')} className="btn-secondary w-full">
            ← New Assessment
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const scorePercent = summary.totalQuestions > 0
    ? Math.round((summary.totalCorrect / summary.totalQuestions) * 100)
    : 0;

  const scoreColor = scorePercent >= 70
    ? 'text-emerald-600' : scorePercent >= 40
    ? 'text-amber-600' : 'text-rose-600';

  const scoreRing = scorePercent >= 70
    ? 'stroke-emerald-400' : scorePercent >= 40
    ? 'stroke-amber-400' : 'stroke-rose-400';

  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference - (scorePercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            <span>🎉</span> Assessment Complete
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Your Results</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {summary.subject} · {summary.answeredCount} questions · {Math.round(summary.durationSeconds / 60)}m {summary.durationSeconds % 60}s
          </p>
        </div>

        {/* Score ring card */}
        <div className="card shadow-xl text-center">
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                className={scoreRing}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="absolute text-center">
              <p className={`text-3xl font-black ${scoreColor}`}>{scorePercent}%</p>
              <p className="text-xs text-slate-400 font-medium">Score</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Correct', value: summary.totalCorrect, suffix: '', color: 'text-emerald-600' },
              { label: 'Accuracy', value: summary.accuracyPercentage, suffix: '%', color: 'text-indigo-600' },
              { label: 'Duration', value: `${Math.round(summary.durationSeconds / 60)}m ${summary.durationSeconds % 60}s`, suffix: '', color: 'text-slate-700' }
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 rounded-xl py-3">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}{stat.suffix}</p>
                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Topic breakdown */}
        {summary.topicBreakdown?.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-slate-800 mb-4">📚 Topic Breakdown</h2>
            <div className="space-y-3">
              {summary.topicBreakdown.map((t) => {
                const mastery = getMasteryConfig(t.masteryStatus);
                const topicPct = t.questionsAttempted > 0
                  ? Math.round((t.questionsCorrect / t.questionsAttempted) * 100)
                  : 0;
                return (
                  <div key={t.topic} className={`p-4 rounded-xl border ${mastery.bgColor} ${mastery.borderColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{mastery.icon}</span>
                        <span className={`font-semibold text-sm ${mastery.textColor}`}>{t.topic}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DifficultyBadge difficulty={t.finalDifficultyLevel} showIcon={false} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${mastery.bgColor} ${mastery.textColor} ${mastery.borderColor}`}>
                          {mastery.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            topicPct >= 70 ? 'bg-emerald-400' : topicPct >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                          }`}
                          style={{ width: `${topicPct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${mastery.textColor}`}>
                        {t.questionsCorrect}/{t.questionsAttempted} ({topicPct}%)
                      </span>
                    </div>
                    {t.deltaProficiency !== 0 && (
                      <p className="text-xs mt-1 text-slate-500">
                        Proficiency {t.deltaProficiency > 0 ? '↑' : '↓'} {Math.abs(t.deltaProficiency).toFixed(1)} pts
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Focus areas */}
        {summary.recommendedFocusAreas?.length > 0 && (
          <div className="card border-amber-200 bg-amber-50">
            <h2 className="text-base font-bold text-amber-800 mb-3">🎯 Recommended Focus Areas</h2>
            <div className="flex flex-wrap gap-2">
              {summary.recommendedFocusAreas.map((topic) => (
                <span key={topic} className="bg-amber-100 text-amber-800 border border-amber-300 text-sm font-semibold px-3 py-1 rounded-lg">
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-3">
              💡 These topics will be prioritized in your next adaptive session and reported to the analytics system.
            </p>
          </div>
        )}

        {/* Response time analytics */}
        {summary.responseTimeAnalytics && (
          <div className="card">
            <h2 className="text-base font-bold text-slate-800 mb-4">⏱️ Response Time Analytics</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: 'Avg. Time', value: `${summary.responseTimeAnalytics.averageResponseTimeSeconds}s` },
                { label: 'Fastest', value: `${summary.responseTimeAnalytics.fastestResponseTimeSeconds}s` },
                { label: 'Slowest', value: `${summary.responseTimeAnalytics.slowestResponseTimeSeconds}s` },
                { label: 'Timed Out', value: summary.responseTimeAnalytics.timedOutQuestionsCount }
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 italic">{summary.responseTimeAnalytics.pacingInsight}</p>
          </div>
        )}

        {/* Module 3 export note */}
        <div className="card border-indigo-200 bg-indigo-50/60">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📤</span>
            <div>
              <p className="text-sm font-semibold text-indigo-800">Data exported for Module 3 Analytics</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Assessment summary has been structured for the AI Analytics & Recommendation engine.
                Attempt ID: <code className="font-mono bg-indigo-100 px-1 rounded">{attemptId}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary flex-1"
          >
            ← New Assessment
          </button>
          <button
            type="button"
            onClick={() => navigate(`/history/${attemptId}`)}
            className="btn-primary flex-1"
          >
            View Full History
          </button>
        </div>
      </div>
    </div>
  );
}

