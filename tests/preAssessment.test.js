/**
 * @file preAssessment.test.js
 * @description Unit tests for Pre-Assessment Initialization, Question Delivery,
 * Response Tracking (Prompt 5), and Baseline Evaluation (Prompt 6).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectCuratedPreAssessmentQuestions,
  startPreAssessment,
  getPreAssessmentAttempt,
  recordAssessmentAnswer,
  getAssessmentResponses,
  savePreAssessmentResponse,
  finishPreAssessment,
  getPreResult,
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
        body: { assessmentId: attemptId, questionId: q1Id, selectedOption: 'B', responseTimeSec: 25 },
      };
      const resSave = { json(d) { this.data = d; return this; }, status() { return this; } };
      await recordAssessmentAnswer(reqSave, resSave);

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
  // 4. PROMPT 5: RESPONSE TRACKING (POST /api/assessment/answer)
  // ──────────────────────────────────────────────────────────
  describe('Prompt 5: Response Tracking & Storage', () => {
    it('saves a response with studentId, assessmentId, questionId, selectedOption, and responseTimeSec', async () => {
      const reqStart = { student: { id: 501, email: 'student501@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const qId = resStart.data.questions[0].id;

      const reqAns = {
        student: { id: 501 },
        body: {
          assessmentId: attemptId,
          questionId: qId,
          selectedOption: 'A',
          responseTimeSec: 15.5,
        },
      };

      let statusCode = 0;
      let responseBody = null;
      const resAns = {
        status(c) { statusCode = c; return this; },
        json(d) { responseBody = d; return this; },
      };

      await recordAssessmentAnswer(reqAns, resAns);

      expect(statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.studentId).toBe(501);
      expect(responseBody.data.assessmentId).toBe(attemptId);
      expect(responseBody.data.questionId).toBe(qId);
      expect(responseBody.data.selectedOption).toBe('A');
      expect(responseBody.data.responseTimeSec).toBe(15.5);
      expect(responseBody.data.isAnswered).toBe(true);
    });

    it('updates response when question is changed without creating duplicate records', async () => {
      const reqStart = { student: { id: 502, email: 'student502@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const qId = resStart.data.questions[0].id;

      // First answer
      const req1 = {
        student: { id: 502 },
        body: { assessmentId: attemptId, questionId: qId, selectedOption: 'A', responseTimeSec: 10 },
      };
      const res1 = { status() { return this; }, json(d) { this.data = d; return this; } };
      await recordAssessmentAnswer(req1, res1);

      // Changed answer
      const req2 = {
        student: { id: 502 },
        body: { assessmentId: attemptId, questionId: qId, selectedOption: 'C', responseTimeSec: 22 },
      };
      const res2 = { status() { return this; }, json(d) { this.data = d; return this; } };
      await recordAssessmentAnswer(req2, res2);

      const attemptResponses = inMemoryResponses.get(attemptId);
      expect(attemptResponses.size).toBe(1); // Only 1 record for this question (no duplicate)
      const stored = attemptResponses.get(qId);
      expect(stored.selectedOption).toBe('C');
      expect(stored.responseTimeSec).toBe(22);
    });

    it('verifies that the question belongs to the assessment (rejects foreign questionId)', async () => {
      const reqStart = { student: { id: 503, email: 'student503@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;

      const reqInvalid = {
        student: { id: 503 },
        body: {
          assessmentId: attemptId,
          questionId: 'non-existent-question-id-999',
          selectedOption: 'A',
          responseTimeSec: 10,
        },
      };

      let statusCode = 0;
      let responseBody = null;
      const resInvalid = {
        status(c) { statusCode = c; return this; },
        json(d) { responseBody = d; return this; },
      };

      await recordAssessmentAnswer(reqInvalid, resInvalid);

      expect(statusCode).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('does not belong');
    });

    it('handles unanswered question by storing selectedOption as null', async () => {
      const reqStart = { student: { id: 504, email: 'student504@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const qId = resStart.data.questions[0].id;

      const reqUnanswered = {
        student: { id: 504 },
        body: {
          assessmentId: attemptId,
          questionId: qId,
          selectedOption: null, // explicit unanswered
          responseTimeSec: 5,
        },
      };

      const resUnanswered = { status() { return this; }, json(d) { this.data = d; return this; } };
      await recordAssessmentAnswer(reqUnanswered, resUnanswered);

      expect(resUnanswered.data.success).toBe(true);
      expect(resUnanswered.data.data.selectedOption).toBeNull();
      expect(resUnanswered.data.data.isAnswered).toBe(false);
    });

    it('prevents a student from submitting answers to another student assessment attempt', async () => {
      const reqStart = { student: { id: 505, email: 'student505@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const qId = resStart.data.questions[0].id;

      // Another student tries to answer
      const reqOther = {
        student: { id: 999 },
        body: { assessmentId: attemptId, questionId: qId, selectedOption: 'A' },
      };

      let statusCode = 0;
      const resOther = { status(c) { statusCode = c; return this; }, json() { return this; } };
      await recordAssessmentAnswer(reqOther, resOther);

      expect(statusCode).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. PROMPT 5: RETRIEVE RESPONSES (GET /api/assessment/:assessmentId/responses)
  // ──────────────────────────────────────────────────────────
  describe('Prompt 5: Assessment Responses Retrieval', () => {
    it('retrieves all responses with answered and unanswered counts', async () => {
      const reqStart = { student: { id: 550, email: 'student550@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const questions = resStart.data.questions;

      // Answer 3 of 10 questions
      for (let i = 0; i < 3; i++) {
        const reqAns = {
          student: { id: 550 },
          body: {
            assessmentId: attemptId,
            questionId: questions[i].id,
            selectedOption: 'B',
            responseTimeSec: 12,
          },
        };
        const resAns = { status() { return this; }, json() { return this; } };
        await recordAssessmentAnswer(reqAns, resAns);
      }

      // Fetch responses
      const reqFetch = {
        student: { id: 550 },
        params: { assessmentId: attemptId },
      };

      let statusCode = 0;
      let body = null;
      const resFetch = {
        status(c) { statusCode = c; return this; },
        json(d) { body = d; return this; },
      };

      await getAssessmentResponses(reqFetch, resFetch);

      expect(statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.assessmentId).toBe(attemptId);
      expect(body.studentId).toBe(550);
      expect(body.totalQuestions).toBe(10);
      expect(body.answeredCount).toBe(3);
      expect(body.unansweredCount).toBe(7);
      expect(body.responses.length).toBe(10);
    });

    it('rejects another student attempting to read responses with 403', async () => {
      const reqStart = { student: { id: 551, email: 'student551@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;

      const reqFetchOther = {
        student: { id: 999 },
        params: { assessmentId: attemptId },
      };

      let statusCode = 0;
      const resFetchOther = { status(c) { statusCode = c; return this; }, json() { return this; } };
      await getAssessmentResponses(reqFetchOther, resFetchOther);

      expect(statusCode).toBe(403);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 6. PROMPT 6: BASELINE PROFICIENCY & INITIAL SCORING
  // ──────────────────────────────────────────────────────────
  describe('Prompt 6: Initial Score & Baseline Proficiency Calculation', () => {
    it('marks unattempted topics as "unknown" instead of zero', async () => {
      const reqStart = { student: { id: 601, email: 'student601@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const questions = resStart.data.questions;

      // Only answer Algebra and Geometry questions; leave Trigonometry and Statistics unattempted
      const responses = [];
      for (const q of questions) {
        const fullQ = questionBankAdapter.getQuestionById(q.id);
        if (fullQ.topic === 'Algebra') {
          responses.push({ questionId: q.id, selectedOption: fullQ.correctOption, responseTimeSec: 20 });
        } else if (fullQ.topic === 'Geometry') {
          responses.push({ questionId: q.id, selectedOption: fullQ.correctOption, responseTimeSec: 25 });
        }
        // Do not add any responses for Arithmetic, Trigonometry, Statistics
      }

      const reqFinish = {
        student: { id: 601 },
        body: { attemptId, responses },
      };

      let finishBody = null;
      const resFinish = {
        status() { return this; },
        json(d) { finishBody = d; return this; },
      };

      await finishPreAssessment(reqFinish, resFinish);

      expect(finishBody.success).toBe(true);
      expect(finishBody.topicProficiency['Algebra']).toBe(1.0);
      expect(finishBody.topicProficiency['Geometry']).toBe(1.0);

      // PROMPT 6 REQUIREMENT: For topics with no attempted questions, mark proficiency as unknown instead of zero
      expect(finishBody.topicProficiency['Statistics']).toBe('unknown');
      expect(finishBody.topicProficiency['Trigonometry']).toBe('unknown');
      expect(finishBody.topicAccuracy['Statistics']).toBeNull();
      expect(finishBody.unknownTopics).toContain('Statistics');
      expect(finishBody.unknownTopics).toContain('Trigonometry');
    });

    it('calculates overall accuracy and identifies strong and weak topics correctly', async () => {
      const reqStart = { student: { id: 602, email: 'student602@college.edu' }, body: {} };
      const resStart = { status() { return this; }, json(d) { this.data = d; return this; } };
      await startPreAssessment(reqStart, resStart);
      const attemptId = resStart.data.attemptId;
      const questions = resStart.data.questions;

      // Answer 7 correct, 3 wrong across topics
      const responses = questions.map((q, idx) => {
        const fullQ = questionBankAdapter.getQuestionById(q.id);
        // Correct for first 7, wrong for next 3
        const selectedOption = idx < 7 ? fullQ.correctOption : 'Z';
        return {
          questionId: q.id,
          selectedOption,
          responseTimeSec: 20,
        };
      });

      const reqFinish = {
        student: { id: 602 },
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
      expect(finishBody.correctAnswers).toBe(7);
      expect(finishBody.overallAccuracy).toBe(70.0);
      expect(finishBody.baselineLevel).toBe(3); // Overall accuracy >= 70% -> Level 3

      // Strong topics should contain topics with >= 70% accuracy
      expect(finishBody.strongTopics.length).toBeGreaterThan(0);

      // Verify GET /api/assessment/pre/result returns the stored baseline
      const reqResult = { student: { id: 602 } };
      let resultBody = null;
      const resResult = {
        status() { return this; },
        json(d) { resultBody = d; return this; },
      };

      await getPreResult(reqResult, resResult);

      expect(resultBody.success).toBe(true);
      expect(resultBody.baseline.overallAccuracy).toBe(70.0);
      expect(resultBody.baseline.correctAnswers).toBe(7);
      expect(resultBody.baseline.topicProficiency).toBeDefined();
    });
  });

});
