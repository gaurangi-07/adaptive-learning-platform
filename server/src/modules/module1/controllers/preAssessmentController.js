// src/modules/module1/controllers/preAssessmentController.js
// -------------------------------------------------------------------
// Pre-assessment lifecycle: initialization, question delivery,
// response saving, attempt completion, and baseline calculation.
// -------------------------------------------------------------------

const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { questionBankAdapter } = require('../../module3/adapters/questionBankAdapter');
const { sanitizeQuestionForClient } = require('../../module3/contracts/questionBankContract');

let prisma;
try {
  const { getPrismaClient } = require('../../../prismaClient');
  prisma = getPrismaClient() || new PrismaClient();
} catch {
  prisma = new PrismaClient();
}

const ASSESSMENT_DURATION_MINUTES = 15;
const ASSESSMENT_DURATION_MS = ASSESSMENT_DURATION_MINUTES * 60 * 1000;

// In-memory fallback maps for development/testing when PostgreSQL is offline
const inMemoryAttempts = new Map();
const inMemoryResponses = new Map(); // key: attemptId, value: Map(questionId -> response)
const inMemoryBaselines = new Map(); // key: studentId, value: baseline

/**
 * Curated pre-assessment question selection.
 * Selects 10 curated questions covering 5 distinct topics with a balanced difficulty mix.
 * 4 Easy (Level 1), 4 Medium (Level 2), 2 Hard (Level 3).
 */
function selectCuratedPreAssessmentQuestions(questionCount = 10) {
  questionBankAdapter.loadQuestions();
  const allQuestions = questionBankAdapter.questions || [];

  const TOPIC_SPECS = [
    { topic: 'Algebra', diffs: [1, 2] },
    { topic: 'Geometry', diffs: [1, 2] },
    { topic: 'Arithmetic', diffs: [1, 3] },
    { topic: 'Trigonometry', diffs: [2, 3] },
    { topic: 'Statistics', diffs: [1, 2] },
  ];

  const selectedQuestions = [];
  const selectedIds = new Set();

  for (const spec of TOPIC_SPECS) {
    for (const diff of spec.diffs) {
      if (selectedQuestions.length >= questionCount) break;
      const candidates = allQuestions.filter(
        (q) =>
          q.approvalStatus === 'APPROVED' &&
          q.topic.toLowerCase() === spec.topic.toLowerCase() &&
          q.difficulty === diff &&
          !selectedIds.has(q.id)
      );

      const chosen = candidates[0] || allQuestions.find(
        (q) => q.topic.toLowerCase() === spec.topic.toLowerCase() && !selectedIds.has(q.id)
      );

      if (chosen) {
        selectedQuestions.push(chosen);
        selectedIds.add(chosen.id);
      }
    }
  }

  // Fallback to fill up to questionCount if needed
  if (selectedQuestions.length < questionCount) {
    for (const q of allQuestions) {
      if (selectedQuestions.length >= questionCount) break;
      if (!selectedIds.has(q.id) && q.approvalStatus === 'APPROVED') {
        selectedQuestions.push(q);
        selectedIds.add(q.id);
      }
    }
  }

  return selectedQuestions;
}

/**
 * POST /api/assessment/pre
 * Initialize a new pre-assessment attempt or restore an active one.
 * Never leaks correct answers or explanations.
 */
async function startPreAssessment(req, res) {
  const studentId = req.student.id;
  const questionCount = 10;

  try {
    const now = new Date();

    // 1. Check for existing active attempt to prevent duplicate attempts
    let activeAttempt = null;
    try {
      if (prisma) {
        activeAttempt = await prisma.preAssessmentAttempt.findFirst({
          where: { studentId, status: 'IN_PROGRESS' },
          orderBy: { startedAt: 'desc' },
        });
      }
    } catch {
      // Fallback
    }

    if (!activeAttempt) {
      for (const a of inMemoryAttempts.values()) {
        if (a.studentId === studentId && a.status === 'IN_PROGRESS') {
          activeAttempt = a;
          break;
        }
      }
    }

    // Check if the existing active attempt has expired
    if (activeAttempt) {
      const elapsedMs = now.getTime() - new Date(activeAttempt.startedAt).getTime();
      if (elapsedMs < ASSESSMENT_DURATION_MS) {
        // Return existing active attempt to avoid accidental duplicates
        let qIds = [];
        try {
          qIds = typeof activeAttempt.questionIds === 'string'
            ? JSON.parse(activeAttempt.questionIds)
            : activeAttempt.questionIds;
        } catch {
          qIds = [];
        }

        questionBankAdapter.loadQuestions();
        const questions = qIds
          .map((id) => questionBankAdapter.getQuestionById(id))
          .filter(Boolean)
          .map(sanitizeQuestionForClient);

        return res.status(200).json({
          success: true,
          message: 'Resuming active pre-assessment attempt',
          attemptId: activeAttempt.id,
          totalQuestions: activeAttempt.totalQuestions,
          durationMinutes: ASSESSMENT_DURATION_MINUTES,
          startedAt: activeAttempt.startedAt,
          topics: ['Algebra', 'Geometry', 'Arithmetic', 'Trigonometry', 'Statistics'],
          questions,
        });
      } else {
        // Mark expired
        try {
          if (prisma) {
            await prisma.preAssessmentAttempt.update({
              where: { id: activeAttempt.id },
              data: { status: 'TIMED_OUT', completedAt: now },
            });
          }
        } catch {
          activeAttempt.status = 'TIMED_OUT';
          activeAttempt.completedAt = now;
        }
      }
    }

    // 2. Curate 10 questions covering all 5 topics with balanced difficulty
    const rawQuestions = selectCuratedPreAssessmentQuestions(questionCount);
    const questionIds = rawQuestions.map((q) => q.id);

    // 3. Create pre-assessment attempt in database
    const attemptId = uuidv4();
    let attempt;

    try {
      if (prisma) {
        attempt = await prisma.preAssessmentAttempt.create({
          data: {
            id: attemptId,
            studentId,
            totalQuestions: rawQuestions.length,
            status: 'IN_PROGRESS',
            startedAt: now,
            questionIds: JSON.stringify(questionIds),
          },
        });
      } else {
        throw new Error('Prisma client unavailable');
      }
    } catch (dbErr) {
      console.warn('[PreAssessment] DB insert unavailable, saving to memory:', dbErr.message);
      attempt = {
        id: attemptId,
        studentId,
        totalQuestions: rawQuestions.length,
        status: 'IN_PROGRESS',
        startedAt: now,
        questionIds,
        correctAnswers: 0,
      };
      inMemoryAttempts.set(attemptId, attempt);
    }

    // Mirror to in-memory store
    inMemoryAttempts.set(attempt.id, attempt);
    if (!inMemoryResponses.has(attempt.id)) {
      inMemoryResponses.set(attempt.id, new Map());
    }

    // 4. Return sanitized questions (strictly omitting correctOption and explanation)
    const sanitizedQuestions = rawQuestions.map(sanitizeQuestionForClient);

    return res.status(201).json({
      success: true,
      attemptId: attempt.id,
      totalQuestions: rawQuestions.length,
      durationMinutes: ASSESSMENT_DURATION_MINUTES,
      startedAt: attempt.startedAt,
      topics: ['Algebra', 'Geometry', 'Arithmetic', 'Trigonometry', 'Statistics'],
      questions: sanitizedQuestions,
    });
  } catch (err) {
    console.error('[PreAssessment] startPreAssessment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to initialize pre-assessment.' });
  }
}

/**
 * GET /api/assessment/pre/:attemptId
 * Fetch pre-assessment details and restore previously saved answers.
 */
async function getPreAssessmentAttempt(req, res) {
  const studentId = req.student.id;
  const { attemptId } = req.params;

  try {
    let attempt = null;
    try {
      if (prisma) {
        attempt = await prisma.preAssessmentAttempt.findUnique({
          where: { id: attemptId },
          include: { responses: true },
        });
      }
    } catch {
      // Fallback
    }

    if (!attempt) {
      attempt = inMemoryAttempts.get(attemptId);
    }

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Assessment attempt not found' });
    }

    if (attempt.studentId !== studentId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Parse question IDs
    let qIds = [];
    try {
      qIds = typeof attempt.questionIds === 'string'
        ? JSON.parse(attempt.questionIds)
        : attempt.questionIds;
    } catch {
      qIds = [];
    }

    questionBankAdapter.loadQuestions();
    const questions = qIds
      .map((id) => questionBankAdapter.getQuestionById(id))
      .filter(Boolean)
      .map(sanitizeQuestionForClient);

    // Collect saved answers
    const savedResponses = {};
    if (attempt.responses && Array.isArray(attempt.responses)) {
      attempt.responses.forEach((r) => {
        savedResponses[r.questionId] = {
          selectedOption: r.selectedOption,
          responseTimeSec: r.responseTimeSec,
        };
      });
    } else if (inMemoryResponses.has(attemptId)) {
      const respMap = inMemoryResponses.get(attemptId);
      for (const [qId, r] of respMap.entries()) {
        savedResponses[qId] = {
          selectedOption: r.selectedOption,
          responseTimeSec: r.responseTimeSec,
        };
      }
    }

    const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
    const remainingSeconds = Math.max(0, Math.floor((ASSESSMENT_DURATION_MS - elapsedMs) / 1000));
    const isExpired = remainingSeconds <= 0;

    return res.json({
      success: true,
      attempt: {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        durationMinutes: ASSESSMENT_DURATION_MINUTES,
        remainingSeconds,
        isExpired,
      },
      questions,
      savedResponses,
    });
  } catch (err) {
    console.error('[PreAssessment] getPreAssessmentAttempt error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve assessment attempt' });
  }
}

/**
 * POST /api/assessment/pre/:attemptId/response
 * Securely save individual question response in real time.
 */
async function savePreAssessmentResponse(req, res) {
  const studentId = req.student.id;
  const { attemptId } = req.params;
  const { questionId, selectedOption, responseTimeSec = 0 } = req.body;

  if (!questionId) {
    return res.status(400).json({ success: false, error: 'questionId is required' });
  }

  try {
    let attempt = null;
    try {
      if (prisma) {
        attempt = await prisma.preAssessmentAttempt.findUnique({ where: { id: attemptId } });
      }
    } catch {
      // Fallback
    }

    if (!attempt) {
      attempt = inMemoryAttempts.get(attemptId);
    }

    if (!attempt || attempt.studentId !== studentId) {
      return res.status(403).json({ success: false, error: 'Unauthorized assessment attempt' });
    }

    if (attempt.status === 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Assessment is already completed' });
    }

    // Check expiration
    const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
    if (elapsedMs > ASSESSMENT_DURATION_MS + 30000) {
      return res.status(400).json({ success: false, error: 'Assessment time limit has expired' });
    }

    // Save in DB or fallback
    try {
      if (prisma) {
        const existingResp = await prisma.preAssessmentResponse.findFirst({
          where: { attemptId, questionId },
        });

        if (existingResp) {
          await prisma.preAssessmentResponse.update({
            where: { id: existingResp.id },
            data: {
              selectedOption,
              responseTimeSec: Number(responseTimeSec),
              answeredAt: new Date(),
            },
          });
        } else {
          await prisma.preAssessmentResponse.create({
            data: {
              attemptId,
              questionId,
              selectedOption,
              responseTimeSec: Number(responseTimeSec),
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn('[PreAssessment] DB response save failed, using memory:', dbErr.message);
    }

    // Save in memory map
    if (!inMemoryResponses.has(attemptId)) {
      inMemoryResponses.set(attemptId, new Map());
    }
    inMemoryResponses.get(attemptId).set(questionId, {
      selectedOption,
      responseTimeSec: Number(responseTimeSec),
      answeredAt: new Date(),
    });

    return res.json({ success: true, saved: true });
  } catch (err) {
    console.error('[PreAssessment] saveResponse error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record response' });
  }
}

/**
 * POST /api/assessment/finish
 * Calculate baseline scores, save BaselineResult, and finalize attempt.
 * Evaluates responses securely on the server.
 */
async function finishPreAssessment(req, res) {
  const studentId = req.student.id;
  const { attemptId, responses = [] } = req.body;

  if (!attemptId) {
    return res.status(400).json({ success: false, error: 'attemptId is required' });
  }

  try {
    let attempt = null;
    try {
      if (prisma) {
        attempt = await prisma.preAssessmentAttempt.findUnique({
          where: { id: attemptId },
        });
      }
    } catch {
      // Fallback
    }

    if (!attempt) {
      attempt = inMemoryAttempts.get(attemptId);
    }

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    if (attempt.studentId !== studentId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    questionBankAdapter.loadQuestions();

    // Consolidate responses from payload and persisted responses
    const responseMap = new Map();

    // From in-memory / previously saved
    if (inMemoryResponses.has(attemptId)) {
      for (const [qId, r] of inMemoryResponses.get(attemptId).entries()) {
        responseMap.set(qId, r);
      }
    }

    // Merge any submitted in payload
    if (Array.isArray(responses)) {
      responses.forEach((r) => {
        if (r && r.questionId) {
          responseMap.set(r.questionId, r);
        }
      });
    }

    // Secure evaluation against question bank
    let correctAnswers = 0;
    const topicStats = {
      Algebra: { correct: 0, total: 0 },
      Geometry: { correct: 0, total: 0 },
      Arithmetic: { correct: 0, total: 0 },
      Trigonometry: { correct: 0, total: 0 },
      Statistics: { correct: 0, total: 0 },
    };

    let qIds = [];
    try {
      qIds = typeof attempt.questionIds === 'string'
        ? JSON.parse(attempt.questionIds)
        : attempt.questionIds;
    } catch {
      qIds = [];
    }

    for (const qId of qIds) {
      const question = questionBankAdapter.getQuestionById(qId);
      if (!question) continue;

      const topicName = question.topic || 'General';
      if (!topicStats[topicName]) {
        topicStats[topicName] = { correct: 0, total: 0 };
      }
      topicStats[topicName].total += 1;

      const studentResp = responseMap.get(qId);
      const isCorrect = studentResp && studentResp.selectedOption === question.correctOption;

      if (isCorrect) {
        correctAnswers += 1;
        topicStats[topicName].correct += 1;
      }
    }

    const totalQuestions = attempt.totalQuestions || qIds.length || 10;
    const overallAccuracy = parseFloat(((correctAnswers / totalQuestions) * 100).toFixed(1));

    // Normalize topic proficiencies on 0.0 - 1.0 scale
    const topicProficiency = {};
    for (const [topic, stats] of Object.entries(topicStats)) {
      const proficiency = stats.total > 0 ? stats.correct / stats.total : 0.5;
      topicProficiency[topic] = parseFloat(proficiency.toFixed(2));
    }

    // 1. Store or update BaselineResult
    const baselineData = {
      studentId,
      overallAccuracy,
      totalQuestions,
      correctAnswers,
      topicProficiency,
      updatedAt: new Date(),
    };

    try {
      if (prisma) {
        await prisma.baselineResult.upsert({
          where: { studentId },
          update: baselineData,
          create: baselineData,
        });
      }
    } catch (dbErr) {
      console.warn('[PreAssessment] Baseline upsert failed in DB, saving to memory:', dbErr.message);
    }
    inMemoryBaselines.set(studentId, baselineData);

    // 2. Mark attempt COMPLETED
    const now = new Date();
    try {
      if (prisma) {
        await prisma.preAssessmentAttempt.update({
          where: { id: attemptId },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            correctAnswers,
            topicProficiency: JSON.stringify(topicProficiency),
          },
        });
      }
    } catch (dbErr) {
      console.warn('[PreAssessment] Attempt completion update in DB failed:', dbErr.message);
    }

    attempt.status = 'COMPLETED';
    attempt.completedAt = now;
    attempt.correctAnswers = correctAnswers;
    attempt.topicProficiency = topicProficiency;
    inMemoryAttempts.set(attemptId, attempt);

    return res.json({
      success: true,
      attemptId,
      overallAccuracy,
      totalQuestions,
      correctAnswers,
      topicProficiency,
    });
  } catch (err) {
    console.error('[PreAssessment] finishPreAssessment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to finalize pre-assessment.' });
  }
}

/**
 * GET /api/assessment/pre/result
 * Retrieve the latest baseline result for the authenticated student.
 */
async function getPreResult(req, res) {
  const studentId = req.student.id;
  try {
    let baseline = null;
    try {
      if (prisma) {
        baseline = await prisma.baselineResult.findFirst({
          where: { studentId },
          orderBy: { createdAt: 'desc' },
        });
      }
    } catch {
      // Fallback
    }

    if (!baseline) {
      baseline = inMemoryBaselines.get(studentId);
    }

    if (!baseline) {
      return res.status(404).json({ success: false, error: 'No baseline assessment record found.' });
    }

    return res.json({ success: true, baseline });
  } catch (err) {
    console.error('[PreAssessment] getPreResult error:', err);
    return res.status(500).json({ success: false, error: 'Server error retrieving baseline.' });
  }
}

module.exports = {
  startPreAssessment,
  getPreAssessmentAttempt,
  savePreAssessmentResponse,
  finishPreAssessment,
  getPreResult,
  selectCuratedPreAssessmentQuestions,
  inMemoryAttempts,
  inMemoryResponses,
  inMemoryBaselines,
};
