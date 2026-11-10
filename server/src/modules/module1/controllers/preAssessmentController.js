// controllers/preAssessmentController.js
// -------------------------------------------------------------------
// Pre‑assessment lifecycle: start, finish, fetch result.
// -------------------------------------------------------------------

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { AssessmentStatus } = require('@prisma/client'); // enum

/**
 * POST /api/assessment/pre
 * Create a new pre‑assessment attempt and return a curated list of questions.
 * Body may contain optional `questionCount` (default 10).
 */
async function startPreAssessment(req, res) {
  const studentId = req.student.id;
  const { questionCount = 10 } = req.body;
  try {
    // Prevent duplicate active attempts
    const existing = await prisma.preAssessmentAttempt.findFirst({
      where: { studentId, completedAt: null },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'An active pre‑assessment already exists' });
    }

    // For demo we fetch the first `questionCount` APPROVED questions.
    // In a real app you would ensure topic coverage & difficulty mix.
    const questions = await prisma.question.findMany({
      where: { status: 'APPROVED' },
      take: Number(questionCount),
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        topic: true,
        difficulty: true,
        questionText: true,
        optionsJson: true,
        // deliberately omit correctOption
      },
    });

    // Record the attempt
    const attempt = await prisma.preAssessmentAttempt.create({
      data: {
        studentId,
        totalQuestions: questions.length,
        questionIds: JSON.stringify(questions.map((q) => q.id)),
      },
    });

    return res.status(201).json({
      success: true,
      attemptId: attempt.id,
      questions,
    });
  } catch (err) {
    console.error('startPreAssessment error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * POST /api/assessment/finish
 * Calculate baseline scores and store the result.
 * Expected body: { attemptId, responses: [{questionId, selectedOption, responseTimeSec}] }
 */
async function finishPreAssessment(req, res) {
  const studentId = req.student.id;
  const { attemptId, responses } = req.body;
  if (!attemptId || !Array.isArray(responses)) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }
  try {
    const attempt = await prisma.preAssessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { student: true },
    });
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    if (attempt.studentId !== studentId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Save each response
    for (const r of responses) {
      await prisma.preAssessmentResponse.create({
        data: {
          attemptId,
          questionId: r.questionId,
          selectedOption: r.selectedOption,
          responseTimeSec: r.responseTimeSec,
        },
      });
    }

    // Fetch correct options for scoring
    const questionIds = responses.map((r) => r.questionId);
    const questionMap = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctOption: true, topic: true },
    }).then((qs) => qs.reduce((acc, q) => (acc[q.id] = q, acc), {}));

    let correctAnswers = 0;
    const topicStats = {};
    for (const r of responses) {
      const q = questionMap[r.questionId];
      if (!q) continue;
      const isCorrect = r.selectedOption && r.selectedOption === q.correctOption;
      if (isCorrect) correctAnswers++;
      // tally per topic (only attempted questions)
      if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, attempted: 0 };
      topicStats[q.topic].attempted++;
      if (isCorrect) topicStats[q.topic].correct++;
    }

    const overallAccuracy = (correctAnswers / attempt.totalQuestions) * 100;
    const topicProficiency = {};
    for (const [topic, stats] of Object.entries(topicStats)) {
      const acc = (stats.correct / stats.attempted) * 100;
      // normalize to 0‑1 scale as requested
      topicProficiency[topic] = parseFloat((acc / 100).toFixed(2));
    }

    // Store BaselineResult (model exists)
    await prisma.baselineResult.upsert({
      where: { studentId },
      update: {
        overallAccuracy,
        totalQuestions: attempt.totalQuestions,
        correctAnswers,
        topicProficiency,
        updatedAt: new Date(),
      },
      create: {
        studentId,
        overallAccuracy,
        totalQuestions: attempt.totalQuestions,
        correctAnswers,
        topicProficiency,
      },
    });

    // Mark attempt as completed
    await prisma.preAssessmentAttempt.update({
      where: { id: attemptId },
      data: { completedAt: new Date(), status: AssessmentStatus.COMPLETED, correctAnswers },
    });

    return res.json({ success: true, overallAccuracy, topicProficiency });
  } catch (err) {
    console.error('finishPreAssessment error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * GET /api/assessment/pre/result
 * Return the latest baseline result for the authenticated student.
 */
async function getPreResult(req, res) {
  const studentId = req.student.id;
  try {
    const baseline = await prisma.baselineResult.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    if (!baseline) {
      return res.status(404).json({ success: false, error: 'No baseline result' });
    }
    return res.json({ success: true, baseline });
  } catch (err) {
    console.error('getPreResult error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = { startPreAssessment, finishPreAssessment, getPreResult };
