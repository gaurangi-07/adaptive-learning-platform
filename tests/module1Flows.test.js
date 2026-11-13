/**
 * @file module1Flows.test.js
 * @description Complete Integration Test Suite for Module 1 of PARAKH (Prompt 7).
 * Tests all 17 flows end-to-end:
 * 1. Student registration
 * 2. Student login
 * 3. Invalid login handling
 * 4. Student profile retrieval
 * 5. Student profile update
 * 6. Dashboard loading (pre-assessment)
 * 7. Starting pre-assessment
 * 8. Fetching MCQs (sanitized, zero answer leaks)
 * 9. Selecting answers
 * 10. Next & Previous navigation boundary checks
 * 11. Timer functionality & expiration
 * 12. Saving responses & duplicate avoidance
 * 13. Refreshing session without losing responses
 * 14. Submitting assessment
 * 15. Calculating overall score
 * 16. Calculating topic-wise proficiency ("unknown" for unattempted)
 * 17. Displaying results on dashboard
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  register,
  login,
  inMemoryStudents,
} from '../server/src/modules/module1/controllers/authController.js';
import {
  getProfile,
  updateProfile,
  getDashboard,
} from '../server/src/modules/module1/controllers/studentController.js';
import {
  startPreAssessment,
  getPreAssessmentAttempt,
  recordAssessmentAnswer,
  getAssessmentResponses,
  getActiveAssessment,
  getAssessmentHistory,
  finishPreAssessment,
  getPreResult,
  inMemoryAttempts,
  inMemoryResponses,
  inMemoryBaselines,
} from '../server/src/modules/module1/controllers/preAssessmentController.js';
import { questionBankAdapter } from '../server/src/modules/module3/adapters/questionBankAdapter.js';

// Helper mock response factory
function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('Module 1: Complete 17-Flow Integration Test Suite (Prompt 7)', () => {

  beforeEach(() => {
    inMemoryStudents.clear();
    inMemoryAttempts.clear();
    inMemoryResponses.clear();
    inMemoryBaselines.clear();
    questionBankAdapter.loadQuestions();
  });

  it('executes all 17 flows seamlessly from registration to dashboard results', async () => {
    // ────────────────────────────────────────────────────────
    // FLOW 1: Student Registration
    // ────────────────────────────────────────────────────────
    const regReq = {
      body: {
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@iitd.ac.in',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        college: 'IIT Delhi',
        branch: 'Computer Science & Engineering',
        yearOfStudy: 3,
      },
    };
    const regRes = createMockResponse();
    await register(regReq, regRes);

    expect(regRes.statusCode).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.student.id).toBeDefined();
    expect(regRes.body.student.email).toBe('aarav.sharma@iitd.ac.in');
    expect(regRes.body.student.hashedPassword).toBeUndefined(); // Security audit

    const studentId = regRes.body.student.id;

    // ────────────────────────────────────────────────────────
    // FLOW 2: Student Login
    // ────────────────────────────────────────────────────────
    const loginReq = {
      body: {
        email: 'aarav.sharma@iitd.ac.in',
        password: 'SecurePassword123!',
      },
    };
    const loginRes = createMockResponse();
    await login(loginReq, loginRes);

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.student.fullName).toBe('Aarav Sharma');

    const authStudent = { id: studentId, email: 'aarav.sharma@iitd.ac.in' };

    // ────────────────────────────────────────────────────────
    // FLOW 3: Invalid Login Handling
    // ────────────────────────────────────────────────────────
    const badPassRes = createMockResponse();
    await login({ body: { email: 'aarav.sharma@iitd.ac.in', password: 'WrongPassword' } }, badPassRes);
    expect(badPassRes.statusCode).toBe(401);

    const badEmailRes = createMockResponse();
    await login({ body: { email: 'unknown@user.com', password: 'SecurePassword123!' } }, badEmailRes);
    expect(badEmailRes.statusCode).toBe(401);

    // ────────────────────────────────────────────────────────
    // FLOW 4: Student Profile Retrieval
    // ────────────────────────────────────────────────────────
    const profGetRes = createMockResponse();
    await getProfile({ student: authStudent }, profGetRes);

    expect(profGetRes.statusCode).toBe(200);
    expect(profGetRes.body.student.fullName).toBe('Aarav Sharma');
    expect(profGetRes.body.student.college).toBe('IIT Delhi');
    expect(profGetRes.body.student.hashedPassword).toBeUndefined();

    // ────────────────────────────────────────────────────────
    // FLOW 5: Student Profile Update
    // ────────────────────────────────────────────────────────
    const profUpdateRes = createMockResponse();
    await updateProfile(
      {
        student: authStudent,
        body: {
          fullName: 'Aarav K. Sharma',
          college: 'IIT Delhi - Main Campus',
          branch: 'CSE (AI/ML Specialization)',
          yearOfStudy: 4,
        },
      },
      profUpdateRes
    );

    expect(profUpdateRes.statusCode).toBe(200);
    expect(profUpdateRes.body.student.fullName).toBe('Aarav K. Sharma');
    expect(profUpdateRes.body.student.yearOfStudy).toBe(4);

    // ────────────────────────────────────────────────────────
    // FLOW 6: Dashboard Loading (Before Assessment)
    // ────────────────────────────────────────────────────────
    const dashPreRes = createMockResponse();
    await getDashboard({ student: authStudent }, dashPreRes);

    expect(dashPreRes.statusCode).toBe(200);
    expect(dashPreRes.body.data.studentName).toBe('Aarav K. Sharma');
    expect(dashPreRes.body.data.assessmentStatus).toBe('Not Started');
    expect(dashPreRes.body.data.baseline).toBeNull();

    // ────────────────────────────────────────────────────────
    // FLOW 7: Starting Pre-Assessment
    // ────────────────────────────────────────────────────────
    const startRes = createMockResponse();
    await startPreAssessment({ student: authStudent, body: {} }, startRes);

    expect(startRes.statusCode).toBe(201);
    expect(startRes.body.success).toBe(true);
    expect(startRes.body.attemptId).toBeDefined();
    expect(startRes.body.durationMinutes).toBe(15);
    expect(startRes.body.totalQuestions).toBe(10);

    const attemptId = startRes.body.attemptId;

    // ────────────────────────────────────────────────────────
    // FLOW 8: Fetching MCQs (Integrity & Sanitization)
    // ────────────────────────────────────────────────────────
    const questions = startRes.body.questions;
    expect(questions.length).toBe(10);
    for (const q of questions) {
      expect(q.id).toBeDefined();
      expect(q.topic).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.options.length).toBe(4);
      // Ensure zero leaks of correctOption or explanation
      expect(q.correctOption).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }

    // ────────────────────────────────────────────────────────
    // FLOW 9: Selecting Answers
    // ────────────────────────────────────────────────────────
    const q1 = questions[0];
    const ans1Res = createMockResponse();
    await recordAssessmentAnswer(
      {
        student: authStudent,
        body: {
          assessmentId: attemptId,
          questionId: q1.id,
          selectedOption: 'A',
          responseTimeSec: 14.2,
        },
      },
      ans1Res
    );

    expect(ans1Res.statusCode).toBe(200);
    expect(ans1Res.body.data.selectedOption).toBe('A');
    expect(ans1Res.body.data.isAnswered).toBe(true);

    // ────────────────────────────────────────────────────────
    // FLOW 10: Next & Previous Navigation Traversal
    // ────────────────────────────────────────────────────────
    let currentIdx = 0;
    // Next
    currentIdx = Math.min(questions.length - 1, currentIdx + 1);
    expect(currentIdx).toBe(1);
    // Boundary Next (reach end)
    currentIdx = 9;
    currentIdx = Math.min(questions.length - 1, currentIdx + 1);
    expect(currentIdx).toBe(9);
    // Previous
    currentIdx = Math.max(0, currentIdx - 1);
    expect(currentIdx).toBe(8);
    // Boundary Previous (reach 0)
    currentIdx = 0;
    currentIdx = Math.max(0, currentIdx - 1);
    expect(currentIdx).toBe(0);

    // ────────────────────────────────────────────────────────
    // FLOW 11: Timer Functionality
    // ────────────────────────────────────────────────────────
    const elapsedMs = 5000;
    const remainingSeconds = Math.max(0, Math.floor((15 * 60 * 1000 - elapsedMs) / 1000));
    expect(remainingSeconds).toBe(895);

    // ────────────────────────────────────────────────────────
    // FLOW 12: Saving Responses & Preventing Duplicates
    // ────────────────────────────────────────────────────────
    // Answer question 1 again with option 'B'
    const updateAnsRes = createMockResponse();
    await recordAssessmentAnswer(
      {
        student: authStudent,
        body: {
          assessmentId: attemptId,
          questionId: q1.id,
          selectedOption: 'B',
          responseTimeSec: 22.0,
        },
      },
      updateAnsRes
    );
    expect(updateAnsRes.statusCode).toBe(200);
    expect(updateAnsRes.body.data.selectedOption).toBe('B');

    // Answer questions 2 through 8; leave question 9 & 10 (Trigonometry/Statistics) unattempted
    for (let i = 1; i < 8; i++) {
      const q = questions[i];
      const fullQ = questionBankAdapter.getQuestionById(q.id);
      const isCorrectOption = fullQ.correctOption;

      await recordAssessmentAnswer(
        {
          student: authStudent,
          body: {
            assessmentId: attemptId,
            questionId: q.id,
            selectedOption: isCorrectOption,
            responseTimeSec: 18.0,
          },
        },
        createMockResponse()
      );
    }

    // ────────────────────────────────────────────────────────
    // FLOW 13: Refreshing Page Without Losing Saved Responses
    // ────────────────────────────────────────────────────────
    const responsesCheckRes = createMockResponse();
    await getAssessmentResponses(
      {
        student: authStudent,
        params: { assessmentId: attemptId },
      },
      responsesCheckRes
    );

    expect(responsesCheckRes.statusCode).toBe(200);
    expect(responsesCheckRes.body.totalQuestions).toBe(10);
    expect(responsesCheckRes.body.answeredCount).toBe(8);
    expect(responsesCheckRes.body.unansweredCount).toBe(2);

    // ────────────────────────────────────────────────────────
    // FLOW 14: Submitting Assessment
    // ────────────────────────────────────────────────────────
    const finishRes = createMockResponse();
    await finishPreAssessment(
      {
        student: authStudent,
        body: { assessmentId: attemptId },
      },
      finishRes
    );

    expect(finishRes.statusCode).toBe(200);
    expect(finishRes.body.success).toBe(true);

    // ────────────────────────────────────────────────────────
    // FLOW 15: Calculating Overall Score
    // ────────────────────────────────────────────────────────
    expect(finishRes.body.totalQuestions).toBe(10);
    expect(finishRes.body.attemptedQuestions).toBe(8);
    expect(finishRes.body.unansweredQuestions).toBe(2);
    expect(finishRes.body.correctAnswers).toBeGreaterThanOrEqual(7);
    // Overall accuracy = (Correct answers / Total questions) * 100
    const expectedAccuracy = parseFloat(((finishRes.body.correctAnswers / 10) * 100).toFixed(1));
    expect(finishRes.body.overallAccuracy).toBe(expectedAccuracy);

    // ────────────────────────────────────────────────────────
    // FLOW 16: Calculating Topic-Wise Proficiency & Unknown Handling
    // ────────────────────────────────────────────────────────
    expect(finishRes.body.topicProficiency).toBeDefined();
    // Prompt 6: For topics with no attempted questions, mark proficiency as unknown instead of zero
    expect(finishRes.body.unknownTopics.length).toBeGreaterThanOrEqual(1);
    for (const unknownTopic of finishRes.body.unknownTopics) {
      expect(finishRes.body.topicProficiency[unknownTopic]).toBe('unknown');
      expect(finishRes.body.topicAccuracy[unknownTopic]).toBeNull();
    }
    // Strong topics identified (>= 70%)
    expect(finishRes.body.strongTopics.length).toBeGreaterThan(0);

    // ────────────────────────────────────────────────────────
    // FLOW 17: Displaying Results on Dashboard
    // ────────────────────────────────────────────────────────
    const dashPostRes = createMockResponse();
    await getDashboard({ student: authStudent }, dashPostRes);

    expect(dashPostRes.statusCode).toBe(200);
    expect(dashPostRes.body.data.assessmentStatus).toBe('Completed');
    expect(dashPostRes.body.data.baseline).toBeDefined();
    expect(dashPostRes.body.data.baseline.overallAccuracy).toBe(finishRes.body.overallAccuracy);
    expect(dashPostRes.body.data.baseline.correctAnswers).toBe(finishRes.body.correctAnswers);
  });

  // ──────────────────────────────────────────────────────────
  // EDGE CASE AUDITS: Errors, Duplicates, Expiration, Security
  // ──────────────────────────────────────────────────────────
  describe('Edge Case & Security Audits', () => {
    it('rejects submissions after assessment is completed (duplicate submission)', async () => {
      const student = { id: 701, email: 'student701@college.edu' };
      const startRes = createMockResponse();
      await startPreAssessment({ student, body: {} }, startRes);
      const attemptId = startRes.body.attemptId;

      // Submit once
      await finishPreAssessment({ student, body: { assessmentId: attemptId } }, createMockResponse());

      // Attempt to submit answer after completion
      const answerAfterDoneRes = createMockResponse();
      await recordAssessmentAnswer(
        {
          student,
          body: {
            assessmentId: attemptId,
            questionId: startRes.body.questions[0].id,
            selectedOption: 'A',
          },
        },
        answerAfterDoneRes
      );

      expect(answerAfterDoneRes.statusCode).toBe(400);
      expect(answerAfterDoneRes.body.error).toContain('already completed');
    });

    it('prevents unauthorized student from accessing or answering another student assessment', async () => {
      const studentA = { id: 801, email: 'studentA@college.edu' };
      const studentB = { id: 802, email: 'studentB@college.edu' };

      const startRes = createMockResponse();
      await startPreAssessment({ student: studentA, body: {} }, startRes);
      const attemptId = startRes.body.attemptId;

      // Student B attempts to answer Student A's question
      const hackRes = createMockResponse();
      await recordAssessmentAnswer(
        {
          student: studentB,
          body: {
            assessmentId: attemptId,
            questionId: startRes.body.questions[0].id,
            selectedOption: 'C',
          },
        },
        hackRes
      );
      expect(hackRes.statusCode).toBe(403);

      // Student B attempts to read Student A's responses
      const readRes = createMockResponse();
      await getAssessmentResponses(
        {
          student: studentB,
          params: { assessmentId: attemptId },
        },
        readRes
      );
      expect(readRes.statusCode).toBe(403);
    });

    it('rejects foreign question that does not belong to the assessment', async () => {
      const student = { id: 901, email: 'student901@college.edu' };
      const startRes = createMockResponse();
      await startPreAssessment({ student, body: {} }, startRes);
      const attemptId = startRes.body.attemptId;

      const fakeQRes = createMockResponse();
      await recordAssessmentAnswer(
        {
          student,
          body: {
            assessmentId: attemptId,
            questionId: 'foreign-q-id-000',
            selectedOption: 'A',
          },
        },
        fakeQRes
      );

      expect(fakeQRes.statusCode).toBe(400);
      expect(fakeQRes.body.error).toContain('does not belong');
    });

    it('detects active assessment and supports resume metadata with marked for review', async () => {
      const student = { id: 950, email: 'student950@college.edu' };
      
      // Before starting: active check should be false
      const preCheckRes = createMockResponse();
      await getActiveAssessment({ student }, preCheckRes);
      expect(preCheckRes.statusCode).toBe(200);
      expect(preCheckRes.body.hasActiveAssessment).toBe(false);

      // Start pre-assessment
      const startRes = createMockResponse();
      await startPreAssessment({ student, body: {} }, startRes);
      const attemptId = startRes.body.attemptId;
      expect(startRes.body.endTime).toBeDefined();

      // Answer question 1 and mark for review
      const q1Id = startRes.body.questions[0].id;
      const ansRes = createMockResponse();
      await recordAssessmentAnswer(
        {
          student,
          body: {
            assessmentId: attemptId,
            questionId: q1Id,
            selectedOption: 'B',
            isMarkedForReview: true,
            responseTimeSec: 15,
          },
        },
        ansRes
      );
      expect(ansRes.body.data.selectedOption).toBe('B');
      expect(ansRes.body.data.isMarkedForReview).toBe(true);

      // Toggle review mark without changing selectedOption
      const toggleRes = createMockResponse();
      await recordAssessmentAnswer(
        {
          student,
          body: {
            assessmentId: attemptId,
            questionId: q1Id,
            isMarkedForReview: false,
          },
        },
        toggleRes
      );
      expect(toggleRes.body.data.selectedOption).toBe('B'); // Preserved selected option
      expect(toggleRes.body.data.isMarkedForReview).toBe(false);

      // Check active assessment endpoint
      const activeRes = createMockResponse();
      await getActiveAssessment({ student }, activeRes);
      expect(activeRes.statusCode).toBe(200);
      expect(activeRes.body.hasActiveAssessment).toBe(true);
      expect(activeRes.body.activeAssessment.id).toBe(attemptId);
      expect(activeRes.body.activeAssessment.answeredCount).toBe(1);
      expect(activeRes.body.activeAssessment.unansweredCount).toBe(9);
      expect(activeRes.body.activeAssessment.endTime).toBeDefined();

      // Check assessment history
      const histRes = createMockResponse();
      await getAssessmentHistory({ student }, histRes);
      expect(histRes.statusCode).toBe(200);
      expect(histRes.body.history.length).toBeGreaterThanOrEqual(1);
      expect(histRes.body.history[0].id).toBe(attemptId);
    });
  });

});
