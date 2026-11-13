// routes/preAssessmentRoutes.js
// -------------------------------------------------------------------
// Pre-assessment initialization, question delivery, response tracking,
// completion, active assessment recovery, and baseline result endpoints (Module 1).
// -------------------------------------------------------------------

const express = require('express');
const {
  startPreAssessment,
  getPreAssessmentAttempt,
  recordAssessmentAnswer,
  getAssessmentResponses,
  getActiveAssessment,
  getAssessmentHistory,
  savePreAssessmentResponse,
  finishPreAssessment,
  getPreResult,
} = require('../controllers/preAssessmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Require JWT authentication for all pre-assessment actions
router.use(protect);

// POST /api/assessment/pre – Initialize/resume pre-assessment attempt
router.post('/pre', startPreAssessment);

// GET /api/assessment/active – Check for ongoing assessment to resume
router.get('/active', getActiveAssessment);

// GET /api/assessment/history – Retrieve student's assessment history
router.get('/history', getAssessmentHistory);

// GET /api/assessment/pre/:attemptId – Fetch attempt questions and restore saved responses
router.get('/pre/:attemptId', getPreAssessmentAttempt);

// Prompt 5: POST /api/assessment/answer – Record student's response to a question
router.post('/answer', recordAssessmentAnswer);

// Prompt 5: GET /api/assessment/:assessmentId/responses – Retrieve all responses for an assessment
router.get('/:assessmentId/responses', getAssessmentResponses);

// Backward-compatible alias: POST /api/assessment/pre/:attemptId/response
router.post('/pre/:attemptId/response', savePreAssessmentResponse);

// Prompt 6: POST /api/assessment/finish – Calculate baseline & finalize attempt
router.post('/finish', finishPreAssessment);

// Prompt 6: GET /api/assessment/pre/result – Fetch latest baseline result
router.get('/pre/result', getPreResult);

module.exports = router;
