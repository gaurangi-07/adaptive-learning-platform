/**
 * @file analyticsService.js
 * @description Frontend service for Student Analytics API calls (Module 3).
 */

import api from './api.js';

export const AnalyticsService = {
  /** Full performance report for a student */
  getReport(studentId, params = {}) {
    return api.get(`/analytics/report/${studentId}`, { params });
  },

  /** Topic-wise performance */
  getTopicPerformance(studentId, params = {}) {
    return api.get(`/analytics/topic-performance/${studentId}`, { params });
  },

  /** Difficulty-wise performance */
  getDifficultyPerformance(studentId, params = {}) {
    return api.get(`/analytics/difficulty-performance/${studentId}`, { params });
  },

  /** Time-based performance */
  getTimePerformance(studentId, params = {}) {
    return api.get(`/analytics/time-performance/${studentId}`, { params });
  },

  /** Assessment history list */
  getAssessments(studentId, params = {}) {
    return api.get(`/analytics/assessments/${studentId}`, { params });
  }
};
