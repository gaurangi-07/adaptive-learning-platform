/**
 * @file questionBankAdapter.js
 * @description Module 3 Question Bank Adapter.
 *
 * Provides approved questions to Module 2's Adaptive Testing Engine.
 *
 * Strategy (in order of preference):
 *   1. If a Prisma client is available AND ENABLE_MOCK_QUESTION_BANK !== "true",
 *      queries the live PostgreSQL Question table (Module 3 database).
 *   2. Falls back to the JSON mock file for local development or when the DB is unavailable.
 *
 * Module 2 uses this adapter via the singleton `questionBankAdapter` export.
 * Module 3 calls `questionBankAdapter.reload()` after approving/rejecting questions.
 */

const path = require('path');
const fs = require('fs');
const { sanitizeQuestionForClient } = require('../contracts/questionBankContract');

class QuestionBankAdapter {
  constructor() {
    this.questions = [];
    this._loaded = false;
  }

  /**
   * Determine if we should use the live Prisma DB.
   */
  _shouldUseLiveDB() {
    if (!process.env.DATABASE_URL) return false;
    const mockEnabled = process.env.ENABLE_MOCK_QUESTION_BANK === 'true';
    if (mockEnabled) return false;
    try {
      const { getPrismaClient } = require('../../../prismaClient');
      const prisma = getPrismaClient();
      return Boolean(prisma);
    } catch {
      return false;
    }
  }

  /**
   * Load questions from the live Prisma DB (approved only).
   */
  async _loadFromDB() {
    try {
      const { getPrismaClient } = require('../../../prismaClient');
      const prisma = getPrismaClient();
      const dbQuestions = await prisma.question.findMany({
        where: { status: 'APPROVED' },
        include: { options: { orderBy: { optionLabel: 'asc' } } }
      });

      this.questions = dbQuestions.map((q) => ({
        id: q.id,
        subject: q.subject,
        topic: q.topic,
        competency: q.competency || '',
        difficulty: q.difficulty,
        question: q.questionText,
        options: q.options.map((o) => ({ id: o.optionLabel, text: o.optionText })),
        correctOption: q.correctOption,
        explanation: q.explanation,
        approvalStatus: 'APPROVED'
      }));

      this._loaded = true;
      console.log(`[QuestionBankAdapter] Loaded ${this.questions.length} approved questions from DB.`);
    } catch (err) {
      console.warn('[QuestionBankAdapter] DB load failed, falling back to mock JSON:', err.message);
      this._loadFromFile();
    }
  }

  /**
   * Load questions from the JSON mock file.
   */
  _loadFromFile() {
    try {
      const candidatePaths = [
        path.resolve(__dirname, '../../../../../mocks/questions.json'),
        path.resolve(__dirname, '../../../../mocks/questions.json'),
        path.resolve(process.cwd(), 'mocks/questions.json'),
        path.resolve(process.cwd(), '../mocks/questions.json')
      ];
      const questionsPath = candidatePaths.find((p) => fs.existsSync(p));

      if (questionsPath) {
        const raw = fs.readFileSync(questionsPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.questions = parsed.filter((q) => q.approvalStatus === 'APPROVED');
      } else {
        this.questions = [];
      }
      this._loaded = true;
      console.log(`[QuestionBankAdapter] Loaded ${this.questions.length} questions from mock JSON.`);
    } catch (err) {
      console.error('[QuestionBankAdapter] Error loading mock question bank:', err.message);
      this.questions = [];
      this._loaded = true;
    }
  }

  /**
   * Initialize the adapter (called once at startup and after status changes).
   */
  loadQuestions() {
    // Synchronous path for backward compatibility with Module 2 startup
    if (this._shouldUseLiveDB()) {
      // Kick off async load; for the synchronous path use mock as initial placeholder
      this._loadFromFile();
      this._loadFromDB().catch(() => {}); // also queue live refresh
    } else {
      this._loadFromFile();
    }
  }

  /**
   * Reload questions asynchronously (called after question approval/rejection).
   */
  async reload() {
    if (this._shouldUseLiveDB()) {
      await this._loadFromDB();
    } else {
      this._loadFromFile();
    }
  }

  /**
   * Query approved questions matching criteria.
   * @param {object} criteria
   * @param {string} [criteria.subject]
   * @param {string} [criteria.topic]
   * @param {number} [criteria.difficulty]
   * @param {string[]} [criteria.excludeIds]
   * @returns {Array<object>}
   */
  getQuestions({ subject, topic, difficulty, excludeIds = [] }) {
    return this.questions.filter((q) => {
      if (subject && q.subject.toLowerCase() !== subject.toLowerCase()) return false;
      if (topic && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (excludeIds.includes(q.id)) return false;
      return true;
    });
  }

  /**
   * Retrieve a single question by ID (server-side: includes answer & explanation).
   * @param {string} id
   */
  getQuestionById(id) {
    return this.questions.find((q) => q.id === id) || null;
  }

  /**
   * Retrieve a single question by ID sanitized for client transmission.
   * Never exposes correctOption or explanation.
   * @param {string} id
   */
  getSanitizedQuestionById(id) {
    const q = this.getQuestionById(id);
    return q ? sanitizeQuestionForClient(q) : null;
  }

  /**
   * Get all available topics in the question bank.
   * @param {string} [subject]
   */
  getAvailableTopics(subject = 'Mathematics') {
    const topics = new Set();
    this.questions.forEach((q) => {
      if (!subject || q.subject.toLowerCase() === subject.toLowerCase()) {
        topics.add(q.topic);
      }
    });
    return Array.from(topics);
  }

  /**
   * Return total count of approved questions.
   */
  getTotalCount() {
    return this.questions.length;
  }
}

// Singleton instance used throughout the application
const questionBankAdapter = new QuestionBankAdapter();
questionBankAdapter.loadQuestions();

module.exports = {
  QuestionBankAdapter,
  questionBankAdapter
};
