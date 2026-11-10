/**
 * @file PreAssessmentIntro.jsx
 * @description Educational assessment instruction page with confirmation modal.
 * Prepares the student and initializes the diagnostic pre-assessment.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { startPreAssessment } from '../api/assessmentApi';

export default function PreAssessmentIntro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const assessmentMeta = {
    title: 'Diagnostic Pre-Assessment',
    subtitle: 'Competency Evaluation & Initial Ability Calibration',
    questionCount: 10,
    durationMinutes: 15,
    topics: ['Algebra', 'Geometry', 'Arithmetic', 'Trigonometry', 'Statistics'],
    instructions: [
      { icon: '🎯', text: 'Read each question carefully and select the single best answer option.' },
      { icon: '🔄', text: 'You can freely navigate back and forth between questions before submitting.' },
      { icon: '💾', text: 'Your selected answers are securely auto-saved in real time to the server.' },
      { icon: '⏱️', text: 'The 15-minute timer is server-enforced and will auto-submit when time expires.' },
      { icon: '📈', text: 'Your score establishes your starting baseline tier in the Computer Adaptive Testing engine.' },
    ],
  };

  const handleConfirmStart = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError('');

    try {
      const data = await startPreAssessment(assessmentMeta.questionCount);
      navigate(`/module1/pre-assessment/${data.attemptId}`, {
        state: {
          questions: data.questions,
          attemptId: data.attemptId,
          totalQuestions: data.totalQuestions,
          durationMinutes: data.durationMinutes || 15,
          startedAt: data.startedAt,
        },
      });
    } catch (e) {
      setError(
        e.response?.data?.error || 'Unable to start assessment. Please ensure you are logged in.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/module1/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            ← Back to Student Dashboard
          </Link>
          <span className="text-xs text-slate-400 font-semibold">PARAKH Module 1</span>
        </div>

        {/* Header Hero Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest px-3.5 py-1 rounded-full mb-3">
            <span>📝</span> Diagnostic Baseline
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {assessmentMeta.title}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {assessmentMeta.subtitle}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-semibold block">Questions</span>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">
                {assessmentMeta.questionCount} MCQs
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-semibold block">Total Duration</span>
              <span className="text-lg font-black text-indigo-600 mt-0.5 block">
                {assessmentMeta.durationMinutes} Minutes
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-semibold block">Navigation</span>
              <span className="text-lg font-black text-slate-800 mt-0.5 block">
                Unrestricted
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-semibold block">Difficulty</span>
              <span className="text-lg font-black text-amber-600 mt-0.5 block">
                Tier 1 - 3 Mix
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold text-sm">✕</button>
          </div>
        )}

        {/* Topics Covered Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Topics Covered
          </h2>
          <div className="flex flex-wrap gap-2">
            {assessmentMeta.topics.map((topic) => (
              <span
                key={topic}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {topic}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Standardized questions curated directly from the verified question bank to assess core foundation areas.
          </p>
        </div>

        {/* Assessment Instructions */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Important Instructions
          </h2>
          <div className="space-y-3">
            {assessmentMeta.instructions.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                <span className="text-base select-none shrink-0">{item.icon}</span>
                <span className="leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={loading}
            className="btn-primary w-full py-4 text-base font-bold shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Preparing Assessment…</span>
              </>
            ) : (
              <span>Begin Pre-Assessment →</span>
            )}
          </button>
        </div>

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 font-bold text-2xl flex items-center justify-center mx-auto">
              ⏱️
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                Ready to Start the Assessment?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                The <strong>15-minute countdown timer</strong> will commence immediately upon confirmation.
                Make sure you are ready with uninterrupted focus.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">Total Questions:</span>
                <span className="font-bold text-slate-800">10 MCQs</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time Allocated:</span>
                <span className="font-bold text-slate-800">15 Minutes</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStart}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all"
              >
                Yes, Start Now →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
