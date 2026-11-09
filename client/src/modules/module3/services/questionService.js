/**
 * @file questionService.js
 * @description Frontend service for Question Bank API calls (Module 3).
 */

import api from './api.js';

export const QuestionService = {
  /** List questions with optional filters */
  listQuestions(params = {}) {
    return api.get('/questions', { params });
  },

  /** Get a single question by ID */
  getQuestion(id) {
    return api.get(`/questions/${id}`);
  },

  /** Create a new question manually */
  createQuestion(payload) {
    return api.post('/questions', payload);
  },

  /** Update a question */
  updateQuestion(id, payload) {
    return api.put(`/questions/${id}`, payload);
  },

  /** Delete a question */
  deleteQuestion(id) {
    return api.delete(`/questions/${id}`);
  },

  /** Change question status (approve / reject / archive) */
  changeStatus(id, payload) {
    return api.patch(`/questions/${id}/status`, payload);
  },

  /** Check for duplicate/similar questions */
  checkDuplicate(payload) {
    return api.post('/questions/check-duplicate', payload);
  },

  /** Get all distinct subjects */
  getSubjects() {
    return api.get('/questions/meta/subjects');
  },

  /** Get topics (optionally filtered by subject) */
  getTopics(subject) {
    return api.get('/questions/meta/topics', { params: { subject } });
  },

  // ─── AI Generation ──────────────────────────────────────────────────────────

  /** Generate questions using AI */
  generateQuestions(payload) {
    return api.post('/ai/generate', payload);
  },

  /** Get AI generation logs */
  getGenerationLogs() {
    return api.get('/ai/logs');
  },

  /** AI service health */
  aiHealth() {
    return api.get('/ai/health');
  }
};
