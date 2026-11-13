/**
 * @file adaptiveController.js
 * @description Express route handlers for Module 2 Adaptive Testing endpoints.
 */

const { AdaptiveService } = require('../services/adaptiveService');

const service = new AdaptiveService();

/**
 * POST /api/adaptive/start
 * Initialize a new adaptive assessment session.
 */
async function startAssessment(req, res, next) {
  try {
    // Always use the authenticated student's ID from JWT, ignoring any body studentId
    const studentId = parseInt(req.student.id, 10);
    const result = await service.startAssessment({ ...req.validatedBody, studentId });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/adaptive/:attemptId/next
 * Get the next adaptively-selected question.
 */
async function getNextQuestion(req, res, next) {
  try {
    const { attemptId } = req.validatedParams;
    const result = await service.getNextQuestion(attemptId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/adaptive/:attemptId/answer
 * Submit an answer and receive evaluation with difficulty feedback.
 */
async function submitAnswer(req, res, next) {
  try {
    const { attemptId } = req.validatedParams;
    const result = await service.submitAnswer(attemptId, req.validatedBody);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/adaptive/:attemptId/history
 * Get full response history for an assessment.
 */
async function getHistory(req, res, next) {
  try {
    const { attemptId } = req.validatedParams;
    const result = await service.getHistory(attemptId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/adaptive/:attemptId/summary
 * Get detailed assessment summary for analytics (Module 3 consumption).
 */
async function getSummary(req, res, next) {
  try {
    const { attemptId } = req.validatedParams;
    const result = await service.getSummary(attemptId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/adaptive/health
 * Health check endpoint.
 */
async function healthCheck(req, res) {
  const { questionBankAdapter } = require('../../module3/adapters/questionBankAdapter');
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      module: 'Module 2 — Adaptive Testing System',
      timestamp: new Date().toISOString(),
      questionBank: {
        loaded: true,
        totalQuestions: questionBankAdapter.getTotalCount(),
        topics: questionBankAdapter.getAvailableTopics()
      }
    }
  });
}

module.exports = {
  startAssessment,
  getNextQuestion,
  submitAnswer,
  getHistory,
  getSummary,
  healthCheck
};

