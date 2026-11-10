/**
 * @file PreAssessmentMCQ.jsx
 * @description Complete pre-assessment MCQ interface with question navigation matrix,
 * real-time answer persistence, countdown timer, and submission confirmation modal.
 */

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import {
  getPreAssessmentAttempt,
  savePreAssessmentResponse,
  finishPreAssessment,
} from '../api/assessmentApi';

export default function PreAssessmentMCQ() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState(location.state?.questions || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timer, setTimer] = useState(location.state?.durationMinutes ? location.state.durationMinutes * 60 : 15 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!location.state?.questions);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Time tracking per question
  const questionStartTimeRef = useRef(Date.now());
  const timerExpiredRef = useRef(false);

  // Load attempt and restore saved responses (supports page refresh)
  useEffect(() => {
    async function loadAttemptData() {
      if (!attemptId) return;

      try {
        const res = await getPreAssessmentAttempt(attemptId);
        if (res.success) {
          setQuestions(res.questions || []);
          if (res.savedResponses) {
            setAnswers(res.savedResponses);
          }
          if (res.attempt?.remainingSeconds !== undefined) {
            setTimer(res.attempt.remainingSeconds);
            if (res.attempt.isExpired) {
              timerExpiredRef.current = true;
            }
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load assessment. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    loadAttemptData();
  }, [attemptId]);

  // Countdown timer effect
  useEffect(() => {
    if (timer <= 0) {
      if (!timerExpiredRef.current) {
        timerExpiredRef.current = true;
        handleAutoSubmit();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!timerExpiredRef.current) {
            timerExpiredRef.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // Reset per-question timing timer when switching questions
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIdx]);

  // Auto-submit when countdown hits zero
  async function handleAutoSubmit() {
    await performSubmit(true);
  }

  // Handle selecting an answer
  async function handleOptionSelect(optionId) {
    if (timerExpiredRef.current || submitting) return;

    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
    const previousTime = answers[currentQ.id]?.responseTimeSec || 0;
    const totalQuestionTime = previousTime + elapsedSeconds;

    const updatedResponse = {
      selectedOption: optionId,
      responseTimeSec: totalQuestionTime,
    };

    // Update local state immediately for seamless UX
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: updatedResponse,
    }));

    // Auto-save to server in background
    try {
      await savePreAssessmentResponse(attemptId, {
        questionId: currentQ.id,
        selectedOption: optionId,
        responseTimeSec: totalQuestionTime,
      });
    } catch (saveErr) {
      console.warn('[PreAssessmentMCQ] Background response save failed:', saveErr.message);
    }
  }

  // Final submission logic
  async function performSubmit(isAuto = false) {
    setSubmitting(true);
    setError('');

    const responsePayload = questions.map((q) => {
      const ans = answers[q.id] || {};
      return {
        questionId: q.id,
        selectedOption: ans.selectedOption || null,
        responseTimeSec: ans.responseTimeSec || 0,
      };
    });

    try {
      await finishPreAssessment(attemptId, responsePayload);
      localStorage.removeItem(`preassessment_${attemptId}`);
      navigate('/module1/dashboard', {
        state: { assessmentCompleted: true, wasAutoSubmitted: isAuto },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit assessment. Please try again.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Restoring your pre-assessment session…</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-4">
          <p className="text-slate-800 font-bold">No questions found for this assessment.</p>
          <Link to="/module1/pre-assessment" className="btn-primary w-full text-xs">
            Start New Assessment
          </Link>
        </div>
      </div>
    );
  }

  const total = questions.length;
  const currentQ = questions[currentIdx];
  const selectedOption = answers[currentQ?.id]?.selectedOption || '';

  // Stats calculation
  const answeredCount = Object.values(answers).filter((a) => a?.selectedOption).length;
  const unansweredCount = total - answeredCount;
  const progressPercent = Math.round((answeredCount / total) * 100);

  // Timer formatting
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgentTimer = timer < 60;
  const isWarningTimer = timer < 180 && !isUrgentTimer;

  // Options normalization (supports options or optionsJson)
  const optionsList = currentQ?.options || currentQ?.optionsJson || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Top Header Bar */}
        <header className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-base">PARAKH Pre-Assessment</span>
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                Diagnostic Test
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Answered: <strong className="text-slate-700">{answeredCount} of {total}</strong> • Remaining: <strong className="text-slate-700">{unansweredCount}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-mono font-bold transition-all shadow-sm ${
                isUrgentTimer
                  ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                  : isWarningTimer
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
              title="Time remaining"
            >
              <span className="text-base">⏱️</span>
              <span>{formattedTime}</span>
            </div>

            {/* Quick Finish Button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5"
            >
              <span>Submit Assessment ✓</span>
            </button>
          </div>
        </header>

        {/* Linear Progress Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>Overall Completion Progress</span>
            <span className="text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold">✕</button>
          </div>
        )}

        {/* Main Content Layout (Grid on Desktop: Question Card + Navigation Matrix) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left Column (2 Cols): Active Question Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">

              {/* Question Metadata Row */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentIdx + 1} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {currentQ.topic || 'General'}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Tier {currentQ.difficulty || 2}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
                  {currentQ.questionText || currentQ.question}
                </h2>
              </div>

              {/* 4 Answer Options */}
              <div className="space-y-3" role="radiogroup" aria-label="Answer Options">
                {optionsList.map((opt) => {
                  const optId = opt.id || opt.optionLabel;
                  const optText = opt.text || opt.optionText;
                  const isSelected = selectedOption === optId;

                  return (
                    <button
                      key={optId}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleOptionSelect(optId)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-200 shadow-sm'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 bg-white'
                      }`}
                    >
                      {/* Option Indicator Badge */}
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {optId}
                      </span>

                      {/* Option Text */}
                      <span
                        className={`text-sm leading-snug flex-1 font-medium ${
                          isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'
                        }`}
                      >
                        {optText}
                      </span>

                      {/* Selection Mark */}
                      {isSelected && (
                        <span className="text-indigo-600 text-base font-bold shrink-0">
                          ●
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)}
                  disabled={currentIdx === 0}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all"
                >
                  ← Previous
                </button>

                <div className="text-xs text-slate-400 font-semibold">
                  {currentIdx + 1} / {total}
                </div>

                {currentIdx < total - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx(currentIdx + 1)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all"
                  >
                    Review & Submit ✓
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Right Column: Question Navigation Matrix */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Question Matrix
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {answeredCount}/{total} Done
                </span>
              </div>

              {/* Numbered 1-10 Grid */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = currentIdx === idx;
                  const isAnswered = Boolean(answers[q.id]?.selectedOption);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-11 rounded-xl font-bold text-xs transition-all flex items-center justify-center relative ${
                        isCurrent
                          ? 'border-2 border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200 font-black'
                          : isAnswered
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                      }`}
                      title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
                    >
                      <span>{idx + 1}</span>
                      {isAnswered && !isCurrent && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 inline-block" />
                  <span>Answered Question</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md border-2 border-indigo-600 bg-indigo-50 inline-block" />
                  <span>Current Question</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-200 inline-block" />
                  <span>Unanswered Question</span>
                </div>
              </div>

              {/* Final Submit Trigger */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={submitting}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Finalize & Submit Test
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal Before Final Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-2xl flex items-center justify-center mx-auto">
              📝
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">
                Confirm Assessment Submission
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please review your progress before submitting your pre-assessment.
              </p>
            </div>

            {/* Answer Summary Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Total Questions:</span>
                <span className="font-bold text-slate-900">{total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 font-medium">Answered:</span>
                <span className="font-bold text-emerald-700">{answeredCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-rose-600 font-medium">Unanswered:</span>
                <span className="font-bold text-rose-600">{unansweredCount}</span>
              </div>
            </div>

            {/* Warning if unanswered */}
            {unansweredCount > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <span>
                  You have <strong>{unansweredCount} unanswered question(s)</strong>.
                  Unanswered questions will not receive credit. Are you sure you wish to submit?
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                onClick={() => performSubmit(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? 'Submitting…' : 'Yes, Submit Test →'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
