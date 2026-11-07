/**
 * @file AdaptiveQuizPage.jsx
 * @description The core adaptive quiz interface: question display, timer, answer selection,
 * feedback panel, and progress tracking.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdaptiveService } from '../services/adaptiveService';
import MCQCard from '../components/MCQCard';
import ProgressBar from '../components/ProgressBar';
import QuestionTimer from '../components/QuestionTimer';
import DifficultyBadge from '../components/DifficultyBadge';
import FeedbackPanel from '../components/FeedbackPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useTimer } from '../hooks/useTimer';
import { useAdaptiveQuiz } from '../hooks/useAdaptiveQuiz';

const ALLOCATED_SECONDS = 90;

export default function AdaptiveQuizPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    phase, PHASES,
    currentQuestion, lastFeedback, progress,
    error, isLoading, isActive, isAnswered, isComplete, hasError,
    submitAnswer, handleTimeout, nextQuestion, clearError, reset
  } = useAdaptiveQuiz();

  // We need to boot the quiz from an existing attemptId (navigated from start page)
  // So we load the first question directly
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!attemptId || initialized) return;
    setInitialized(true);
    // Load first question from the attemptId created on StartPage
    _fetchNext();
  }, [attemptId]); // eslint-disable-line

  async function _fetchNext() {
    try {
      const res = await AdaptiveService.getNextQuestion(attemptId);
      const data = res.data;
      if (data.completed) {
        navigate(`/results/${attemptId}`);
        return;
      }
      // Update state via internal hook mechanism by calling the service directly
      // Since we're managing state here with the hook that expects startAssessment,
      // we use a local state approach for the page
      setPageQuestion(data);
      setPageProgress({
        answered: data.progress.answered,
        total: data.progress.total,
        score: 0,
        accuracy: 0
      });
      setPagePhase('ACTIVE');
    } catch (err) {
      setPageError(err.message);
      setPagePhase('ERROR');
    }
  }

  // Local state management for direct attemptId access (bypassing hook's startAssessment)
  const [pagePhase, setPagePhase] = useState('LOADING'); // LOADING | ACTIVE | ANSWERED | ERROR
  const [pageQuestion, setPageQuestion] = useState(null);
  const [pageFeedback, setPageFeedback] = useState(null);
  const [pageProgress, setPageProgress] = useState({ answered: 0, total: 0, score: 0, accuracy: 0 });
  const [pageError, setPageError] = useState(null);

  const { timeLeft, percentLeft, isExpired, stopTimer, resetTimer } = useTimer(
    pageQuestion?.allocatedSeconds || ALLOCATED_SECONDS,
    async () => {
      if (pagePhase !== 'ACTIVE') return;
      await _handleTimeout();
    }
  );

  // Reset timer when question changes
  useEffect(() => {
    if (pageQuestion) {
      setSelectedOption(null);
    }
  }, [pageQuestion?.assessmentQuestionId]);

  async function _handleTimeout() {
    if (pagePhase !== 'ACTIVE' || !pageQuestion) return;
    setPagePhase('ANSWERED');
    setSubmitting(false);
    try {
      const res = await AdaptiveService.submitAnswer(attemptId, {
        assessmentQuestionId: pageQuestion.assessmentQuestionId,
        selectedOption: selectedOption || 'A'
      });
      const fb = res.data;
      setPageFeedback({ ...fb, isTimedOut: true });
      setPageProgress({
        answered: fb.progress.answered,
        total: fb.progress.total || pageProgress.total,
        score: fb.progress.score,
        accuracy: fb.progress.accuracy
      });
      if (fb.progress.isComplete) {
        setTimeout(() => navigate(`/results/${attemptId}`), 1500);
      }
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function handleSubmit() {
    if (!selectedOption || pagePhase !== 'ACTIVE' || submitting) return;
    stopTimer();
    setSubmitting(true);
    setPagePhase('ANSWERED');
    try {
      const res = await AdaptiveService.submitAnswer(attemptId, {
        assessmentQuestionId: pageQuestion.assessmentQuestionId,
        selectedOption
      });
      const fb = res.data;
      setPageFeedback(fb);
      setPageProgress({
        answered: fb.progress.answered,
        total: fb.progress.total || pageProgress.total,
        score: fb.progress.score,
        accuracy: fb.progress.accuracy
      });
      if (fb.progress.isComplete) {
        setTimeout(() => navigate(`/results/${attemptId}`), 2000);
      }
    } catch (err) {
      setPageError(err.message);
      setPagePhase('ACTIVE');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (pageFeedback?.progress?.isComplete) {
      navigate(`/results/${attemptId}`);
      return;
    }
    setPagePhase('LOADING');
    setPageQuestion(null);
    setPageFeedback(null);
    setSelectedOption(null);
    try {
      const res = await AdaptiveService.getNextQuestion(attemptId);
      const data = res.data;
      if (data.completed) {
        navigate(`/results/${attemptId}`);
        return;
      }
      setPageQuestion(data);
      setPageProgress({
        answered: data.progress.answered,
        total: data.progress.total,
        score: pageProgress.score,
        accuracy: pageProgress.accuracy
      });
      setPagePhase('ACTIVE');
      resetTimer();
    } catch (err) {
      setPageError(err.message);
      setPagePhase('ERROR');
    }
  }

  // ── Render guards ──
  if (pagePhase === 'LOADING' || (pagePhase === 'ACTIVE' && !pageQuestion)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
        <LoadingSpinner message="Selecting next question…" size="lg" />
      </div>
    );
  }

  if (pagePhase === 'ERROR' || pageError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorAlert
            message={pageError || 'An error occurred.'}
            onRetry={() => { setPageError(null); setPagePhase('LOADING'); _fetchNext(); }}
          />
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary w-full mt-4"
          >
            ← Back to Start
          </button>
        </div>
      </div>
    );
  }

  const question = pageQuestion?.question;
  const qNumber = pageQuestion?.questionNumber;
  const totalQ = pageQuestion?.totalQuestions || pageProgress.total;
  const isLastQuestion = pageProgress.answered + 1 >= pageProgress.total;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {/* Top bar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-600 font-bold text-sm">PARAKH</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-sm">Adaptive Assessment</span>
          </div>
          <div className="text-sm font-semibold text-slate-700">
            Q{qNumber} <span className="text-slate-400">of {totalQ}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Progress */}
        <ProgressBar
          answered={pageProgress.answered}
          total={pageProgress.total || totalQ}
          score={pageProgress.score}
          accuracy={pageProgress.accuracy}
        />

        {/* Question meta */}
        <div className="flex flex-wrap items-center gap-2">
          {question?.topic && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200">
              📚 {question.topic}
            </span>
          )}
          {question?.competency && (
            <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
              {question.competency}
            </span>
          )}
          {question?.difficulty && <DifficultyBadge difficulty={question.difficulty} />}
        </div>

        {/* Timer */}
        {pagePhase === 'ACTIVE' && (
          <QuestionTimer
            timeLeft={timeLeft}
            percentLeft={percentLeft}
            allocatedSeconds={pageQuestion?.allocatedSeconds || ALLOCATED_SECONDS}
          />
        )}

        {/* MCQ Card */}
        <MCQCard
          question={question}
          selectedOption={selectedOption}
          onSelectOption={pagePhase === 'ACTIVE' ? setSelectedOption : undefined}
          isAnswered={pagePhase === 'ANSWERED'}
          correctOption={pageFeedback?.correctOption}
          isTimedOut={pageFeedback?.isTimedOut}
        />

        {/* Feedback (post-submit) */}
        {pagePhase === 'ANSWERED' && pageFeedback && (
          <FeedbackPanel
            feedback={pageFeedback}
            onNext={handleNext}
            isLastQuestion={isLastQuestion}
          />
        )}

        {/* Submit button (active state) */}
        {pagePhase === 'ACTIVE' && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedOption || submitting}
            className="btn-primary w-full py-4 text-base"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Submitting…
              </span>
            ) : (
              'Submit Answer'
            )}
          </button>
        )}
      </main>
    </div>
  );
}

