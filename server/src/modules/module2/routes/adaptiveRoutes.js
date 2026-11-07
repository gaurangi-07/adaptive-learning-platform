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

const router = Router();

// Health check (no validation needed)
router.get('/health', healthCheck);

// Start a new adaptive assessment
router.post('/start', validateBody(StartAssessmentSchema), startAssessment);

// Get the next adaptively-selected question
router.get('/:attemptId/next', validateParams(AttemptIdParamSchema), getNextQuestion);

// Submit an answer to a question
router.post(
  '/:attemptId/answer',
  validateParams(AttemptIdParamSchema),
  validateBody(SubmitAnswerSchema),
  submitAnswer
);

// Get response history for an assessment
router.get('/:attemptId/history', validateParams(AttemptIdParamSchema), getHistory);

// Get assessment summary (for Module 3 analytics)
router.get('/:attemptId/summary', validateParams(AttemptIdParamSchema), getSummary);

module.exports = router;

