// src/modules/module1/controllers/preAssessmentController.js
// -------------------------------------------------------------------
// Pre-assessment lifecycle: initialization, question delivery,
// response tracking, attempt completion, and baseline calculation.
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
if (!global.__parakh_inMemoryAttempts) global.__parakh_inMemoryAttempts = new Map();
if (!global.__parakh_inMemoryResponses) global.__parakh_inMemoryResponses = new Map();
if (!global.__parakh_inMemoryBaselines) global.__parakh_inMemoryBaselines = new Map();

const inMemoryAttempts = global.__parakh_inMemoryAttempts;
const inMemoryResponses = global.__parakh_inMemoryResponses;
const inMemoryBaselines = global.__parakh_inMemoryBaselines;

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
      return res.status(403).json({ success: false, error: 'Access denied: You cannot access another student\'s assessment' });
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
          answeredAt: r.answeredAt,
        };
      });
    } else if (inMemoryResponses.has(attemptId)) {
      const respMap = inMemoryResponses.get(attemptId);
      for (const [qId, r] of respMap.entries()) {
        savedResponses[qId] = {
          selectedOption: r.selectedOption,
          responseTimeSec: r.responseTimeSec,
          answeredAt: r.answeredAt,
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
 * Helper: Find attempt across DB and in-memory store
 */
async function findAttempt(attemptId) {
  let attempt = null;
  try {
    if (prisma) {
      attempt = await prisma.preAssessmentAttempt.findUnique({
        where: { id: attemptId },
        include: { responses: true },
      });
    }
  } catch {
    // Ignore DB error and fallback to memory
  }

  if (!attempt) {
    attempt = inMemoryAttempts.get(attemptId);
  }
  return attempt;
}

/**
 * POST /api/assessment/answer (Prompt 5)
 * Save or update a single question response in real time.
 * Validates student, verifies question belongs to assessment, prevents duplicates,
 * tracks time spent, and handles unanswered/null responses.
 */
async function recordAssessmentAnswer(req, res) {
  const studentId = req.student.id;
  const assessmentId = req.body.assessmentId || req.body.attemptId || req.params.attemptId;
  const { questionId, selectedOption, responseTimeSec = 0 } = req.body;

  if (!assessmentId) {
    return res.status(400).json({ success: false, error: 'assessmentId is required' });
  }

  if (!questionId) {
    return res.status(400).json({ success: false, error: 'questionId is required' });
  }

  try {
    const attempt = await findAttempt(assessmentId);

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Assessment attempt not found' });
    }

    // 1. Verify student ownership
    if (attempt.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You cannot modify another student\'s assessment',
      });
    }

    // Check if assessment is already completed
    if (attempt.status === 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Assessment is already completed' });
    }

    // Check expiration (15 minutes + 30s grace period)
    const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime();
    if (elapsedMs > ASSESSMENT_DURATION_MS + 30000) {
      return res.status(400).json({ success: false, error: 'Assessment time limit has expired' });
    }

    // 2. Verify that the question belongs to this assessment
    let qIds = [];
    try {
      qIds = typeof attempt.questionIds === 'string'
        ? JSON.parse(attempt.questionIds)
        : attempt.questionIds;
    } catch {
      qIds = [];
    }

    if (!qIds.includes(questionId)) {
      return res.status(400).json({
        success: false,
        error: 'Question does not belong to this assessment',
      });
    }

    // 3. Normalize option: null/undefined/empty string represents unanswered
    const normalizedOption = (selectedOption !== undefined && selectedOption !== null && selectedOption !== '')
      ? String(selectedOption).toUpperCase()
      : null;
    const timeTaken = Math.max(0, Number(responseTimeSec) || 0);
    const answeredAt = new Date();

    // 4. Save/update response in database (prevents duplicate response records)
    let savedDbRecord = null;
    try {
      if (prisma) {
        // Upsert by unique attemptId_questionId or find first
        const existingResp = await prisma.preAssessmentResponse.findFirst({
          where: { attemptId: assessmentId, questionId },
        });

        if (existingResp) {
          savedDbRecord = await prisma.preAssessmentResponse.update({
            where: { id: existingResp.id },
            data: {
              studentId,
              selectedOption: normalizedOption,
              responseTimeSec: timeTaken,
              answeredAt,
            },
          });
        } else {
          savedDbRecord = await prisma.preAssessmentResponse.create({
            data: {
              attemptId: assessmentId,
              studentId,
              questionId,
              selectedOption: normalizedOption,
              responseTimeSec: timeTaken,
              answeredAt,
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn('[PreAssessment] DB response save failed, using memory:', dbErr.message);
    }

    // 5. Save/update in-memory map
    if (!inMemoryResponses.has(assessmentId)) {
      inMemoryResponses.set(assessmentId, new Map());
    }

    const responseRecord = {
      studentId,
      assessmentId,
      questionId,
      selectedOption: normalizedOption,
      responseTimeSec: timeTaken,
      answeredAt,
    };
    inMemoryResponses.get(assessmentId).set(questionId, responseRecord);

    return res.status(200).json({
      success: true,
      message: 'Answer recorded successfully',
      data: {
        studentId,
        assessmentId,
        questionId,
        selectedOption: normalizedOption,
        responseTimeSec: timeTaken,
        isAnswered: normalizedOption !== null,
        answeredAt,
      },
    });
  } catch (err) {
    console.error('[PreAssessment] recordAssessmentAnswer error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record assessment answer' });
  }
}

/**
 * GET /api/assessment/:assessmentId/responses (Prompt 5)
 * Retrieve all responses saved for a specific assessment attempt.
 * Ensures student cannot access another student's responses and reports answered/unanswered counts.
 */
async function getAssessmentResponses(req, res) {
  const studentId = req.student.id;
  const { assessmentId } = req.params;

  if (!assessmentId) {
    return res.status(400).json({ success: false, error: 'assessmentId is required' });
  }

  try {
    const attempt = await findAttempt(assessmentId);

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Assessment attempt not found' });
    }

    // Ensure students cannot access another student's assessment responses
    if (attempt.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You cannot view another student\'s assessment responses',
      });
    }

    let qIds = [];
    try {
      qIds = typeof attempt.questionIds === 'string'
        ? JSON.parse(attempt.questionIds)
        : attempt.questionIds;
    } catch {
      qIds = [];
    }

    // Retrieve from DB or memory
    const responseMap = new Map();

    // From memory
    if (inMemoryResponses.has(assessmentId)) {
      for (const [qId, r] of inMemoryResponses.get(assessmentId).entries()) {
        responseMap.set(qId, r);
      }
    }

    // From DB if available
    try {
      if (prisma) {
        const dbResponses = await prisma.preAssessmentResponse.findMany({
          where: { attemptId: assessmentId },
        });
        dbResponses.forEach((r) => {
          responseMap.set(r.questionId, {
            studentId: r.studentId || studentId,
            assessmentId,
            questionId: r.questionId,
            selectedOption: r.selectedOption,
            responseTimeSec: r.responseTimeSec,
            answeredAt: r.answeredAt,
          });
        });
      }
    } catch {
      // Fallback to memory
    }

    // Build structured response array matching question order
    const responses = qIds.map((qId) => {
      const resp = responseMap.get(qId);
      return {
        questionId: qId,
        selectedOption: resp ? resp.selectedOption : null,
        responseTimeSec: resp ? resp.responseTimeSec : 0,
        answeredAt: resp ? resp.answeredAt : null,
        isAnswered: Boolean(resp && resp.selectedOption !== null),
      };
    });

    const totalQuestions = qIds.length;
    const answeredCount = responses.filter((r) => r.isAnswered).length;
    const unansweredCount = totalQuestions - answeredCount;

    return res.status(200).json({
      success: true,
      assessmentId,
      studentId,
      totalQuestions,
      answeredCount,
      unansweredCount,
      responses,
    });
  } catch (err) {
    console.error('[PreAssessment] getAssessmentResponses error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve responses' });
  }
}

/**
 * Legacy alias for backward compatibility:
 * POST /api/assessment/pre/:attemptId/response
 */
async function savePreAssessmentResponse(req, res) {
  req.body.assessmentId = req.params.attemptId || req.body.attemptId;
  return recordAssessmentAnswer(req, res);
}

/**
 * POST /api/assessment/finish (Prompt 6)
 * Server-side evaluation and baseline proficiency calculation:
 * - Total questions, correct, incorrect, unanswered
 * - Overall accuracy: (Correct answers / Total questions) * 100
 * - Topic accuracy: (Correct in topic / Attempted in topic) * 100
 * - Topics with 0 attempted questions marked as "unknown"
 * - Normalized ability score between 0 and 1 for each topic
 * - Strong topics (>= 70%) and weak topics (< 50%)
 * - Baseline level: 1 (Novice), 2 (Intermediate), 3 (Advanced)
 * - Persists BaselineResult in database
 */
async function finishPreAssessment(req, res) {
  const studentId = req.student.id;
  const assessmentId = req.body.assessmentId || req.body.attemptId;
  const { responses = [] } = req.body;

  if (!assessmentId) {
    return res.status(400).json({ success: false, error: 'assessmentId is required' });
  }

  try {
    const attempt = await findAttempt(assessmentId);

    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Assessment attempt not found' });
    }

    if (attempt.studentId !== studentId) {
      return res.status(403).json({ success: false, error: 'Access denied: You cannot finalize another student\'s assessment' });
    }

    questionBankAdapter.loadQuestions();

    // 1. Consolidate responses: DB/memory saved responses + payload responses
    const responseMap = new Map();

    // From in-memory store
    if (inMemoryResponses.has(assessmentId)) {
      for (const [qId, r] of inMemoryResponses.get(assessmentId).entries()) {
        responseMap.set(qId, r);
      }
    }

    // From DB if available
    try {
      if (prisma) {
        const dbResponses = await prisma.preAssessmentResponse.findMany({
          where: { attemptId: assessmentId },
        });
        dbResponses.forEach((r) => {
          responseMap.set(r.questionId, r);
        });
      }
    } catch {
      // Fallback
    }

    // Merge any submitted in payload
    if (Array.isArray(responses)) {
      responses.forEach((r) => {
        if (r && r.questionId) {
          responseMap.set(r.questionId, r);
        }
      });
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

    const CORE_TOPICS = ['Algebra', 'Geometry', 'Arithmetic', 'Trigonometry', 'Statistics'];
    const topicStats = {};
    for (const t of CORE_TOPICS) {
      topicStats[t] = { total: 0, attempted: 0, correct: 0, incorrect: 0, unanswered: 0 };
    }

    let correctAnswers = 0;
    let attemptedQuestions = 0;
    let unansweredQuestions = 0;

    // Evaluate answers strictly on server using question bank
    for (const qId of qIds) {
      const question = questionBankAdapter.getQuestionById(qId);
      if (!question) continue;

      const topicName = question.topic || 'General';
      if (!topicStats[topicName]) {
        topicStats[topicName] = { total: 0, attempted: 0, correct: 0, incorrect: 0, unanswered: 0 };
      }
      topicStats[topicName].total += 1;

      const studentResp = responseMap.get(qId);
      const selectedOption = studentResp ? studentResp.selectedOption : null;
      const isAttempted = selectedOption !== null && selectedOption !== undefined && selectedOption !== '';

      if (isAttempted) {
        attemptedQuestions += 1;
        topicStats[topicName].attempted += 1;

        const isCorrect = String(selectedOption).toUpperCase() === String(question.correctOption).toUpperCase();
        if (isCorrect) {
          correctAnswers += 1;
          topicStats[topicName].correct += 1;
        } else {
          topicStats[topicName].incorrect += 1;
        }
      } else {
        unansweredQuestions += 1;
        topicStats[topicName].unanswered += 1;
      }
    }

    const totalQuestions = attempt.totalQuestions || qIds.length || 10;
    const incorrectAnswers = attemptedQuestions - correctAnswers;

    // Formula 1: Overall accuracy = (Correct answers / Total questions) * 100
    const overallAccuracy = parseFloat(((correctAnswers / totalQuestions) * 100).toFixed(1));

    // Baseline CAT level derived from overall accuracy
    let baselineLevel = 2; // Default Medium
    if (overallAccuracy >= 70) baselineLevel = 3; // Hard
    else if (overallAccuracy < 40) baselineLevel = 1; // Easy

    // Formula 2: Topic-wise accuracy & normalized baseline proficiency (0.0 to 1.0)
    // Rule: For topics with no attempted questions, mark proficiency as "unknown" instead of zero.
    const topicAccuracy = {};
    const topicProficiency = {};
    const topicScores = {}; // Numeric 0-100 scores for Module 2 CAT engine compatibility
    const strongTopics = [];
    const weakTopics = [];
    const unknownTopics = [];
    const topicBreakdown = [];

    for (const [topic, stats] of Object.entries(topicStats)) {
      if (stats.attempted > 0) {
        const accuracyPct = parseFloat(((stats.correct / stats.attempted) * 100).toFixed(1));
        const normalizedScore = parseFloat((stats.correct / stats.attempted).toFixed(2));

        topicAccuracy[topic] = accuracyPct;
        topicProficiency[topic] = normalizedScore;
        topicScores[topic] = accuracyPct;

        if (accuracyPct >= 70) {
          strongTopics.push(topic);
        } else if (accuracyPct < 50) {
          weakTopics.push(topic);
        }

        topicBreakdown.push({
          topic,
          total: stats.total,
          attempted: stats.attempted,
          correct: stats.correct,
          incorrect: stats.incorrect,
          unanswered: stats.unanswered,
          accuracy: accuracyPct,
          proficiency: normalizedScore,
          status: accuracyPct >= 70 ? 'strong' : accuracyPct < 50 ? 'weak' : 'moderate',
        });
      } else {
        // Topics with no attempted questions: mark proficiency as "unknown"
        topicAccuracy[topic] = null;
        topicProficiency[topic] = 'unknown';
        topicScores[topic] = 50; // Neutral 50 for Module 2 CAT
        unknownTopics.push(topic);

        topicBreakdown.push({
          topic,
          total: stats.total,
          attempted: 0,
          correct: 0,
          incorrect: 0,
          unanswered: stats.total,
          accuracy: null,
          proficiency: 'unknown',
          status: 'unknown',
        });
      }
    }

    // Structured metadata for BaselineResult.topicProficiency Json field
    const baselineMetadata = {
      ...topicProficiency,
      topicAccuracy,
      topicScores,
      strongTopics,
      weakTopics,
      unknownTopics,
      baselineLevel,
      evaluatedAt: new Date().toISOString(),
    };

    // 1. Upsert BaselineResult in database
    const baselineRecord = {
      studentId,
      overallAccuracy,
      totalQuestions,
      correctAnswers,
      topicProficiency: baselineMetadata,
      updatedAt: new Date(),
    };

    try {
      if (prisma) {
        await prisma.baselineResult.upsert({
          where: { studentId },
          update: baselineRecord,
          create: baselineRecord,
        });
      }
    } catch (dbErr) {
      console.warn('[PreAssessment] Baseline upsert failed in DB, saving to memory:', dbErr.message);
    }
    inMemoryBaselines.set(studentId, baselineRecord);

    // 2. Mark attempt COMPLETED
    const now = new Date();
    try {
      if (prisma) {
        await prisma.preAssessmentAttempt.update({
          where: { id: assessmentId },
          data: {
            status: 'COMPLETED',
            completedAt: now,
            correctAnswers,
            topicProficiency: JSON.stringify(baselineMetadata),
          },
        });
      }
    } catch (dbErr) {
      console.warn('[PreAssessment] Attempt completion update in DB failed:', dbErr.message);
    }

    attempt.status = 'COMPLETED';
    attempt.completedAt = now;
    attempt.correctAnswers = correctAnswers;
    attempt.topicProficiency = baselineMetadata;
    inMemoryAttempts.set(assessmentId, attempt);

    return res.status(200).json({
      success: true,
      message: 'Assessment completed and baseline calculated successfully',
      attemptId: assessmentId,
      studentId,
      totalQuestions,
      attemptedQuestions,
      unansweredQuestions,
      correctAnswers,
      incorrectAnswers,
      totalScore: correctAnswers,
      overallAccuracy,
      baselineLevel,
      topicAccuracy,
      topicProficiency,
      strongTopics,
      weakTopics,
      unknownTopics,
      topicBreakdown,
    });
  } catch (err) {
    console.error('[PreAssessment] finishPreAssessment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to finalize pre-assessment.' });
  }
}

/**
 * GET /api/assessment/pre/result (Prompt 6)
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

    // Format topicProficiency if JSON string
    let proficiencyData = baseline.topicProficiency;
    if (typeof proficiencyData === 'string') {
      try {
        proficiencyData = JSON.parse(proficiencyData);
      } catch {
        proficiencyData = {};
      }
    }

    return res.json({
      success: true,
      baseline: {
        id: baseline.id,
        studentId: baseline.studentId,
        overallAccuracy: baseline.overallAccuracy,
        totalQuestions: baseline.totalQuestions,
        correctAnswers: baseline.correctAnswers,
        topicProficiency: proficiencyData,
        createdAt: baseline.createdAt,
        updatedAt: baseline.updatedAt,
      },
    });
  } catch (err) {
    console.error('[PreAssessment] getPreResult error:', err);
    return res.status(500).json({ success: false, error: 'Server error retrieving baseline.' });
  }
}

module.exports = {
  startPreAssessment,
  getPreAssessmentAttempt,
  recordAssessmentAnswer,
  getAssessmentResponses,
  savePreAssessmentResponse,
  finishPreAssessment,
  getPreResult,
  selectCuratedPreAssessmentQuestions,
  inMemoryAttempts,
  inMemoryResponses,
  inMemoryBaselines,
};
