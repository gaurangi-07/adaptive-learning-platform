/**
 * @file adaptiveService.js
 * @description Core business logic for the Adaptive Testing System.
 * Orchestrates assessment lifecycle, question delivery, answer evaluation,
 * difficulty adjustment, and summary generation.
 */

const { v4: uuidv4 } = require('uuid');
const { getPrismaClient } = require('../../prismaClient');
const { MockStudentBaselineAdapter } = require('../module1/adapters/mockStudentBaselineAdapter');
const { questionBankAdapter } = require('../module3/adapters/questionBankAdapter');
const { sanitizeQuestionForClient } = require('../module3/contracts/questionBankContract');
const {
  computeInitialDifficulty,
  selectNextTopic,
  selectQuestion,
  updateProficiency
} = require('./algorithms/adaptiveAlgorithm');
const { AppError } = require('./middleware/errorHandler');

const DEFAULT_QUESTION_COUNT = parseInt(process.env.SESSION_QUESTION_COUNT, 10) || 10;
const QUESTION_TIMEOUT_SECONDS = parseInt(process.env.QUESTION_TIMEOUT_SECONDS, 10) || 90;

class AdaptiveService {
  constructor(prismaOverride = null) {
    this._prisma = prismaOverride;
  }

  get prisma() {
    return this._prisma || getPrismaClient();
  }

  // ──────────────────────────────────────────────────────────
  // START ASSESSMENT
  // ──────────────────────────────────────────────────────────
  async startAssessment({ studentId, subject = 'Mathematics', baselineLevel, topicScores, totalQuestions }) {
    // Fetch baseline from Module 1 (mock or real)
    let baseline;
    if (baselineLevel && topicScores && Object.keys(topicScores).length > 0) {
      baseline = { studentId, subject, baselineLevel, topicScores };
    } else {
      baseline = await MockStudentBaselineAdapter.getStudentBaseline(studentId);
    }

    const questionCount = totalQuestions || DEFAULT_QUESTION_COUNT;

    // Create assessment record
    const assessment = await this.prisma.adaptiveAssessment.create({
      data: {
        studentId: baseline.studentId,
        subject: baseline.subject || subject,
        status: 'IN_PROGRESS',
        currentDifficulty: baseline.baselineLevel,
        totalQuestions: questionCount,
        answeredCount: 0,
        score: 0,
        accuracy: 0.0
      }
    });

    // Initialize topic proficiencies from baseline
    const topicEntries = Object.entries(baseline.topicScores);
    const proficiencyRecords = topicEntries.map(([topic, score]) => ({
      assessmentId: assessment.id,
      studentId: baseline.studentId,
      topic,
      initialScore: score,
      currentProficiency: score,
      currentDifficulty: computeInitialDifficulty(score),
      consecutiveCorrect: 0,
      recentOutcomes: '[]'
    }));

    await this.prisma.topicProficiency.createMany({ data: proficiencyRecords });

    const proficiencies = await this.prisma.topicProficiency.findMany({
      where: { assessmentId: assessment.id }
    });

    return {
      attemptId: assessment.id,
      studentId: assessment.studentId,
      subject: assessment.subject,
      totalQuestions: assessment.totalQuestions,
      startedAt: assessment.startedAt,
      topicProficiencies: proficiencies.map(tp => ({
        topic: tp.topic,
        initialScore: tp.initialScore,
        currentDifficulty: tp.currentDifficulty
      }))
    };
  }

  // ──────────────────────────────────────────────────────────
  // GET NEXT QUESTION
  // ──────────────────────────────────────────────────────────
  async getNextQuestion(attemptId) {
    const assessment = await this._getAssessment(attemptId);

    if (assessment.status !== 'IN_PROGRESS') {
      throw new AppError('This assessment has already been completed.', 400);
    }

    if (assessment.answeredCount >= assessment.totalQuestions) {
      // Auto-complete the assessment
      return await this._completeAssessment(assessment);
    }

    // Check if there's already an unanswered question pending
    const pendingQuestion = await this.prisma.assessmentQuestion.findFirst({
      where: {
        assessmentId: attemptId,
        response: null
      },
      orderBy: { presentedAt: 'desc' }
    });

    if (pendingQuestion) {
      // Check if this question has expired
      const elapsedMs = Date.now() - new Date(pendingQuestion.presentedAt).getTime();
      const allocatedMs = pendingQuestion.allocatedSeconds * 1000;

      if (elapsedMs > allocatedMs) {
        // Auto-expire: record as timed out
        await this._recordTimedOut(assessment, pendingQuestion);
        // Fall through to select next question
      } else {
        // Return existing pending question (without answer)
        return this._formatQuestionResponse(assessment, pendingQuestion);
      }
    }

    // Check if we've reached the question limit after timeout processing
    const refreshedAssessment = await this._getAssessment(attemptId);
    if (refreshedAssessment.answeredCount >= refreshedAssessment.totalQuestions) {
      return await this._completeAssessment(refreshedAssessment);
    }

    // Get used question IDs to prevent repetition
    const usedQuestionIds = await this._getUsedQuestionIds(attemptId);

    // Get topic proficiencies
    const proficiencies = await this.prisma.topicProficiency.findMany({
      where: { assessmentId: attemptId }
    });

    // Use algorithm to select next topic and difficulty
    const hasAvailable = (topic, difficulty, excludeIds) => {
      const questions = questionBankAdapter.getQuestions({
        subject: refreshedAssessment.subject,
        topic,
        difficulty,
        excludeIds
      });
      return questions.length > 0;
    };

    const selection = selectNextTopic(proficiencies, hasAvailable, usedQuestionIds);

    if (!selection) {
      // No more questions available at any difficulty in any topic
      return await this._completeAssessment(refreshedAssessment);
    }

    // Pick a specific question
    const candidateQuestions = questionBankAdapter.getQuestions({
      subject: refreshedAssessment.subject,
      topic: selection.topic,
      difficulty: selection.difficulty,
      excludeIds: usedQuestionIds
    });

    const selectedQ = selectQuestion(candidateQuestions);
    if (!selectedQ) {
      return await this._completeAssessment(refreshedAssessment);
    }

    // Record in database
    const assessmentQuestion = await this.prisma.assessmentQuestion.create({
      data: {
        assessmentId: attemptId,
        questionId: selectedQ.id,
        orderIndex: refreshedAssessment.answeredCount + 1,
        topic: selectedQ.topic,
        competency: selectedQ.competency,
        difficulty: selectedQ.difficulty,
        questionText: selectedQ.question,
        optionsJson: selectedQ.options,
        correctOption: selectedQ.correctOption,
        explanation: selectedQ.explanation || '',
        allocatedSeconds: QUESTION_TIMEOUT_SECONDS,
        presentedAt: new Date()
      }
    });

    return this._formatQuestionResponse(refreshedAssessment, assessmentQuestion);
  }

  // ──────────────────────────────────────────────────────────
  // SUBMIT ANSWER
  // ──────────────────────────────────────────────────────────
  async submitAnswer(attemptId, { assessmentQuestionId, selectedOption }) {
    const assessment = await this._getAssessment(attemptId);

    if (assessment.status !== 'IN_PROGRESS') {
      throw new AppError('This assessment has already been completed.', 400);
    }

    // Get the assessment question
    const assessmentQuestion = await this.prisma.assessmentQuestion.findUnique({
      where: { id: assessmentQuestionId },
      include: { response: true }
    });

    if (!assessmentQuestion) {
      throw new AppError('Question not found in this assessment.', 404);
    }

    if (assessmentQuestion.assessmentId !== attemptId) {
      throw new AppError('This question does not belong to the specified assessment.', 403);
    }

    // Duplicate submission protection
    if (assessmentQuestion.response) {
      throw new AppError('This question has already been answered.', 409);
    }

    const now = new Date();
    const startedAt = new Date(assessmentQuestion.presentedAt);
    const responseTimeMs = now.getTime() - startedAt.getTime();
    const responseTimeSec = Math.round(responseTimeMs / 100) / 10;

    // Check server-side expiration
    const allocatedMs = assessmentQuestion.allocatedSeconds * 1000;
    const isTimedOut = responseTimeMs > allocatedMs;

    // Evaluate answer
    const isCorrect = !isTimedOut && selectedOption === assessmentQuestion.correctOption;

    // Record response
    const studentResponse = await this.prisma.studentResponse.create({
      data: {
        assessmentId: attemptId,
        questionId: assessmentQuestion.questionId,
        assessmentQuestionId: assessmentQuestion.id,
        selectedOption: isTimedOut ? null : selectedOption,
        isCorrect,
        isTimedOut,
        startedAt,
        submittedAt: now,
        responseTimeMs,
        responseTimeSec,
        difficulty: assessmentQuestion.difficulty,
        topic: assessmentQuestion.topic
      }
    });

    // Update topic proficiency and difficulty
    const topicProf = await this.prisma.topicProficiency.findFirst({
      where: { assessmentId: attemptId, topic: assessmentQuestion.topic }
    });

    let difficultyDecision = null;
    if (topicProf) {
      const updates = updateProficiency(topicProf, isCorrect);
      difficultyDecision = updates.difficultyDecision;

      await this.prisma.topicProficiency.update({
        where: { id: topicProf.id },
        data: {
          currentProficiency: updates.currentProficiency,
          questionsAttempted: updates.questionsAttempted,
          questionsCorrect: updates.questionsCorrect,
          consecutiveCorrect: updates.consecutiveCorrect,
          currentDifficulty: updates.currentDifficulty,
          recentOutcomes: updates.recentOutcomes
        }
      });

      // Record difficulty history
      await this.prisma.difficultyHistory.create({
        data: {
          assessmentId: attemptId,
          topic: assessmentQuestion.topic,
          questionOrder: assessmentQuestion.orderIndex,
          previousDifficulty: difficultyDecision.previousDifficulty,
          newDifficulty: difficultyDecision.newDifficulty,
          reason: difficultyDecision.reason,
          details: difficultyDecision.details
        }
      });
    }

    // Update assessment counters
    const newAnsweredCount = assessment.answeredCount + 1;
    const newScore = assessment.score + (isCorrect ? 1 : 0);
    const newAccuracy = Math.round((newScore / newAnsweredCount) * 10000) / 100;

    await this.prisma.adaptiveAssessment.update({
      where: { id: attemptId },
      data: {
        answeredCount: newAnsweredCount,
        score: newScore,
        accuracy: newAccuracy
      }
    });

    const isComplete = newAnsweredCount >= assessment.totalQuestions;
    if (isComplete) {
      await this.prisma.adaptiveAssessment.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
    }

    return {
      questionId: assessmentQuestion.questionId,
      assessmentQuestionId,
      selectedOption: isTimedOut ? null : selectedOption,
      correctOption: assessmentQuestion.correctOption,
      isCorrect,
      isTimedOut,
      explanation: assessmentQuestion.explanation,
      responseTimeSec,
      difficulty: assessmentQuestion.difficulty,
      topic: assessmentQuestion.topic,
      difficultyChange: difficultyDecision ? {
        previous: difficultyDecision.previousDifficulty,
        new: difficultyDecision.newDifficulty,
        reason: difficultyDecision.reason,
        details: difficultyDecision.details
      } : null,
      progress: {
        answered: newAnsweredCount,
        total: assessment.totalQuestions,
        score: newScore,
        accuracy: newAccuracy,
        isComplete
      }
    };
  }

  // ──────────────────────────────────────────────────────────
  // GET RESPONSE HISTORY
  // ──────────────────────────────────────────────────────────
  async getHistory(attemptId) {
    const assessment = await this._getAssessment(attemptId);

    const responses = await this.prisma.studentResponse.findMany({
      where: { assessmentId: attemptId },
      include: {
        assessmentQuestion: {
          select: {
            orderIndex: true,
            questionText: true,
            optionsJson: true,
            correctOption: true,
            explanation: true,
            competency: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return {
      attemptId,
      studentId: assessment.studentId,
      subject: assessment.subject,
      status: assessment.status,
      responses: responses.map(r => ({
        order: r.assessmentQuestion.orderIndex,
        questionId: r.questionId,
        topic: r.topic,
        competency: r.assessmentQuestion.competency,
        difficulty: r.difficulty,
        questionText: r.assessmentQuestion.questionText,
        options: r.assessmentQuestion.optionsJson,
        selectedOption: r.selectedOption,
        correctOption: r.assessmentQuestion.correctOption,
        isCorrect: r.isCorrect,
        isTimedOut: r.isTimedOut,
        explanation: r.assessmentQuestion.explanation,
        responseTimeSec: r.responseTimeSec
      }))
    };
  }

  // ──────────────────────────────────────────────────────────
  // GET ASSESSMENT SUMMARY
  // ──────────────────────────────────────────────────────────
  async getSummary(attemptId) {
    const assessment = await this._getAssessment(attemptId);

    const responses = await this.prisma.studentResponse.findMany({
      where: { assessmentId: attemptId },
      orderBy: { createdAt: 'asc' }
    });

    const proficiencies = await this.prisma.topicProficiency.findMany({
      where: { assessmentId: attemptId }
    });

    const diffHistory = await this.prisma.difficultyHistory.findMany({
      where: { assessmentId: attemptId },
      orderBy: { createdAt: 'asc' }
    });

    // Topic breakdown
    const topicBreakdown = proficiencies.map(tp => {
      const topicResponses = responses.filter(r => r.topic === tp.topic);
      const topicCorrect = topicResponses.filter(r => r.isCorrect).length;
      const accuracyPct = topicResponses.length > 0
        ? Math.round((topicCorrect / topicResponses.length) * 10000) / 100
        : 0;

      let masteryStatus;
      if (tp.currentProficiency >= 80) masteryStatus = 'MASTERED';
      else if (tp.currentProficiency >= 60) masteryStatus = 'PROFICIENT';
      else if (tp.currentProficiency >= 40) masteryStatus = 'DEVELOPING';
      else masteryStatus = 'CRITICAL_ATTENTION';

      return {
        topic: tp.topic,
        initialScore: tp.initialScore,
        finalProficiency: tp.currentProficiency,
        deltaProficiency: Math.round((tp.currentProficiency - tp.initialScore) * 100) / 100,
        questionsAttempted: tp.questionsAttempted,
        questionsCorrect: tp.questionsCorrect,
        accuracyPercentage: accuracyPct,
        finalDifficultyLevel: tp.currentDifficulty,
        masteryStatus
      };
    });

    // Response time analytics
    const responseTimes = responses.map(r => r.responseTimeSec);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round((responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length) * 10) / 10
      : 0;
    const easyTimes = responses.filter(r => r.difficulty === 1).map(r => r.responseTimeSec);
    const mediumTimes = responses.filter(r => r.difficulty === 2).map(r => r.responseTimeSec);
    const hardTimes = responses.filter(r => r.difficulty === 3).map(r => r.responseTimeSec);
    const avg = arr => arr.length > 0 ? Math.round((arr.reduce((s, t) => s + t, 0) / arr.length) * 10) / 10 : null;

    let pacingInsight = 'No responses recorded.';
    if (responseTimes.length > 0) {
      if (avgResponseTime < 15) pacingInsight = 'Fast responder. The student answered quickly on average.';
      else if (avgResponseTime < 40) pacingInsight = 'Balanced pace. The student took a moderate amount of time per question.';
      else pacingInsight = 'Careful and deliberate. The student took their time on each question.';
    }

    const responseTimeAnalytics = {
      averageResponseTimeSeconds: avgResponseTime,
      fastestResponseTimeSeconds: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      slowestResponseTimeSeconds: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      averageByDifficulty: {
        easyLevel1: avg(easyTimes),
        mediumLevel2: avg(mediumTimes),
        hardLevel3: avg(hardTimes)
      },
      timedOutQuestionsCount: responses.filter(r => r.isTimedOut).length,
      pacingInsight
    };

    // Difficulty progression
    const difficultyProgression = diffHistory.map(dh => {
      const resp = responses.find(r => r.topic === dh.topic &&
        responses.indexOf(r) === dh.questionOrder - 1);
      return {
        questionOrder: dh.questionOrder,
        topic: dh.topic,
        questionDifficulty: dh.previousDifficulty,
        isCorrect: resp ? resp.isCorrect : false,
        responseTimeSec: resp ? resp.responseTimeSec : 0,
        resultingDifficulty: dh.newDifficulty,
        decisionReason: dh.reason
      };
    });

    // Recommended focus areas
    const recommendedFocusAreas = topicBreakdown
      .filter(t => t.masteryStatus === 'CRITICAL_ATTENTION' || t.masteryStatus === 'DEVELOPING')
      .sort((a, b) => a.finalProficiency - b.finalProficiency)
      .map(t => t.topic);

    const completedAt = assessment.completedAt || new Date();
    const durationSeconds = Math.round(
      (new Date(completedAt).getTime() - new Date(assessment.startedAt).getTime()) / 1000
    );

    return {
      attemptId: assessment.id,
      studentId: assessment.studentId,
      subject: assessment.subject,
      status: assessment.status,
      totalQuestions: assessment.totalQuestions,
      answeredCount: assessment.answeredCount,
      totalCorrect: assessment.score,
      overallScore: assessment.score,
      accuracyPercentage: assessment.accuracy,
      startedAt: assessment.startedAt.toISOString(),
      completedAt: new Date(completedAt).toISOString(),
      durationSeconds,
      topicBreakdown,
      responseTimeAnalytics,
      difficultyProgression,
      recommendedFocusAreas,
      exportedForModule3At: new Date().toISOString()
    };
  }

  // ──────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────

  async _getAssessment(attemptId) {
    const assessment = await this.prisma.adaptiveAssessment.findUnique({
      where: { id: attemptId }
    });
    if (!assessment) {
      throw new AppError('Assessment not found.', 404);
    }
    return assessment;
  }

  async _getUsedQuestionIds(attemptId) {
    const questions = await this.prisma.assessmentQuestion.findMany({
      where: { assessmentId: attemptId },
      select: { questionId: true }
    });
    return questions.map(q => q.questionId);
  }

  async _recordTimedOut(assessment, aq) {
    const now = new Date();
    const startedAt = new Date(aq.presentedAt);

    await this.prisma.studentResponse.create({
      data: {
        assessmentId: assessment.id,
        questionId: aq.questionId,
        assessmentQuestionId: aq.id,
        selectedOption: null,
        isCorrect: false,
        isTimedOut: true,
        startedAt,
        submittedAt: now,
        responseTimeMs: now.getTime() - startedAt.getTime(),
        responseTimeSec: Math.round((now.getTime() - startedAt.getTime()) / 100) / 10,
        difficulty: aq.difficulty,
        topic: aq.topic
      }
    });

    // Update proficiency (timed out counts as incorrect)
    const topicProf = await this.prisma.topicProficiency.findFirst({
      where: { assessmentId: assessment.id, topic: aq.topic }
    });

    if (topicProf) {
      const updates = updateProficiency(topicProf, false);

      await this.prisma.topicProficiency.update({
        where: { id: topicProf.id },
        data: {
          currentProficiency: updates.currentProficiency,
          questionsAttempted: updates.questionsAttempted,
          questionsCorrect: updates.questionsCorrect,
          consecutiveCorrect: updates.consecutiveCorrect,
          currentDifficulty: updates.currentDifficulty,
          recentOutcomes: updates.recentOutcomes
        }
      });

      await this.prisma.difficultyHistory.create({
        data: {
          assessmentId: assessment.id,
          topic: aq.topic,
          questionOrder: aq.orderIndex,
          previousDifficulty: updates.difficultyDecision.previousDifficulty,
          newDifficulty: updates.difficultyDecision.newDifficulty,
          reason: 'TIMED_OUT_' + updates.difficultyDecision.reason,
          details: `Question timed out. ${updates.difficultyDecision.details}`
        }
      });
    }

    await this.prisma.adaptiveAssessment.update({
      where: { id: assessment.id },
      data: {
        answeredCount: assessment.answeredCount + 1,
        accuracy: assessment.answeredCount + 1 > 0
          ? Math.round((assessment.score / (assessment.answeredCount + 1)) * 10000) / 100
          : 0
      }
    });
  }

  async _completeAssessment(assessment) {
    if (assessment.status !== 'COMPLETED') {
      await this.prisma.adaptiveAssessment.update({
        where: { id: assessment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
    }

    return {
      completed: true,
      message: 'Assessment completed.',
      attemptId: assessment.id,
      answeredCount: assessment.answeredCount,
      totalQuestions: assessment.totalQuestions,
      score: assessment.score,
      accuracy: assessment.accuracy
    };
  }

  _formatQuestionResponse(assessment, aq) {
    return {
      completed: false,
      attemptId: assessment.id,
      assessmentQuestionId: aq.id,
      questionNumber: aq.orderIndex,
      totalQuestions: assessment.totalQuestions,
      question: {
        id: aq.questionId,
        topic: aq.topic,
        competency: aq.competency,
        difficulty: aq.difficulty,
        questionText: aq.questionText,
        options: aq.optionsJson
      },
      allocatedSeconds: aq.allocatedSeconds,
      presentedAt: aq.presentedAt.toISOString(),
      progress: {
        answered: assessment.answeredCount,
        total: assessment.totalQuestions,
        percentComplete: Math.round((assessment.answeredCount / assessment.totalQuestions) * 100)
      }
    };
  }
}

module.exports = { AdaptiveService };

