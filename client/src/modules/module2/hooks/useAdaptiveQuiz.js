/**
 * @file useAdaptiveQuiz.js
 * @description Core state machine hook for managing the adaptive quiz session.
 * Handles: assessment lifecycle, question fetching, answer submission, and session state.
 */

import { useState, useCallback, useRef } from 'react';
import { AdaptiveService } from '../services/adaptiveService';

const PHASES = {
  IDLE: 'IDLE',
  STARTING: 'STARTING',
  LOADING_QUESTION: 'LOADING_QUESTION',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  ANSWER_SUBMITTED: 'ANSWER_SUBMITTED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};

export function useAdaptiveQuiz() {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [progress, setProgress] = useState({ answered: 0, total: 0, score: 0, accuracy: 0 });
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const questionStartTimeRef = useRef(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Start a new adaptive assessment.
   * @param {object} studentConfig - { studentId, subject?, baselineLevel?, topicScores?, totalQuestions? }
   */
  const startAssessment = useCallback(async (studentConfig) => {
    setPhase(PHASES.STARTING);
    setError(null);
    try {
      const res = await AdaptiveService.startAssessment(studentConfig);
      const session = res.data;
      setAttemptId(session.attemptId);
      setSessionInfo(session);
      setProgress({ answered: 0, total: session.totalQuestions, score: 0, accuracy: 0 });
      // Immediately load first question
      await _loadNextQuestion(session.attemptId);
    } catch (err) {
      setError(err.message || 'Failed to start assessment.');
      setPhase(PHASES.ERROR);
    }
  }, []); // eslint-disable-line

  /**
   * Internal helper: fetch the next question for a given attempt.
   */
  const _loadNextQuestion = useCallback(async (aid) => {
    setPhase(PHASES.LOADING_QUESTION);
    setLastFeedback(null);
    try {
      const res = await AdaptiveService.getNextQuestion(aid);
      const data = res.data;
      if (data.completed) {
        setPhase(PHASES.COMPLETED);
        setProgress((p) => ({ ...p, ...data }));
      } else {
        setCurrentQuestion(data);
        setProgress((p) => ({
          ...p,
          answered: data.progress.answered,
          total: data.progress.total
        }));
        questionStartTimeRef.current = Date.now();
        setPhase(PHASES.QUESTION_ACTIVE);
      }
    } catch (err) {
      setError(err.message || 'Failed to load question.');
      setPhase(PHASES.ERROR);
    }
  }, []);

  /**
   * Submit the selected answer option.
   * @param {string} selectedOption - "A", "B", "C", or "D"
   */
  const submitAnswer = useCallback(async (selectedOption) => {
    if (phase !== PHASES.QUESTION_ACTIVE || !currentQuestion || !attemptId) return;
    setPhase(PHASES.ANSWER_SUBMITTED);
    try {
      const res = await AdaptiveService.submitAnswer(attemptId, {
        assessmentQuestionId: currentQuestion.assessmentQuestionId,
        selectedOption
      });
      const feedback = res.data;
      setLastFeedback(feedback);
      setProgress({
        answered: feedback.progress.answered,
        total: feedback.progress.total || progress.total,
        score: feedback.progress.score,
        accuracy: feedback.progress.accuracy
      });
      if (feedback.progress.isComplete) {
        setPhase(PHASES.COMPLETED);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
      setPhase(PHASES.ERROR);
    }
  }, [phase, currentQuestion, attemptId, progress.total]);

  /**
   * Handle question timeout — submit the current question as timed-out by calling submit
   * with a special flag (backend handles server-side expiry on next-question fetch).
   * Simply advance to next question (backend records the timeout).
   */
  const handleTimeout = useCallback(async () => {
    if (phase !== PHASES.QUESTION_ACTIVE || !attemptId) return;
    setPhase(PHASES.ANSWER_SUBMITTED);
    try {
      // Submit with any option; backend will detect timeout and mark it
      const res = await AdaptiveService.submitAnswer(attemptId, {
        assessmentQuestionId: currentQuestion.assessmentQuestionId,
        selectedOption: 'A' // Will be overridden by backend timeout detection
      });
      const feedback = res.data;
      setLastFeedback({ ...feedback, isTimedOut: true });
      setProgress({
        answered: feedback.progress.answered,
        total: feedback.progress.total || progress.total,
        score: feedback.progress.score,
        accuracy: feedback.progress.accuracy
      });
      if (feedback.progress.isComplete) {
        setPhase(PHASES.COMPLETED);
      }
    } catch (err) {
      setError(err.message || 'Connection error during timeout.');
      setPhase(PHASES.ERROR);
    }
  }, [phase, attemptId, currentQuestion, progress.total]);

  /**
   * Advance to the next question after reviewing the feedback.
   */
  const nextQuestion = useCallback(async () => {
    if (!attemptId) return;
    if (phase === PHASES.COMPLETED) return;
    await _loadNextQuestion(attemptId);
  }, [attemptId, phase, _loadNextQuestion]);

  /**
   * Reset quiz to initial idle state.
   */
  const reset = useCallback(() => {
    setPhase(PHASES.IDLE);
    setAttemptId(null);
    setCurrentQuestion(null);
    setLastFeedback(null);
    setProgress({ answered: 0, total: 0, score: 0, accuracy: 0 });
    setError(null);
    setSessionInfo(null);
  }, []);

  return {
    phase,
    PHASES,
    attemptId,
    currentQuestion,
    lastFeedback,
    progress,
    error,
    sessionInfo,
    startAssessment,
    submitAnswer,
    handleTimeout,
    nextQuestion,
    reset,
    clearError,
    isLoading: phase === PHASES.STARTING || phase === PHASES.LOADING_QUESTION,
    isActive: phase === PHASES.QUESTION_ACTIVE,
    isAnswered: phase === PHASES.ANSWER_SUBMITTED,
    isComplete: phase === PHASES.COMPLETED,
    hasError: phase === PHASES.ERROR
  };
}

