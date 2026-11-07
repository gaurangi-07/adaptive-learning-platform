/**
 * @file questionBankAdapter.js
 * @description Mock Adapter simulating Module 3 Question Bank interface.
 * Connects to the local sample questions repository until Module 3 AI question-bank service is online.
 */

const path = require('path');
const fs = require('fs');
const { QuestionBankItemSchema, sanitizeQuestionForClient } = require('../contracts/questionBankContract');

class QuestionBankAdapter {
  constructor() {
    this.questions = [];
    this.loadQuestions();
  }

  loadQuestions() {
    try {
      const questionsPath = path.resolve(__dirname, '../../../../mocks/questions.json');
      if (fs.existsSync(questionsPath)) {
        const raw = fs.readFileSync(questionsPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.questions = parsed.filter(q => q.approvalStatus === 'APPROVED');
      } else {
        this.questions = [];
      }
    } catch (err) {
      console.error('Error loading mock question bank:', err.message);
      this.questions = [];
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
    return this.questions.filter(q => {
      if (subject && q.subject.toLowerCase() !== subject.toLowerCase()) return false;
      if (topic && q.topic.toLowerCase() !== topic.toLowerCase()) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (excludeIds.includes(q.id)) return false;
      return true;
    });
  }

  /**
   * Retrieve a single question by ID (includes server-only answer & explanation).
   * @param {string} id
   */
  getQuestionById(id) {
    return this.questions.find(q => q.id === id) || null;
  }

  /**
   * Retrieve a single question by ID sanitized for client transmission.
   * @param {string} id
   */
  getSanitizedQuestionById(id) {
    const q = this.getQuestionById(id);
    return q ? sanitizeQuestionForClient(q) : null;
  }

  /**
   * Get all available topics in the question bank.
   */
  getAvailableTopics(subject = 'Mathematics') {
    const topics = new Set();
    this.questions.forEach(q => {
      if (!subject || q.subject.toLowerCase() === subject.toLowerCase()) {
        topics.add(q.topic);
      }
    });
    return Array.from(topics);
  }

  /**
   * Return total count of approved questions in the bank.
   */
  getTotalCount() {
    return this.questions.length;
  }
}

// Singleton instance
const questionBankAdapter = new QuestionBankAdapter();

module.exports = {
  QuestionBankAdapter,
  questionBankAdapter
};

