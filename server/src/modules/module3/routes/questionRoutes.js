/**
 * @file questionRoutes.js
 * @description Express routes for Module 3 Question Bank management.
 *
 * Base path: /api/questions
 *
 * No authentication middleware is wired yet (Module 1 owns auth).
 * Role-based stubs are in place and can be connected once Module 1 provides JWT middleware.
 */

const { Router } = require('express');
const { QuestionService } = require('../services/questionService');
const { validateQuestionFilters } = require('../validators/questionValidator');

const { protect } = require('../../module1/middleware/authMiddleware');

const router = Router();
const service = new QuestionService();

// ─── GET /api/questions ────────────────────────────────────────────────────────
// List/search questions with filters
router.get('/', async (req, res, next) => {
  try {
    const filter = validateQuestionFilters(req.query);
    if (!filter.valid) {
      return res.status(400).json({ success: false, error: 'Invalid filters', details: filter.errors });
    }
    const result = await service.listQuestions(filter.data);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/questions/meta/subjects ─────────────────────────────────────────
router.get('/meta/subjects', async (req, res, next) => {
  try {
    const subjects = await service.getDistinctSubjects();
    res.json({ success: true, data: { subjects } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/questions/meta/topics ───────────────────────────────────────────
router.get('/meta/topics', async (req, res, next) => {
  try {
    const { subject } = req.query;
    const topics = await service.getDistinctTopics(subject);
    res.json({ success: true, data: { topics } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/questions/check-duplicate ──────────────────────────────────────
router.post('/check-duplicate', async (req, res, next) => {
  try {
    const { questionText, subject, topic } = req.body;
    if (!questionText) {
      return res.status(400).json({ success: false, error: 'questionText is required' });
    }
    const result = await service.checkDuplicates(questionText, { subject, topic });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/questions/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const question = await service.getQuestionById(req.params.id);
    if (!question) return res.status(404).json({ success: false, error: 'Question not found' });
    res.json({ success: true, data: { question } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/questions ───────────────────────────────────────────────────────
router.post('/', protect, async (req, res, next) => {
  try {
    const createdBy = req.headers['x-user-id'] || null; // Module 1 sets this header
    const question = await service.createQuestion(req.body, createdBy);
    res.status(201).json({ success: true, data: { question } });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message, details: err.validationErrors });
    }
    next(err);
  }
});

// ─── PUT /api/questions/:id ────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res, next) => {
  try {
    const question = await service.updateQuestion(req.params.id, req.body);
    res.json({ success: true, data: { question } });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message, details: err.validationErrors });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// ─── DELETE /api/questions/:id ─────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const result = await service.deleteQuestion(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// ─── PATCH /api/questions/:id/status ──────────────────────────────────────────
router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const reviewerId = req.headers['x-user-id'] || null;
    const question = await service.changeStatus(req.params.id, {
      ...req.body,
      reviewerId
    });
    res.json({ success: true, data: { question } });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: err.message, details: err.validationErrors });
    }
    if (err.statusCode === 404) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
