// src/modules/module1/api/assessmentApi.js
// Client API service for pre-assessment initialization, questions, and responses.

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
 * Persist an individual question response in real time to the server.
 */
export async function savePreAssessmentResponse(attemptId, { questionId, selectedOption, responseTimeSec = 0 }) {
  const response = await axios.post(
    `/api/assessment/pre/${attemptId}/response`,
    { questionId, selectedOption, responseTimeSec },
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Finalize the pre-assessment and compute baseline results on the server.
 */
export async function finishPreAssessment(attemptId, responses = []) {
  const response = await axios.post(
    '/api/assessment/finish',
    { attemptId, responses },
    { headers: authHeader() }
  );
  return response.data;
}

/**
 * Fetch the latest baseline diagnostic scores for the current student.
 */
export async function fetchPreResult() {
  const response = await axios.get(
    '/api/assessment/pre/result',
    { headers: authHeader() }
  );
  return response.data;
}
