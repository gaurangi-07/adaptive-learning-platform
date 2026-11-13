/**
 * @file StartAssessmentPage.jsx
 * @description Launch page for the adaptive assessment session.
 * Uses the authenticated student's identity and Module 1 baseline proficiency.
 * Integrates Module 1 (auth + baseline) → Module 2 (adaptive engine).
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdaptiveService } from '../services/adaptiveService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

const QUESTION_COUNTS = [5, 10, 15, 20];

export default function StartAssessmentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read authenticated student from Module 1 localStorage
  const [student, setStudent] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load authenticated student identity from Module 1
    try {
      const raw = localStorage.getItem('studentUser');
      const parsed = raw ? JSON.parse(raw) : null;
      setStudent(parsed);
    } catch {
      setStudent(null);
    }

    // Check if baseline was passed via navigation state (from Dashboard)
    if (location.state?.baseline) {
      setBaseline(location.state.baseline);
    }

    setInitLoading(false);
  }, [location.state]);

  async function handleStart() {
    if (!student) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        totalQuestions: questionCount
        // studentId is extracted from JWT on backend — no need to send it
        // baseline (baselineLevel + topicScores) is fetched from DB on backend
      };

      // If we have baseline from navigation state, pass it explicitly
      if (baseline?.baselineLevel && baseline?.topicScores) {
        payload.baselineLevel = baseline.baselineLevel;
        payload.topicScores = baseline.topicScores;
      }

      const res = await AdaptiveService.startAssessment(payload);
      const { attemptId } = res.data;
      navigate(`/quiz/${attemptId}`);
    } catch (err) {
      setError(err.message || 'Failed to start assessment. Is the server running?');
      setLoading(false);
    }
  }

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-slate-600">Please log in to start an assessment.</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full">
              <span>🎓</span> PARAKH Adaptive Learning Platform
            </span>
            <button
              type="button"
              onClick={() => navigate('/module3')}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 transition-all"
            >
              <span>⚙️</span> Teacher Portal (Module 3) →
            </button>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
            Adaptive MCQ Assessment
          </h1>
          <p className="text-slate-500 text-base max-w-md mx-auto">
            Module 2 — An intelligent, adaptive testing system that adjusts question difficulty
            based on your performance in real time.
          </p>
        </div>

        {/* Config card */}
        <div className="card shadow-xl border-slate-100 mb-6">
          {/* Student Identity (from Module 1 auth) */}
          <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
              👤 Authenticated Student
            </p>
            <p className="font-semibold text-slate-900 text-sm">
              {student.fullName}
              <span className="text-xs text-slate-400 font-normal ml-2">
                ID #{student.id} · {student.college || 'College'} · {student.branch || 'Branch'}
              </span>
            </p>
            {baseline && (
              <p className="text-xs text-indigo-600 mt-1">
                ✅ Baseline proficiency loaded from pre-assessment
              </p>
            )}
            {!baseline && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ No pre-assessment baseline found — adaptive engine will use default starting level.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/pre-assessment')}
                  className="underline font-semibold"
                >
                  Take pre-assessment first →
                </button>
              </p>
            )}
          </div>

          {/* Question count */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              📊 Number of Questions
            </label>
            <div className="flex gap-2 flex-wrap">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 min-w-[60px] py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                    questionCount === n
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Info boxes */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: '🧠', label: 'Adaptive AI', desc: 'Difficulty adjusts to your ability' },
              { icon: '⏱️', label: '90s per Q', desc: 'Server-enforced time limit' },
              { icon: '📈', label: 'Instant Feedback', desc: 'Explanation after each answer' }
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <span className="text-2xl block mb-1">{item.icon}</span>
                <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4">
              <ErrorAlert message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/module1/dashboard')}
              className="btn-secondary flex-1"
            >
              ← Dashboard
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className="btn-primary flex-1 text-base py-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Starting Assessment…
                </span>
              ) : (
                <span>Start Adaptive Assessment →</span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          Module 2 · Adaptive Testing System · PARAKH Project · © 2026
        </p>
      </div>
    </div>
  );
}
