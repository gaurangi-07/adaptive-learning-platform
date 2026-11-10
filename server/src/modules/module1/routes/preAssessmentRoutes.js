// routes/preAssessmentRoutes.js
// -------------------------------------------------------------------
// Pre‑assessment initialization, finish, and result endpoints (Module 1)
// -------------------------------------------------------------------

const express = require('express');
const { startPreAssessment, finishPreAssessment, getPreResult } = require('../controllers/preAssessmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

// POST /api/assessment/pre – create a new attempt and return questions
router.post('/pre', startPreAssessment);

// POST /api/assessment/finish – calculate baseline & store result
router.post('/finish', finishPreAssessment);

// GET /api/assessment/pre/result – fetch latest baseline for the student
router.get('/pre/result', getPreResult);

module.exports = router;
