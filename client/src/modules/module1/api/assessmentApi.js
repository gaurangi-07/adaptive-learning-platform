// src/modules/module1/api/assessmentApi.js
// -------------------------------------------------
// Client wrappers for the pre‑assessment endpoints.
// -------------------------------------------------

import axios from 'axios';

function authHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function startPreAssessment(questionCount = 10) {
  const response = await axios.post(
    '/api/assessment/pre',
    { questionCount },
    { headers: authHeader() }
  );
  return response.data;
}

export async function finishPreAssessment(attemptId, responses) {
  const response = await axios.post(
    '/api/assessment/finish',
    { attemptId, responses },
    { headers: authHeader() }
  );
  return response.data;
}

export async function fetchPreResult() {
  const response = await axios.get('/api/assessment/pre/result', { headers: authHeader() });
  return response.data;
}
