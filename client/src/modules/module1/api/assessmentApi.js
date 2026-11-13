// src/modules/module1/api/assessmentApi.js
// Client API service for pre-assessment initialization, questions, response tracking,
// active session resumption, and baseline calculation.

import axios from 'axios';

function authHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Start or resume a pre-assessment attempt.
 */
export async function startPreAssessment(questionCount = 10) {
  const response = await axios.post(
    '/api/assessment/pre',
    { questionCount },
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Retrieve attempt metadata, sanitized questions, and previously saved responses.
 */
export async function getPreAssessmentAttempt(attemptId) {
  const response = await axios.get(
    `/api/assessment/pre/${attemptId}`,
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Check if the student currently has an active assessment in progress.
 * GET /api/assessment/active
 */
export async function fetchActiveAssessment() {
  const response = await axios.get(
    '/api/assessment/active',
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Retrieve past assessment history.
 * GET /api/assessment/history
 */
export async function fetchAssessmentHistory() {
  const response = await axios.get(
    '/api/assessment/history',
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Prompt 5 & Auto-save: Record an individual question answer in real time.
 * Supports saving selectedOption, responseTimeSec, and isMarkedForReview.
 * POST /api/assessment/answer
 */
export async function recordAssessmentAnswer({
  assessmentId,
  questionId,
  selectedOption,
  responseTimeSec = 0,
  isMarkedForReview,
}) {
  const response = await axios.post(
    '/api/assessment/answer',
    { assessmentId, questionId, selectedOption, responseTimeSec, isMarkedForReview },
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Prompt 5: Retrieve all recorded responses for an assessment attempt.
 * GET /api/assessment/:assessmentId/responses
 */
export async function getAssessmentResponses(assessmentId) {
  const response = await axios.get(
    `/api/assessment/${assessmentId}/responses`,
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Backward-compatible alias for saving response.
 */
export async function savePreAssessmentResponse(attemptId, {
  questionId,
  selectedOption,
  responseTimeSec = 0,
  isMarkedForReview,
}) {
  return recordAssessmentAnswer({
    assessmentId: attemptId,
    questionId,
    selectedOption,
    responseTimeSec,
    isMarkedForReview,
  });
}

/**
 * Finalize the pre-assessment and compute baseline results on the server.
 * POST /api/assessment/finish
 */
export async function finishPreAssessment(attemptId, responses = []) {
  const response = await axios.post(
    '/api/assessment/finish',
    { attemptId, assessmentId: attemptId, responses },
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Fetch the latest baseline diagnostic scores for the current student.
 * GET /api/assessment/pre/result
 */
export async function fetchPreResult() {
  const response = await axios.get(
    '/api/assessment/pre/result',
    { headers: authHeader() }
  );
  return response.data;
}
