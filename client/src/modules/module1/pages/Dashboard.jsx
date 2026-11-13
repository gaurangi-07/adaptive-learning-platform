/**
 * @file Dashboard.jsx
 * @description Modern Student Dashboard for PARAKH Adaptive Learning Platform.
 * Displays diagnostic baseline scores, strong & weak topics, and starting CAT tier.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { fetchDashboard } from '../api/profileApi';
import { logout, getCurrentStudent } from '../api/authApi';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [completedNotice, setCompletedNotice] = useState(Boolean(location.state?.assessmentCompleted));

  const localStudent = getCurrentStudent();

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetchDashboard();
        if (resp.success) {
          setData(resp.data);
        } else {
          setError(resp.error || 'Failed to load dashboard.');
        }
      } catch (e) {
        // Fallback to local storage profile if offline or in development
        if (localStudent) {
          setData({
            studentName: localStudent.fullName || 'Student',
            assessmentStatus: 'Ready for Assessment',
            baseline: null,
          });
        } else {
          setError('Session expired. Please log in again.');
          logout();
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading your student dashboard…</p>
        </div>
      </div>
    );
  }

  const studentName = data?.studentName || localStudent?.fullName || 'Student';
  const assessmentStatus = data?.assessmentStatus || 'Not Started';
  const baseline = data?.baseline;

  // Extract topic proficiencies and metadata
  let rawProficiency = baseline?.topicProficiency || null;
  if (typeof rawProficiency === 'string') {
    try {
      rawProficiency = JSON.parse(rawProficiency);
    } catch {
      rawProficiency = null;
    }
  }

  // Filter out non-topic metadata keys
  const metadataKeys = new Set([
    'topicAccuracy',
    'topicScores',
    'strongTopics',
    'weakTopics',
    'unknownTopics',
    'baselineLevel',
    'evaluatedAt',
  ]);

  const topicEntries = rawProficiency
    ? Object.entries(rawProficiency).filter(([k]) => !metadataKeys.has(k))
    : [];

  const strongTopics = rawProficiency?.strongTopics || [];
  const weakTopics = rawProficiency?.weakTopics || [];
  const unknownTopics = rawProficiency?.unknownTopics || [];

  // Determine starting tier
  const baselineLevel = rawProficiency?.baselineLevel || (
    baseline?.overallAccuracy >= 70 ? 3 : baseline?.overallAccuracy < 40 ? 1 : 2
  );

  const tierLabel = baselineLevel === 3
    ? 'Level 3 · Hard / Advanced'
    : baselineLevel === 1
    ? 'Level 1 · Easy / Novice'
    : 'Level 2 · Medium / Intermediate';

  const tierBadgeClass = baselineLevel === 3
    ? 'bg-purple-100 text-purple-800 border-purple-300'
    : baselineLevel === 1
    ? 'bg-blue-100 text-blue-800 border-blue-300'
    : 'bg-amber-100 text-amber-800 border-amber-300';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Navigation Bar */}
        <header className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-indigo-200">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-lg">PARAKH</span>
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  Student Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Welcome back, {studentName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/module1/profile"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              👤 My Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
            >
              🚪 Sign Out
            </button>
          </div>
        </header>

        {completedNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎉</span>
              <span>Pre-Assessment completed! Your baseline knowledge profile, topic accuracies, and starting CAT tier have been computed.</span>
            </div>
            <button
              type="button"
              onClick={() => setCompletedNotice(false)}
              className="text-emerald-500 hover:text-emerald-800 font-bold ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-600/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider backdrop-blur-sm">
              Session Active
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">Ready to test your ability, {studentName}?</h1>
            <p className="text-indigo-100 text-xs sm:text-sm max-w-lg leading-relaxed">
              Our intelligent Computer Adaptive Testing (CAT) engine presents questions tailored dynamically to your proficiency in real time.
            </p>
          </div>
          <Link
            to="/assessment"
            className="px-6 py-3.5 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm shadow-lg shadow-black/10 transition-all shrink-0 text-center"
          >
            ⚡ Start Adaptive Assessment →
          </Link>
        </div>

        {/* Status & Diagnostic Baseline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Assessment Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnostic Status</p>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                assessmentStatus === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="text-xl font-extrabold text-slate-900">{assessmentStatus}</span>
            </div>
            <p className="text-xs text-slate-500">
              {assessmentStatus === 'Completed'
                ? 'Your baseline knowledge profile is active and calibrating tests.'
                : 'Take the pre-assessment to establish your baseline proficiency.'}
            </p>
            {assessmentStatus !== 'Completed' && (
              <Link
                to="/module1/pre-assessment"
                className="inline-block mt-2 text-xs font-bold text-indigo-600 hover:underline"
              >
                Take Diagnostic Pre-Assessment →
              </Link>
            )}
          </div>

          {/* Overall Accuracy Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Accuracy</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-600">
                {baseline ? `${baseline.overallAccuracy.toFixed(1)}%` : '—'}
              </span>
              {baseline && (
                <span className="text-xs text-slate-400 font-medium">
                  ({baseline.correctAnswers} / {baseline.totalQuestions} correct)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {baseline
                ? `Calculated as (${baseline.correctAnswers} / ${baseline.totalQuestions}) × 100% on pre-assessment.`
                : 'Complete the diagnostic test to compute your baseline accuracy.'}
            </p>
          </div>

          {/* Recommended Starting Tier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starting Tier</p>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tierBadgeClass}`}>
                {tierLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Initial CAT starting difficulty. Dynamically calibrated to your baseline ability score.
            </p>
          </div>
        </div>

        {/* Strong & Weak Topics Identification (Prompt 6) */}
        {baseline && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strong Topics */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 text-lg">💪</span>
                <h3 className="text-sm font-bold text-slate-900">Strong Topics (≥ 70% Accuracy)</h3>
              </div>
              {strongTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {strongTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      ✓ {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No topics currently above 70%. Focus on fundamentals.</p>
              )}
            </div>

            {/* Weak Topics */}
            <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 text-lg">🎯</span>
                <h3 className="text-sm font-bold text-slate-900">Topics to Strengthen (&lt; 50% Accuracy)</h3>
              </div>
              {weakTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {weakTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      ! {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Great work! No weak topics detected below 50%.</p>
              )}
            </div>
          </div>
        )}

        {/* Topic Proficiency Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Topic-Wise Baseline Proficiency</h2>
            <span className="text-xs text-slate-400">Module 1 Diagnostic</span>
          </div>

          {topicEntries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topicEntries.map(([topic, score]) => {
                const isUnknown = score === 'unknown' || score === null || score === undefined;
                const numericScore = typeof score === 'number' ? score : parseFloat(score) || 0;
                const percent = Math.round(numericScore * 100);

                return (
                  <div key={topic} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                      <span className="font-bold text-slate-800">{topic}</span>
                      {isUnknown ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                          Unknown (Unattempted)
                        </span>
                      ) : (
                        <span className="text-indigo-600 font-bold">
                          {percent}% ({numericScore.toFixed(2)} ability)
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isUnknown
                            ? 'bg-slate-300 w-0'
                            : percent >= 70
                            ? 'bg-emerald-500'
                            : percent < 50
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: isUnknown ? '0%' : `${Math.min(100, Math.max(5, percent))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {[
                { name: 'Algebra', score: 70 },
                { name: 'Geometry', score: 65 },
                { name: 'Arithmetic', score: 80 },
              ].map((item) => (
                <div key={item.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{item.name}</span>
                    <span className="text-indigo-600">{item.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launch Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/assessment"
            className="p-5 rounded-2xl bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Adaptive MCQ Assessment</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Take a 10-question computer-adaptive test with dynamic real-time difficulty adjustment.
              </p>
            </div>
          </Link>

          <Link
            to="/module1/pre-assessment"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform">
              📝
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Diagnostic Pre-Assessment</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Calibrate your baseline proficiency scores across core engineering & math topics.
              </p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}
