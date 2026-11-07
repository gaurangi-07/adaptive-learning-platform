/**
 * @file adaptiveService.js
 * @description Frontend service layer for all Module 2 Adaptive Testing API calls.
 */

import api from './api';

export const AdaptiveService = {
  /**
   * Start a new adaptive assessment session.
   * @param {object} payload - { studentId, subject?, baselineLevel?, topicScores?, totalQuestions? }
   */
  startAssessment(payload) {
    return api.post('/adaptive/start', payload);
  },

  /**
   * Get the next adaptively-selected question.
   * @param {string} attemptId
   */
  getNextQuestion(attemptId) {
    return api.get(`/adaptive/${attemptId}/next`);
  },

  /**
   * Submit an answer to the current question.
   * @param {string} attemptId
   * @param {object} payload - { assessmentQuestionId, selectedOption }
   */
  submitAnswer(attemptId, payload) {
    return api.post(`/adaptive/${attemptId}/answer`, payload);
  },

  /**
   * Get the full response history for an assessment.
   * @param {string} attemptId
   */
  getHistory(attemptId) {
    return api.get(`/adaptive/${attemptId}/history`);
  },

  /**
   * Get the detailed assessment summary (for completion page).
   * @param {string} attemptId
   */
  getSummary(attemptId) {
    return api.get(`/adaptive/${attemptId}/summary`);
  },

  /**
   * Health check for the Module 2 backend.
   */
  healthCheck() {
    return api.get('/adaptive/health');
  }
};

