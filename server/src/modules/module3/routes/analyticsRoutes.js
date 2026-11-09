/**
 * @file analyticsRoutes.js
 * @description Express routes for Module 3 Student Performance Analytics.
 *
 * Base path: /api/analytics
 *
 * All endpoints use ACTUAL data from StudentResponse and AdaptiveAssessment tables.
 * No synthetic/random data is generated.
 */

const { Router } = require('express');
const { AnalyticsService } = require('../services/analyticsService');

const router = Router();
const service = new AnalyticsService();

function parseFilters(query) {
  const { subject, topic, difficulty, startDate, endDate, status } = query;
  return { subject, topic, difficulty, startDate, endDate, status };
}

// ─── GET /api/analytics/report/:studentId ─────────────────────────────────────
router.get('/report/:studentId', async (req, res, next) => {
  try {
    const result = await service.getFullReport(req.params.studentId, parseFilters(req.query));
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

// ─── GET /api/analytics/topic-performance/:studentId ──────────────────────────
router.get('/topic-performance/:studentId', async (req, res, next) => {
  try {
    const result = await service.getTopicPerformance(req.params.studentId, parseFilters(req.query));
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

// ─── GET /api/analytics/difficulty-performance/:studentId ─────────────────────
router.get('/difficulty-performance/:studentId', async (req, res, next) => {
  try {
    const result = await service.getDifficultyPerformance(req.params.studentId, parseFilters(req.query));
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

// ─── GET /api/analytics/time-performance/:studentId ───────────────────────────
router.get('/time-performance/:studentId', async (req, res, next) => {
  try {
    const result = await service.getTimePerformance(req.params.studentId, parseFilters(req.query));
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

// ─── GET /api/analytics/assessments/:studentId ────────────────────────────────
router.get('/assessments/:studentId', async (req, res, next) => {
  try {
    const result = await service.getAssessmentHistory(req.params.studentId, parseFilters(req.query));
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = router;
