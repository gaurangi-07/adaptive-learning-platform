/**
 * @file preAssessment.test.js
 * @description Unit tests for Pre-Assessment Initialization, Question Delivery,
 * Response Tracking, and Baseline Evaluation (Module 1).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectCuratedPreAssessmentQuestions,
  startPreAssessment,
  getPreAssessmentAttempt,
  savePreAssessmentResponse,
  finishPreAssessment,
  inMemoryAttempts,
  inMemoryResponses,
  inMemoryBaselines,
} from '../server/src/modules/module1/controllers/preAssessmentController.js';
import { questionBankAdapter } from '../server/src/modules/module3/adapters/questionBankAdapter.js';

describe('Module 1: Pre-Assessment Initialization & Assessment Engine', () => {

  beforeEach(() => {
    inMemoryAttempts.clear();
    inMemoryResponses.clear();
    inMemoryBaselines.clear();
    questionBankAdapter.loadQuestions();
  });

  // ──────────────────────────────────────────────────────────
  // 1. CURATED QUESTION SELECTION & INTEGRITY
  // ──────────────────────────────────────────────────────────
  describe('Curated Question Selection', () => {
    it('selects exactly 10 curated questions across 5 core topics', () => {
      const questions = selectCuratedPreAssessmentQuestions(10);

      expect(questions.length).toBe(10);

      const topics = new Set(questions.map((q) => q.topic.toLowerCase()));
      expect(topics.has('algebra')).toBe(true);
      expect(topics.has('geometry')).toBe(true);
      expect(topics.has('arithmetic')).toBe(true);
      expect(topics.has('trigonometry')).toBe(true);
      expect(topics.has('statistics')).toBe(true);
    });

    it('ensures an appropriate mix of difficulty levels (Level 1, 2, and 3)', () => {
      const questions = selectCuratedPreAssessmentQuestions(10);
      const difficulties = new Set(questions.map((q) => q.difficulty));

      expect(difficulties.has(1)).toBe(true); // Easy
      expect(difficulties.has(2)).toBe(true); // Medium
      expect(difficulties.has(3)).toBe(true); // Hard
    });

    it('contains all required question fields and options', () => {
      const questions = selectCuratedPreAssessmentQuestions(10);
      for (const q of questions) {
        expect(q.id).toBeDefined();
        expect(q.topic).toBeDefined();
        expect(q.difficulty).toBeGreaterThanOrEqual(1);
        expect(q.difficulty).toBeLessThanOrEqual(3);
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBe(4);
      }
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. ATTEMPT INITIALIZATION (POST /api/assessment/pre)
  // ──────────────────────────────────────────────────────────
  describe('Attempt Initialization (startPreAssessment)', () => {
    it('creates a new attempt and returns sanitized questions WITHOUT correctOption or explanation', async () => {
      const req = {
        student: { id: 101, email: 'student101@college.edu' },
        body: {},
      };

      let statusCode = 0;
      let responseBody = null;

      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { responseBody = data; return this; },
      };

      await startPreAssessment(req, res);

      expect(statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.attemptId).toBeDefined();
      expect(responseBody.durationMinutes).toBe(15);
      expect(responseBody.totalQuestions).toBe(10);
      expect(responseBody.questions.length).toBe(10);

      // SECURITY AUDIT: Verify no answer keys or explanations leaked to client
      for (const q of responseBody.questions) {
        expect(q.correctOption).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.options.length).toBe(4);
        for (const opt of q.options) {
          expect(opt.isCorrect).toBeUndefined();
        }
      }
    });

    it('prevents accidental duplicate active attempts by resuming ongoing attempt', async () => {
      const req = {
        student: { id: 202, email: 'student202@college.edu' },
        body: {},
      };

      const res1 = {
        status(c) { this.code = c; return this; },
        json(d) { this.data = d; return this; },
      };

      await startPreAssessment(req, res1);
      const firstAttemptId = res1.data.attemptId;
      expect(firstAttemptId).toBeDefined();

      // Trigger start again for same student
      const res2 = {
        status(c) { this.code = c; return this; },
        json(d) { this.data = d; return this; },
      };

      await startPreAssessment(req, res2);
      expect(res2.code).toBe(200);
      expect(res2.data.attemptId).toBe(firstAttemptId); // Resumed existing active attempt
      expect(res2.data.message).toContain('Resuming active');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. RETRIEVAL & RESTORATION (GET /api/assessment/pre/:attemptId)
  // ──────────────────────────────────────────────────────────
  describe('Attempt Retrieval & Answer Restoration', () => {
    it('restores attempt questions, remaining time, and previously saved responses', async () => {
      // 1. Initialize attempt
      const reqStart = { student: { id: 303, email: 'student303@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;

      // 2. Save a response to question 1
      const q1Id = resStart.data.questions[0].id;
      const reqSave = {
        student: { id: 303 },
        params: { attemptId },
        body: { questionId: q1Id, selectedOption: 'B', responseTimeSec: 25 },
      };
      const resSave = { json(d) { this.data = d; return this; }, status() { return this; } };
      await savePreAssessmentResponse(reqSave, resSave);

      // 3. Fetch attempt details (simulating page refresh)
      const reqGet = { student: { id: 303 }, params: { attemptId } };
      let getCode = 0;
      let getBody = null;
      const resGet = {
        status(c) { getCode = c; return this; },
        json(d) { getBody = d; return this; },
      };

      await getPreAssessmentAttempt(reqGet, resGet);

      expect(getBody.success).toBe(true);
      expect(getBody.questions.length).toBe(10);
      expect(getBody.savedResponses[q1Id]).toBeDefined();
      expect(getBody.savedResponses[q1Id].selectedOption).toBe('B');
      expect(getBody.savedResponses[q1Id].responseTimeSec).toBe(25);
      expect(getBody.attempt.remainingSeconds).toBeGreaterThan(0);
    });

    it('rejects access if attempt belongs to another student', async () => {
      const reqStart = { student: { id: 404, email: 'student404@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;

      // Request with different student ID
      const reqGet = { student: { id: 999 }, params: { attemptId } };
      let getCode = 0;
      const resGet = { status(c) { getCode = c; return this; }, json() { return this; } };

      await getPreAssessmentAttempt(reqGet, resGet);
      expect(getCode).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. REAL-TIME RESPONSE SAVING (POST /api/assessment/pre/:attemptId/response)
  // ──────────────────────────────────────────────────────────
  describe('Response Persistence', () => {
    it('persists response and updates response if question is changed', async () => {
      const reqStart = { student: { id: 505, email: 'student505@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const qId = resStart.data.questions[0].id;

      // Select 'A'
      const req1 = {
        student: { id: 505 },
        params: { attemptId },
        body: { questionId: qId, selectedOption: 'A', responseTimeSec: 10 },
      };
      const res1 = { json(d) { this.data = d; return this; }, status() { return this; } };
      await savePreAssessmentResponse(req1, res1);
      expect(res1.data.saved).toBe(true);

      // Change answer to 'C'
      const req2 = {
        student: { id: 505 },
        params: { attemptId },
        body: { questionId: qId, selectedOption: 'C', responseTimeSec: 18 },
      };
      const res2 = { json(d) { this.data = d; return this; }, status() { return this; } };
      await savePreAssessmentResponse(req2, res2);

      const stored = inMemoryResponses.get(attemptId).get(qId);
      expect(stored.selectedOption).toBe('C');
      expect(stored.responseTimeSec).toBe(18);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. ATTEMPT COMPLETION & BASELINE CALCULATION (POST /api/assessment/finish)
  // ──────────────────────────────────────────────────────────
  describe('Attempt Finalization & Baseline Evaluation', () => {
    it('calculates overall accuracy and topic proficiency, and marks attempt COMPLETED', async () => {
      const reqStart = { student: { id: 606, email: 'student606@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const questions = resStart.data.questions;

      // Answer questions with knowledge of question bank answers
      const responses = questions.map((q, idx) => {
        const fullQ = questionBankAdapter.getQuestionById(q.id);
        // Correct for first 7, incorrect for remaining 3
        const selectedOption = idx < 7 ? fullQ.correctOption : 'D';
        return {
          questionId: q.id,
          selectedOption,
          responseTimeSec: 20,
        };
      });

      const reqFinish = {
        student: { id: 606 },
        body: { attemptId, responses },
      };

      let finishBody = null;
      const resFinish = {
        status() { return this; },
        json(d) { finishBody = d; return this; },
      };

      await finishPreAssessment(reqFinish, resFinish);

      expect(finishBody.success).toBe(true);
      expect(finishBody.totalQuestions).toBe(10);
      expect(finishBody.correctAnswers).toBeGreaterThanOrEqual(7);
      expect(finishBody.overallAccuracy).toBeGreaterThanOrEqual(70.0);
      expect(finishBody.topicProficiency).toBeDefined();

      // Check normalized 0-1 topic proficiencies
      for (const [topic, score] of Object.entries(finishBody.topicProficiency)) {
        expect(score).toBeGreaterThanOrEqual(0.0);
        expect(score).toBeLessThanOrEqual(1.0);
      }

      // Check stored baseline
      const storedBaseline = inMemoryBaselines.get(606);
      expect(storedBaseline).toBeDefined();
      expect(storedBaseline.overallAccuracy).toBe(finishBody.overallAccuracy);

      // Verify attempt is marked COMPLETED
      const attempt = inMemoryAttempts.get(attemptId);
      expect(attempt.status).toBe('COMPLETED');
      expect(attempt.completedAt).toBeDefined();
    });
  });

});
