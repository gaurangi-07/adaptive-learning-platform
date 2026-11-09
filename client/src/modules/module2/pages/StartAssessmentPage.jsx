/**
 * @file StartAssessmentPage.jsx
 * @description Landing page to configure and start an adaptive assessment session.
 * Accepts student configuration, connects to Module 1 baseline, and launches the quiz.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdaptiveService } from '../services/adaptiveService';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';

const MOCK_STUDENTS = [
  { studentId: 12, name: 'Aarav Sharma', grade: 'Grade 10', baselineLevel: 2, description: 'Medium baseline (Algebra 70%, Geometry 40%)' },
  { studentId: 25, name: 'Diya Patel', grade: 'Grade 10', baselineLevel: 1, description: 'Low baseline — needs easy questions' },
  { studentId: 42, name: 'Rohan Verma', grade: 'Grade 10', baselineLevel: 3, description: 'High baseline — advanced learner' }
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export default function StartAssessmentPage() {
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState(MOCK_STUDENTS[0]);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await AdaptiveService.startAssessment({
        studentId: selectedStudent.studentId,
        subject: 'Mathematics',
        totalQuestions: questionCount
      });
      const { attemptId } = res.data;
      navigate(`/quiz/${attemptId}`);
    } catch (err) {
      setError(err.message || 'Failed to start assessment. Is the server running?');
      setLoading(false);
    }
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
          {/* Student selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              👤 Select Student Profile
              <span className="text-xs font-normal text-slate-400 ml-2">(Development Mode — Mock Students)</span>
            </label>
            <div className="space-y-2">
              {MOCK_STUDENTS.map((s) => (
                <label
                  key={s.studentId}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedStudent.studentId === s.studentId
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="student"
                    value={s.studentId}
                    checked={selectedStudent.studentId === s.studentId}
                    onChange={() => setSelectedStudent(s)}
                    className="mt-1 accent-indigo-600"
                  />
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{s.name}
                      <span className="text-xs text-slate-400 font-normal ml-2">ID #{s.studentId} · {s.grade}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                  </div>
                </label>
              ))}
            </div>
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

          {/* Start button */}
          <button
            type="button"
            onClick={handleStart}
            disabled={loading}
            className="btn-primary w-full text-base py-4"
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

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          Module 2 · Adaptive Testing System · PARAKH Project · © 2026
        </p>
      </div>
    </div>
  );
}
