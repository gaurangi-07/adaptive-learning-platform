// routes/preAssessmentRoutes.js
// -------------------------------------------------------------------
// Pre-assessment initialization, question delivery, response tracking,
// completion, and baseline result endpoints (Module 1).
// -------------------------------------------------------------------

const express = require('express');
const {
  startPreAssessment,
  getPreAssessmentAttempt,
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

// GET /api/assessment/pre/:attemptId – Fetch attempt questions and restore saved responses
router.get('/pre/:attemptId', getPreAssessmentAttempt);

// POST /api/assessment/pre/:attemptId/response – Securely persist question response
router.post('/pre/:attemptId/response', savePreAssessmentResponse);

// POST /api/assessment/finish – Calculate baseline & finalize attempt
router.post('/finish', finishPreAssessment);

// GET /api/assessment/pre/result – Fetch latest baseline result
router.get('/pre/result', getPreResult);

module.exports = router;
