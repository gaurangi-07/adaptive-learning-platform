/**
 * @file PreAssessmentMCQ.jsx
 * @description Advanced examination interface for PARAKH Diagnostic Pre-Assessment.
 * Features:
 * - Left/Main question layout with 4 MCQ options and action buttons
 * - Right sidebar with authoritative countdown timer, question navigation matrix, and 5-state status legend
 * - 5 Question Status Colors: Green (Answered), Grey (Not visited), Red (Visited unanswered),
 *   Orange (Marked for review), Purple (Answered and marked for review)
 * - Full keyboard navigation (1-4, ArrowLeft/Right, R, Ctrl+Enter)
 * - Server-deadline-backed countdown with 5m and 1m warnings and auto-submission
 * - Real-time auto-saving with live status indicator (Saving... / Saved / Unable to save)
 * - Offline queueing and automatic sync on reconnection
 * - Comprehensive submission confirmation modal
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import {
  getPreAssessmentAttempt,
  getAssessmentResponses,
  recordAssessmentAnswer,
  finishPreAssessment,
} from '../api/assessmentApi';

export default function PreAssessmentMCQ() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Core assessment state
  const [questions, setQuestions] = useState(location.state?.questions || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // key: questionId -> { selectedOption, responseTimeSec, isMarkedForReview }
  const [visitedIds, setVisitedIds] = useState(new Set());

  // Timer & server deadline
  const [timer, setTimer] = useState(15 * 60);
  const serverEndTimeRef = useRef(null);
  const timerExpiredRef = useRef(false);

  // Status & modal states
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!location.state?.questions);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Question timing
  const questionStartTimeRef = useRef(Date.now());
  const pendingSyncQueueRef = useRef([]);

  // Local storage cache keys
  const localCacheKey = `parakh_answers_${attemptId}`;
  const localQueueKey = `parakh_sync_queue_${attemptId}`;

  // ──────────────────────────────────────────────────────────
  // 1. INITIALIZE ATTEMPT & RESTORE PERSISTED STATE
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadAttemptData() {
      if (!attemptId) return;

      try {
        const res = await getPreAssessmentAttempt(attemptId);
        if (res.success) {
          const qs = res.questions || [];
          setQuestions(qs);

          // Restore server-saved responses
          const restoredAnswers = {};
          const visited = new Set();

          if (res.savedResponses) {
            Object.entries(res.savedResponses).forEach(([qId, r]) => {
              restoredAnswers[qId] = {
                selectedOption: r.selectedOption,
                responseTimeSec: r.responseTimeSec || 0,
                isMarkedForReview: Boolean(r.isMarkedForReview),
              };
              visited.add(qId);
            });
          }

          // Check for any local offline changes
          try {
            const cached = localStorage.getItem(localCacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              Object.assign(restoredAnswers, parsed);
              Object.keys(parsed).forEach((k) => visited.add(k));
            }
          } catch {}

          setAnswers(restoredAnswers);

          // Mark current question as visited
          if (qs.length > 0) {
            visited.add(qs[0].id);
          }
          setVisitedIds(visited);

          // Establish authoritative server deadline
          if (res.attempt?.endTime) {
            serverEndTimeRef.current = new Date(res.attempt.endTime).getTime();
            const remaining = Math.max(0, Math.floor((serverEndTimeRef.current - Date.now()) / 1000));
            setTimer(remaining);
            if (remaining <= 0) {
              timerExpiredRef.current = true;
            }
          } else if (res.attempt?.remainingSeconds !== undefined) {
            setTimer(res.attempt.remainingSeconds);
            serverEndTimeRef.current = Date.now() + res.attempt.remainingSeconds * 1000;
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

  // Mark current question as visited whenever index changes
  useEffect(() => {
    if (questions.length > 0 && questions[currentIdx]) {
      setVisitedIds((prev) => new Set([...prev, questions[currentIdx].id]));
      questionStartTimeRef.current = Date.now();
    }
  }, [currentIdx, questions]);

  // ──────────────────────────────────────────────────────────
  // 2. NETWORK CONNECTIVITY & OFFLINE QUEUE SYNC
  // ──────────────────────────────────────────────────────────
  const syncPendingResponses = useCallback(async () => {
    if (!navigator.onLine) return;

    let queue = [];
    try {
      const stored = localStorage.getItem(localQueueKey);
      if (stored) queue = JSON.parse(stored);
    } catch {
      queue = [];
    }

    if (queue.length === 0) return;

    setSaveStatus('saving');
    try {
      for (const item of queue) {
        await recordAssessmentAnswer({
          assessmentId: attemptId,
          questionId: item.questionId,
          selectedOption: item.selectedOption,
          responseTimeSec: item.responseTimeSec,
          isMarkedForReview: item.isMarkedForReview,
        });
      }
      localStorage.removeItem(localQueueKey);
      setSaveStatus('saved');
    } catch (e) {
      console.warn('[SyncQueue] Sync failed, will retry:', e.message);
      setSaveStatus('error');
    }
  }, [attemptId, localQueueKey]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      syncPendingResponses();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingResponses]);

  // ──────────────────────────────────────────────────────────
  // 3. COUNTDOWN TIMER & AUTO-SUBMIT WITH SERVER DEADLINE
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) {
      if (!timerExpiredRef.current && !loading && questions.length > 0) {
        timerExpiredRef.current = true;
        handleAutoSubmit();
      }
      return;
    }

    const interval = setInterval(() => {
      if (serverEndTimeRef.current) {
        const remaining = Math.max(0, Math.floor((serverEndTimeRef.current - Date.now()) / 1000));
        setTimer(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          if (!timerExpiredRef.current) {
            timerExpiredRef.current = true;
            handleAutoSubmit();
          }
        }
      } else {
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
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, loading, questions]);

  // Auto-submit when time expires
  async function handleAutoSubmit() {
    await performSubmit(true);
  }

  // ──────────────────────────────────────────────────────────
  // 4. AUTO-SAVE & RESPONSE PERSISTENCE
  // ──────────────────────────────────────────────────────────
  const persistResponse = useCallback(
    async (qId, selectedOpt, isMarked, timeSpent) => {
      const updated = {
        selectedOption: selectedOpt,
        isMarkedForReview: isMarked,
        responseTimeSec: timeSpent,
      };

      // Update in memory and local storage
      setAnswers((prev) => {
        const next = { ...prev, [qId]: updated };
        try {
          localStorage.setItem(localCacheKey, JSON.stringify(next));
        } catch {}
        return next;
      });

      // If offline, queue for sync
      if (!navigator.onLine) {
        try {
          const stored = localStorage.getItem(localQueueKey);
          const queue = stored ? JSON.parse(stored) : [];
          // Deduplicate queue for same questionId
          const filtered = queue.filter((item) => item.questionId !== qId);
          filtered.push({ questionId: qId, ...updated });
          localStorage.setItem(localQueueKey, JSON.stringify(filtered));
        } catch {}
        setSaveStatus('saved');
        return;
      }

      // Online save
      setSaveStatus('saving');
      try {
        await recordAssessmentAnswer({
          assessmentId: attemptId,
          questionId: qId,
          selectedOption: selectedOpt,
          responseTimeSec: timeSpent,
          isMarkedForReview: isMarked,
        });
        setSaveStatus('saved');
      } catch (err) {
        console.warn('[AutoSave] Save failed, queueing locally:', err.message);
        setSaveStatus('error');
        // Queue locally
        try {
          const stored = localStorage.getItem(localQueueKey);
          const queue = stored ? JSON.parse(stored) : [];
          const filtered = queue.filter((item) => item.questionId !== qId);
          filtered.push({ questionId: qId, ...updated });
          localStorage.setItem(localQueueKey, JSON.stringify(filtered));
        } catch {}
      }
    },
    [attemptId, localCacheKey, localQueueKey]
  );

  // Handle Option Selection
  function handleOptionSelect(optionId) {
    if (timerExpiredRef.current || submitting) return;

    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
    const previousTime = answers[currentQ.id]?.responseTimeSec || 0;
    const totalTime = previousTime + elapsedSeconds;
    const isMarked = Boolean(answers[currentQ.id]?.isMarkedForReview);

    // Toggle option off if already selected, or select new
    const nextOption = answers[currentQ.id]?.selectedOption === optionId ? null : optionId;

    persistResponse(currentQ.id, nextOption, isMarked, totalTime);
  }

  // Handle Mark for Review Toggle
  function handleToggleMarkForReview() {
    if (timerExpiredRef.current || submitting) return;

    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
    const previousTime = answers[currentQ.id]?.responseTimeSec || 0;
    const totalTime = previousTime + elapsedSeconds;
    const currentOpt = answers[currentQ.id]?.selectedOption ?? null;
    const currentMarked = Boolean(answers[currentQ.id]?.isMarkedForReview);

    persistResponse(currentQ.id, currentOpt, !currentMarked, totalTime);
  }

  // Handle Save & Next Navigation
  function handleSaveAndNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setShowConfirmModal(true);
    }
  }

  // Handle Previous Navigation
  function handlePrevious() {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  }

  // ──────────────────────────────────────────────────────────
  // 5. KEYBOARD NAVIGATION
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore shortcuts if in text inputs or modal open
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (showConfirmModal) return;

      const currentQ = questions[currentIdx];
      const opts = currentQ?.options || currentQ?.optionsJson || [];

      // 1, 2, 3, 4: Select corresponding answer option
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        if (opts[optIdx]) {
          const optId = opts[optIdx].id || opts[optIdx].optionLabel;
          handleOptionSelect(optId);
        }
      }

      // Arrow Right: Next Question
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSaveAndNext();
      }

      // Arrow Left: Previous Question
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      }

      // R or r: Toggle Mark for Review
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleToggleMarkForReview();
      }

      // Ctrl + Enter or Cmd + Enter: Submit Assessment
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowConfirmModal(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, questions, showConfirmModal, answers]);

  // ──────────────────────────────────────────────────────────
  // 6. FINAL SUBMISSION
  // ──────────────────────────────────────────────────────────
  async function performSubmit(isAuto = false) {
    setSubmitting(true);
    setError('');

    // Flush any pending offline queue first
    await syncPendingResponses();

    const responsePayload = questions.map((q) => {
      const ans = answers[q.id] || {};
      return {
        questionId: q.id,
        selectedOption: ans.selectedOption || null,
        responseTimeSec: ans.responseTimeSec || 0,
        isMarkedForReview: Boolean(ans.isMarkedForReview),
      };
    });

    try {
      await finishPreAssessment(attemptId, responsePayload);

      // Clean local caches
      try {
        localStorage.removeItem(localCacheKey);
        localStorage.removeItem(localQueueKey);
      } catch {}

      navigate('/module1/dashboard', {
        state: { assessmentCompleted: true, wasAutoSubmitted: isAuto },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit assessment. Please try again.');
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  }

  // ──────────────────────────────────────────────────────────
  // 7. QUESTION STATUS COLOR CLASSIFICATION (5 VISUAL STATES)
  // ──────────────────────────────────────────────────────────
  /**
   * Colors according to requirement:
   * - Green: Answered (has option, not marked)
   * - Grey: Not visited
   * - Red: Visited but unanswered
   * - Orange: Marked for review (unanswered)
   * - Purple: Answered and marked for review
   */
  function getQuestionStatus(qId) {
    const hasAnswer = Boolean(answers[qId]?.selectedOption);
    const isMarked = Boolean(answers[qId]?.isMarkedForReview);
    const isVisited = visitedIds.has(qId);

    if (hasAnswer && isMarked) return 'answered-review'; // Purple
    if (isMarked) return 'review'; // Orange
    if (hasAnswer) return 'answered'; // Green
    if (isVisited) return 'visited-unanswered'; // Red
    return 'not-visited'; // Grey
  }

  function getStatusBadgeStyle(status, isCurrent) {
    let base = 'transition-all duration-150 flex items-center justify-center font-bold text-xs relative ';

    if (isCurrent) {
      base += 'ring-4 ring-indigo-400 font-black shadow-md scale-105 z-10 ';
    }

    switch (status) {
      case 'answered-review':
        return base + 'bg-purple-600 text-white shadow-xs shadow-purple-200 border border-purple-700';
      case 'review':
        return base + 'bg-amber-500 text-white shadow-xs shadow-amber-200 border border-amber-600';
      case 'answered':
        return base + 'bg-emerald-600 text-white shadow-xs shadow-emerald-200 border border-emerald-700';
      case 'visited-unanswered':
        return base + 'bg-rose-500 text-white shadow-xs shadow-rose-200 border border-rose-600';
      case 'not-visited':
      default:
        return base + 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Restoring your examination session…</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <p className="text-slate-800 font-bold">No questions found for this assessment.</p>
          <Link to="/module1/pre-assessment" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
            Start New Assessment
          </Link>
        </div>
      </div>
    );
  }

  const total = questions.length;
  const currentQ = questions[currentIdx];
  const selectedOption = answers[currentQ?.id]?.selectedOption || null;
  const isMarkedForReview = Boolean(answers[currentQ?.id]?.isMarkedForReview);

  // Statistics calculation
  let answeredCount = 0;
  let reviewCount = 0;
  let answeredReviewCount = 0;
  let visitedUnansweredCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q) => {
    const st = getQuestionStatus(q.id);
    if (st === 'answered') answeredCount += 1;
    else if (st === 'answered-review') {
      answeredCount += 1;
      answeredReviewCount += 1;
      reviewCount += 1;
    } else if (st === 'review') reviewCount += 1;
    else if (st === 'visited-unanswered') visitedUnansweredCount += 1;
    else notVisitedCount += 1;
  });

  const totalAnswered = answeredCount;
  const totalUnanswered = total - totalAnswered;
  const progressPercent = Math.round((totalAnswered / total) * 100);

  // Timer formatting
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgentTimer = timer <= 60; // 1 minute warning
  const isWarningTimer = timer <= 300 && !isUrgentTimer; // 5 minute warning

  // Options normalization
  const optionsList = currentQ?.options || currentQ?.optionsJson || [];

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-8 text-slate-800 antialiased font-sans">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* ──────────────────────────────────────────────────────── */}
        {/* TOP HEADER: Assessment Title, Auto-Save & Timer Banner */}
        {/* ──────────────────────────────────────────────────────── */}
        <header className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-black text-slate-900 text-base">PARAKH Examination Interface</span>
              <span className="bg-indigo-50 text-indigo-700 text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
                Diagnostic Pre-Assessment
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Subject: <strong>Mathematics & Core Engineering</strong> • Server Deadline Enforced
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Auto-Save & Network Indicator */}
            <div className="flex items-center gap-2 text-xs font-medium">
              {!isOnline ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Offline Mode (Queueing)
                </span>
              ) : saveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Saving...
                </span>
              ) : saveStatus === 'error' ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  ⚠️ Unable to save (retrying)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Saved
                </span>
              )}
            </div>

            {/* Prominent Visible Timer */}
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border text-base font-mono font-black shadow-xs transition-all ${
                isUrgentTimer
                  ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                  : isWarningTimer
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-slate-900 text-white border-slate-900'
              }`}
            >
              <span>⏱️</span>
              <span>{formattedTime}</span>
            </div>

            {/* Submit Confirmation Button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Submit Assessment ✓
            </button>
          </div>
        </header>

        {/* Timer Warnings Banners */}
        {isUrgentTimer && (
          <div className="p-3 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center justify-between shadow-md animate-pulse">
            <span>🚨 Critical Time Warning: Under 1 minute remaining! Your assessment will automatically finalize upon expiration.</span>
            <span className="font-mono">{formattedTime}</span>
          </div>
        )}

        {isWarningTimer && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold flex items-center justify-between shadow-xs">
            <span>⚠️ Time Warning: Under 5 minutes remaining. Please review your answered and marked questions.</span>
            <span className="font-mono font-bold">{formattedTime}</span>
          </div>
        )}

        {!isOnline && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold">
            ⚠️ Internet connection lost. You can continue answering; all responses are stored locally and will synchronize automatically when connection returns.
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="font-bold">✕</button>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────── */}
        {/* MAIN SPLIT: Question Workspace (Left) & Sidebar (Right) */}
        {/* ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ────────────────────────────────────────────── */}
          {/* LEFT / MAIN SECTION: Question & Answer Workspace */}
          {/* ────────────────────────────────────────────── */}
          <main className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">

              {/* Question Header & Metadata Row */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black">
                    Question {currentIdx + 1}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">of {total}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                    {currentQ.topic || 'General'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                    Tier {currentQ.difficulty || 2}
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                  {currentQ.questionText || currentQ.question}
                </h2>
              </div>

              {/* 4 Answer Options */}
              <div className="space-y-3" role="radiogroup" aria-label="Answer Options">
                {optionsList.map((opt, optIndex) => {
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
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-150 group ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-xs'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      {/* Keyboard shortcut pill & Letter badge */}
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                        }`}
                      >
                        {optId}
                      </span>

                      {/* Option Text */}
                      <span
                        className={`text-xs sm:text-sm leading-snug flex-1 font-medium ${
                          isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'
                        }`}
                      >
                        {optText}
                      </span>

                      {/* Keyboard Indicator */}
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-400 font-mono">
                        {optIndex + 1}
                      </kbd>

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

              {/* Keyboard Shortcuts Hint Bar */}
              <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>Keyboard: <strong>1-4</strong> Select • <strong>← / →</strong> Nav • <strong>R</strong> Mark Review • <strong>Ctrl+Enter</strong> Submit</span>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-2 sm:gap-4 flex-wrap">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentIdx === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all"
                >
                  ← Previous
                </button>

                {/* Mark for Review Button */}
                <button
                  type="button"
                  onClick={handleToggleMarkForReview}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isMarkedForReview
                      ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{isMarkedForReview ? '★ Marked for Review' : '☆ Mark for Review'}</span>
                </button>

                {/* Save & Next Button */}
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5"
                >
                  <span>{currentIdx < total - 1 ? 'Save & Next →' : 'Review & Submit ✓'}</span>
                </button>
              </div>

            </div>
          </main>

          {/* ────────────────────────────────────────────── */}
          {/* RIGHT SIDEBAR: Timer, Palette, Progress, Legend */}
          {/* ────────────────────────────────────────────── */}
          <aside className="space-y-4">

            {/* Question Navigation Palette Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Question Palette
                </h3>
                <span className="text-xs text-slate-400 font-bold font-mono">
                  {totalAnswered} / {total} Answered
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>{progressPercent}% Complete</span>
                  <span>{totalUnanswered} Unanswered</span>
                </div>
              </div>

              {/* 10-Question Matrix (5 states with distinctive colors) */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {questions.map((q, idx) => {
                  const isCurrent = currentIdx === idx;
                  const status = getQuestionStatus(q.id);
                  const badgeStyle = getStatusBadgeStyle(status, isCurrent);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-11 rounded-xl text-xs ${badgeStyle}`}
                      title={`Question ${idx + 1} (${status})`}
                    >
                      <span>{idx + 1}</span>
                      {status === 'answered-review' && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-purple-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Question Status Legend (All 5 Visual States) */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
                <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                  Status Legend
                </p>

                <div className="grid grid-cols-1 gap-1.5 font-medium">
                  {/* 1. Answered (Green) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 inline-block shrink-0" />
                      <span>Answered</span>
                    </div>
                    <span className="font-mono text-slate-400">{answeredCount}</span>
                  </div>

                  {/* 2. Visited but unanswered (Red) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-rose-500 inline-block shrink-0" />
                      <span>Visited & Unanswered</span>
                    </div>
                    <span className="font-mono text-slate-400">{visitedUnansweredCount}</span>
                  </div>

                  {/* 3. Not Visited (Grey) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-slate-100 border border-slate-300 inline-block shrink-0" />
                      <span>Not Visited</span>
                    </div>
                    <span className="font-mono text-slate-400">{notVisitedCount}</span>
                  </div>

                  {/* 4. Marked for Review (Orange) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-amber-500 inline-block shrink-0" />
                      <span>Marked for Review</span>
                    </div>
                    <span className="font-mono text-slate-400">{reviewCount - answeredReviewCount}</span>
                  </div>

                  {/* 5. Answered & Marked for Review (Purple) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-purple-600 inline-block shrink-0" />
                      <span>Answered & Review</span>
                    </div>
                    <span className="font-mono text-slate-400">{answeredReviewCount}</span>
                  </div>
                </div>
              </div>

              {/* Submit Assessment Button in Sidebar */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={submitting}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Finalize & Submit
                </button>
              </div>

            </div>

          </aside>
        </div>

      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* 8. SUBMIT ASSESSMENT SUMMARY MODAL */}
      {/* ──────────────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Confirm Submission</h3>
                <p className="text-xs text-slate-400">Review your pre-assessment question summary</p>
              </div>
            </div>

            {/* Summary Statistics Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-slate-400 text-[11px] font-bold uppercase">Total Questions</span>
                <p className="text-xl font-black text-slate-800">{total}</p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-0.5">
                <span className="text-emerald-700 text-[11px] font-bold uppercase">Answered</span>
                <p className="text-xl font-black text-emerald-700">{totalAnswered}</p>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100 space-y-0.5">
                <span className="text-rose-700 text-[11px] font-bold uppercase">Unanswered</span>
                <p className="text-xl font-black text-rose-700">{totalUnanswered}</p>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 space-y-0.5">
                <span className="text-purple-700 text-[11px] font-bold uppercase">Marked for Review</span>
                <p className="text-xl font-black text-purple-700">{reviewCount}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Once submitted, your baseline proficiency will be computed across all 5 subject topics and your initial CAT tier will be established.
            </p>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => performSubmit(false)}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting Responses…' : 'Yes, Confirm & Submit Assessment'}
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-all"
              >
                Go Back & Review Answers
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
