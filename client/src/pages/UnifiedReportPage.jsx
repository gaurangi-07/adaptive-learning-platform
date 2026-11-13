/**
 * @file UnifiedReportPage.jsx
 * @description Unified Performance Report combining Module 1 (pre-assessment baseline)
 * and Module 2 (adaptive assessment results) into one comprehensive view.
 * No business logic is duplicated — all data comes from existing APIs.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getStudent() {
  try {
    return JSON.parse(localStorage.getItem('studentUser') || 'null');
  } catch {
    return null;
  }
}

export default function UnifiedReportPage() {
  const { adaptiveAttemptId } = useParams();
  const navigate = useNavigate();

  const [adaptiveSummary, setAdaptiveSummary] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const student = getStudent();

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const headers = getAuthHeaders();
        const [adaptiveRes, dashRes] = await Promise.allSettled([
          axios.get(`/api/adaptive/${adaptiveAttemptId}/summary`, { headers }),
          axios.get('/api/student/dashboard', { headers })
        ]);

        if (adaptiveRes.status === 'fulfilled') {
          setAdaptiveSummary(adaptiveRes.value.data?.data);
        }
        if (dashRes.status === 'fulfilled') {
          setDashboardData(dashRes.value.data?.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (adaptiveAttemptId) loadAll();
  }, [adaptiveAttemptId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Generating unified report…</p>
        </div>
      </div>
    );
  }

  const baseline = dashboardData?.baseline;
  const adaptive = adaptiveSummary;

  // Compute topic improvement if both datasets available
  const topicComparison = [];
  if (baseline?.topicProficiency && adaptive?.topicBreakdown) {
    for (const adaptiveTopic of adaptive.topicBreakdown) {
      const topicKey = adaptiveTopic.topic.toLowerCase();
      // Find matching baseline topic (flexible key match)
      const baselineScore = Object.entries(baseline.topicProficiency).find(
        ([k]) => k.toLowerCase() === topicKey || topicKey.includes(k.toLowerCase()) || k.toLowerCase().includes(topicKey)
      );
      topicComparison.push({
        topic: adaptiveTopic.topic,
        baselineScore: baselineScore ? Math.round(Number(baselineScore[1]) * 100) : null,
        finalProficiency: adaptiveTopic.finalProficiency,
        delta: baselineScore
          ? Math.round(adaptiveTopic.finalProficiency - Number(baselineScore[1]) * 100)
          : null,
        masteryStatus: adaptiveTopic.masteryStatus,
        questionsAttempted: adaptiveTopic.questionsAttempted,
        questionsCorrect: adaptiveTopic.questionsCorrect
      });
    }
  }

  const preAccuracy = baseline?.overallAccuracy ?? null;
  const adaptiveAccuracy = adaptive?.accuracyPercentage ?? null;
  const improvementDelta = preAccuracy !== null && adaptiveAccuracy !== null
    ? Math.round((adaptiveAccuracy - preAccuracy) * 10) / 10
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
            <span>📊</span> Unified Performance Report
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">
            {student?.fullName ?? 'Student'} — Full Assessment Journey
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Pre-assessment baseline + Adaptive assessment results combined
          </p>
        </div>

        {error && (
          <div className="card bg-rose-50 border-rose-200 text-rose-700 text-sm p-4">
            ⚠️ {error}
          </div>
        )}

        {/* Accuracy comparison */}
        <div className="card shadow-xl">
          <h2 className="text-base font-bold text-slate-800 mb-4">📈 Overall Accuracy Comparison</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-black text-indigo-600">
                {preAccuracy !== null ? `${preAccuracy}%` : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Pre-Assessment<br />(Baseline)</p>
            </div>
            <div className={`rounded-xl p-4 ${improvementDelta !== null
              ? improvementDelta >= 0 ? 'bg-emerald-50' : 'bg-rose-50'
              : 'bg-slate-50'
            }`}>
              <p className={`text-2xl font-black ${improvementDelta !== null
                ? improvementDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                : 'text-slate-400'
              }`}>
                {improvementDelta !== null
                  ? `${improvementDelta >= 0 ? '+' : ''}${improvementDelta}%`
                  : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Change</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-2xl font-black text-indigo-600">
                {adaptiveAccuracy !== null ? `${adaptiveAccuracy}%` : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Adaptive Test<br />(Final)</p>
            </div>
          </div>
        </div>

        {/* Adaptive assessment quick stats */}
        {adaptive && (
          <div className="card">
            <h2 className="text-base font-bold text-slate-800 mb-4">⚡ Adaptive Assessment Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Questions', value: adaptive.answeredCount },
                { label: 'Correct', value: adaptive.totalCorrect, color: 'text-emerald-600' },
                { label: 'Score', value: `${adaptive.accuracyPercentage}%`, color: 'text-indigo-600' },
                { label: 'Duration', value: `${Math.round(adaptive.durationSeconds / 60)}m ${adaptive.durationSeconds % 60}s` }
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-xl py-3">
                  <p className={`text-xl font-bold ${s.color || 'text-slate-800'}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic-by-topic comparison */}
        {topicComparison.length > 0 && (
          <div className="card">
            <h2 className="text-base font-bold text-slate-800 mb-4">📚 Topic-wise Journey</h2>
            <div className="space-y-3">
              {topicComparison.map((t) => (
                <div key={t.topic} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-sm">{t.topic}</span>
                    <div className="flex items-center gap-2 text-xs">
                      {t.delta !== null && (
                        <span className={`font-bold px-2 py-0.5 rounded-full border ${
                          t.delta >= 0
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-rose-100 text-rose-700 border-rose-200'
                        }`}>
                          {t.delta >= 0 ? '↑' : '↓'} {Math.abs(t.delta)} pts
                        </span>
                      )}
                      <span className="text-slate-400">
                        {t.questionsCorrect}/{t.questionsAttempted} correct
                      </span>
                    </div>
                  </div>
                  {/* Progress bar: baseline → final */}
                  <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                    {t.baselineScore !== null && (
                      <div
                        className="absolute top-0 left-0 h-full bg-indigo-200 rounded-full"
                        style={{ width: `${t.baselineScore}%` }}
                        title={`Baseline: ${t.baselineScore}%`}
                      />
                    )}
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${
                        t.finalProficiency >= 70 ? 'bg-emerald-500' :
                        t.finalProficiency >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${t.finalProficiency}%` }}
                      title={`Final: ${t.finalProficiency}%`}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Baseline: {t.baselineScore !== null ? `${t.baselineScore}%` : 'N/A'}</span>
                    <span>Final: {t.finalProficiency}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-200 inline-block" /> Pre-assessment baseline</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Final proficiency</span>
            </div>
          </div>
        )}

        {/* Focus areas from adaptive */}
        {adaptive?.recommendedFocusAreas?.length > 0 && (
          <div className="card border-amber-200 bg-amber-50">
            <h2 className="text-base font-bold text-amber-800 mb-3">🎯 Recommended Focus Areas</h2>
            <div className="flex flex-wrap gap-2">
              {adaptive.recommendedFocusAreas.map((topic) => (
                <span key={topic} className="bg-amber-100 text-amber-800 border border-amber-300 text-sm font-semibold px-3 py-1 rounded-lg">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/module1/dashboard')}
            className="btn-secondary flex-1"
          >
            ← Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate('/assessment')}
            className="btn-primary flex-1"
          >
            Start New Assessment →
          </button>
          <button
            type="button"
            onClick={() => navigate('/module3/analytics')}
            className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
          >
            📊 Full Analytics
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          PARAKH Adaptive Learning Platform · Unified Report · © 2026
        </p>
      </div>
    </div>
  );
}
