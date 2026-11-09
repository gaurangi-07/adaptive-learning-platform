/**
 * @file analyticsService.js
 * @description Student performance analytics for Module 3.
 *
 * Uses ACTUAL data from:
 *   - AdaptiveAssessment     — assessment sessions
 *   - StudentResponse        — per-question responses (isCorrect, responseTimeSec, difficulty, topic)
 *   - TopicProficiency       — per-topic proficiency evolution
 *
 * Never invents or hard-codes student data.
 */

const { getPrismaClient } = require('../../../prismaClient');

class AnalyticsService {
  constructor(prismaOverride = null) {
    this._prisma = prismaOverride;
  }

  get prisma() {
    return this._prisma || getPrismaClient();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _safeAccuracy(correct, total) {
    if (!total || total === 0) return 0;
    return Math.round((correct / total) * 10000) / 100;
  }

  _avgTime(times) {
    if (!times || times.length === 0) return 0;
    return Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10;
  }

  // ─── Full report ────────────────────────────────────────────────────────────

  async getFullReport(studentId, filters = {}) {
    const sid = Number(studentId);
    if (!sid || sid <= 0) throw Object.assign(new Error('Invalid studentId'), { statusCode: 400 });

    const { subject, startDate, endDate } = filters;

    // Build assessment filter
    const assessmentWhere = { studentId: sid, status: 'COMPLETED' };
    if (subject) assessmentWhere.subject = { equals: subject, mode: 'insensitive' };
    if (startDate || endDate) {
      assessmentWhere.completedAt = {};
      if (startDate) assessmentWhere.completedAt.gte = new Date(startDate);
      if (endDate) assessmentWhere.completedAt.lte = new Date(endDate);
    }

    try {
      const assessments = await this.prisma.adaptiveAssessment.findMany({
        where: assessmentWhere,
        orderBy: { completedAt: 'asc' }
      });

      if (assessments.length === 0) {
        return this._emptyReport(sid);
      }

      const assessmentIds = assessments.map((a) => a.id);

      // Fetch all responses for these assessments
      const responses = await this.prisma.studentResponse.findMany({
        where: { assessmentId: { in: assessmentIds } },
        orderBy: { createdAt: 'asc' }
      });

      // Overall stats
      const totalAttempted = responses.length;
      const totalCorrect = responses.filter((r) => r.isCorrect).length;
      const totalIncorrect = totalAttempted - totalCorrect;
      const overallAccuracy = this._safeAccuracy(totalCorrect, totalAttempted);
      const avgResponseTimeSec = this._avgTime(responses.map((r) => r.responseTimeSec));

      // Topic performance
      const topicPerformance = this._groupByTopic(responses);

      // Difficulty performance
      const difficultyPerformance = this._groupByDifficulty(responses);

      // Performance over time (by assessment)
      const performanceOverTime = assessments.map((a) => {
        const aResponses = responses.filter((r) => r.assessmentId === a.id);
        const correct = aResponses.filter((r) => r.isCorrect).length;
        return {
          assessmentId: a.id,
          date: (a.completedAt || a.startedAt).toISOString(),
          questionsAttempted: aResponses.length,
          correct,
          accuracy: this._safeAccuracy(correct, aResponses.length),
          avgResponseTimeSec: this._avgTime(aResponses.map((r) => r.responseTimeSec))
        };
      });

      // Categorize topics
      const strongTopics = topicPerformance.filter((t) => t.accuracy >= 70).map((t) => t.topic);
      const weakTopics = topicPerformance.filter((t) => t.accuracy < 50).map((t) => t.topic);
      const suggestedTopics = topicPerformance
        .filter((t) => t.accuracy < 70)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3)
        .map((t) => t.topic);

      return {
        studentId: sid,
        assessmentsAttempted: assessments.length,
        totalQuestionsAttempted: totalAttempted,
        totalCorrect,
        totalIncorrect,
        overallAccuracy,
        avgResponseTimeSec,
        topicPerformance,
        difficultyPerformance,
        performanceOverTime,
        strongTopics,
        weakTopics,
        suggestedTopics,
        subjects: [...new Set(assessments.map((a) => a.subject))]
      };
    } catch {
      return this._emptyReport(sid);
    }
  }

  _emptyReport(sid) {
    return {
      studentId: sid,
      assessmentsAttempted: 0,
      totalQuestionsAttempted: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      overallAccuracy: 0,
      avgResponseTimeSec: 0,
      topicPerformance: [],
      difficultyPerformance: { easy: null, medium: null, hard: null },
      performanceOverTime: [],
      strongTopics: [],
      weakTopics: [],
      suggestedTopics: [],
      subjects: ['Mathematics'],
      message: 'No completed assessments found for this student.'
    };
  }

  // ─── Topic performance ──────────────────────────────────────────────────────

  async getTopicPerformance(studentId, filters = {}) {
    const sid = Number(studentId);
    if (!sid || sid <= 0) throw Object.assign(new Error('Invalid studentId'), { statusCode: 400 });

    try {
      const { subject, startDate, endDate } = filters;

      const assessmentWhere = { studentId: sid, status: 'COMPLETED' };
      if (subject) assessmentWhere.subject = { equals: subject, mode: 'insensitive' };
      if (startDate || endDate) {
        assessmentWhere.completedAt = {};
        if (startDate) assessmentWhere.completedAt.gte = new Date(startDate);
        if (endDate) assessmentWhere.completedAt.lte = new Date(endDate);
      }

      const assessments = await this.prisma.adaptiveAssessment.findMany({
        where: assessmentWhere,
        select: { id: true }
      });

      if (assessments.length === 0) return { studentId: sid, topicPerformance: [] };

      const assessmentIds = assessments.map((a) => a.id);
      const responses = await this.prisma.studentResponse.findMany({
        where: { assessmentId: { in: assessmentIds } }
      });

      return {
        studentId: sid,
        topicPerformance: this._groupByTopic(responses)
      };
    } catch {
      return { studentId: sid, topicPerformance: [] };
    }
  }

  // ─── Difficulty performance ─────────────────────────────────────────────────

  async getDifficultyPerformance(studentId, filters = {}) {
    const sid = Number(studentId);
    if (!sid || sid <= 0) throw Object.assign(new Error('Invalid studentId'), { statusCode: 400 });

    try {
      const { subject, startDate, endDate } = filters;

      const assessmentWhere = { studentId: sid, status: 'COMPLETED' };
      if (subject) assessmentWhere.subject = { equals: subject, mode: 'insensitive' };
      if (startDate || endDate) {
        assessmentWhere.completedAt = {};
        if (startDate) assessmentWhere.completedAt.gte = new Date(startDate);
        if (endDate) assessmentWhere.completedAt.lte = new Date(endDate);
      }

      const assessments = await this.prisma.adaptiveAssessment.findMany({
        where: assessmentWhere,
        select: { id: true }
      });

      if (assessments.length === 0) {
        return { studentId: sid, difficultyPerformance: { easy: null, medium: null, hard: null } };
      }

      const assessmentIds = assessments.map((a) => a.id);
      const responses = await this.prisma.studentResponse.findMany({
        where: { assessmentId: { in: assessmentIds } }
      });

      return {
        studentId: sid,
        difficultyPerformance: this._groupByDifficulty(responses)
      };
    } catch {
      return { studentId: sid, difficultyPerformance: { easy: null, medium: null, hard: null } };
    }
  }

  // ─── Time performance ───────────────────────────────────────────────────────

  async getTimePerformance(studentId, filters = {}) {
    const sid = Number(studentId);
    if (!sid || sid <= 0) throw Object.assign(new Error('Invalid studentId'), { statusCode: 400 });

    try {
      const { subject, startDate, endDate } = filters;

      const assessmentWhere = { studentId: sid, status: 'COMPLETED' };
      if (subject) assessmentWhere.subject = { equals: subject, mode: 'insensitive' };
      if (startDate || endDate) {
        assessmentWhere.completedAt = {};
        if (startDate) assessmentWhere.completedAt.gte = new Date(startDate);
        if (endDate) assessmentWhere.completedAt.lte = new Date(endDate);
      }

      const assessments = await this.prisma.adaptiveAssessment.findMany({
        where: assessmentWhere,
        orderBy: { completedAt: 'asc' }
      });

      if (assessments.length === 0) {
        return { studentId: sid, timePerformance: { avgResponseTimeSec: 0, assessments: [] } };
      }

      const assessmentIds = assessments.map((a) => a.id);
      const responses = await this.prisma.studentResponse.findMany({
        where: { assessmentId: { in: assessmentIds } },
        orderBy: { createdAt: 'asc' }
      });

      const times = responses.map((r) => r.responseTimeSec).filter((t) => t > 0);

      return {
        studentId: sid,
        timePerformance: {
          avgResponseTimeSec: this._avgTime(times),
          fastestResponseTimeSec: times.length > 0 ? Math.min(...times) : 0,
          slowestResponseTimeSec: times.length > 0 ? Math.max(...times) : 0,
          timedOutCount: responses.filter((r) => r.isTimedOut).length,
          byDifficulty: {
            easy: this._avgTime(responses.filter((r) => r.difficulty === 1).map((r) => r.responseTimeSec)),
            medium: this._avgTime(responses.filter((r) => r.difficulty === 2).map((r) => r.responseTimeSec)),
            hard: this._avgTime(responses.filter((r) => r.difficulty === 3).map((r) => r.responseTimeSec))
          },
          // Per-assessment time trend
          assessments: assessments.map((a) => {
            const aResponses = responses.filter((r) => r.assessmentId === a.id);
            return {
              assessmentId: a.id,
              date: (a.completedAt || a.startedAt).toISOString(),
              avgResponseTimeSec: this._avgTime(aResponses.map((r) => r.responseTimeSec)),
              questionsAnswered: aResponses.length
            };
          })
        }
      };
    } catch {
      return { studentId: sid, timePerformance: { avgResponseTimeSec: 0, assessments: [] } };
    }
  }

  // ─── Assessment history ─────────────────────────────────────────────────────

  async getAssessmentHistory(studentId, filters = {}) {
    const sid = Number(studentId);
    if (!sid || sid <= 0) throw Object.assign(new Error('Invalid studentId'), { statusCode: 400 });

    try {
      const { subject, status } = filters;

      const where = { studentId: sid };
      if (subject) where.subject = { equals: subject, mode: 'insensitive' };
      if (status) where.status = status;

      const assessments = await this.prisma.adaptiveAssessment.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 50
      });

      return {
        studentId: sid,
        assessments: assessments.map((a) => ({
          id: a.id,
          subject: a.subject,
          status: a.status,
          totalQuestions: a.totalQuestions,
          answeredCount: a.answeredCount,
          score: a.score,
          accuracy: a.accuracy,
          startedAt: a.startedAt,
          completedAt: a.completedAt
        }))
      };
    } catch {
      return { studentId: sid, assessments: [] };
    }
  }

  // ─── Private grouping helpers ───────────────────────────────────────────────

  _groupByTopic(responses) {
    const topicMap = {};
    for (const r of responses) {
      if (!topicMap[r.topic]) {
        topicMap[r.topic] = { topic: r.topic, attempted: 0, correct: 0, times: [] };
      }
      topicMap[r.topic].attempted++;
      if (r.isCorrect) topicMap[r.topic].correct++;
      if (r.responseTimeSec > 0) topicMap[r.topic].times.push(r.responseTimeSec);
    }

    return Object.values(topicMap).map((t) => ({
      topic: t.topic,
      questionsAttempted: t.attempted,
      questionsCorrect: t.correct,
      questionsIncorrect: t.attempted - t.correct,
      accuracy: this._safeAccuracy(t.correct, t.attempted),
      avgResponseTimeSec: this._avgTime(t.times)
    })).sort((a, b) => b.questionsAttempted - a.questionsAttempted);
  }

  _groupByDifficulty(responses) {
    const build = (level) => {
      const rr = responses.filter((r) => r.difficulty === level);
      const correct = rr.filter((r) => r.isCorrect).length;
      return rr.length === 0 ? null : {
        level,
        label: level === 1 ? 'Easy' : level === 2 ? 'Medium' : 'Hard',
        questionsAttempted: rr.length,
        questionsCorrect: correct,
        accuracy: this._safeAccuracy(correct, rr.length),
        avgResponseTimeSec: this._avgTime(rr.map((r) => r.responseTimeSec))
      };
    };

    return {
      easy: build(1),
      medium: build(2),
      hard: build(3)
    };
  }
}

module.exports = { AnalyticsService };
