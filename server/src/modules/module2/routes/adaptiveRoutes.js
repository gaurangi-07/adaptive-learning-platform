/**
 * @file adaptiveRoutes.js
 * @description Express router for Module 2 Adaptive Testing API endpoints.
 */

const { Router } = require('express');
const {
  startAssessment,
  getNextQuestion,
  submitAnswer,
  getHistory,
  getSummary,
  healthCheck
} = require('../controllers/adaptiveController');
const { validateBody, validateParams } = require('../middleware/validateRequest');
const {
  StartAssessmentSchema,
  SubmitAnswerSchema,
  AttemptIdParamSchema
} = require('../validators/adaptiveValidators');
const { protect } = require('../../module1/middleware/authMiddleware');

const router = Router();

// Health check (no auth needed)
router.get('/health', healthCheck);

// All assessment routes require authentication
router.post('/start', protect, validateBody(StartAssessmentSchema), startAssessment);
router.get('/:attemptId/next', protect, validateParams(AttemptIdParamSchema), getNextQuestion);
router.post(
  '/:attemptId/answer',
  protect,
  validateParams(AttemptIdParamSchema),
  validateBody(SubmitAnswerSchema),
  submitAnswer
);
router.get('/:attemptId/history', protect, validateParams(AttemptIdParamSchema), getHistory);
router.get('/:attemptId/summary', protect, validateParams(AttemptIdParamSchema), getSummary);

module.exports = router;
