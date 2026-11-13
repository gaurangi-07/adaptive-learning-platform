// src/modules/module1/controllers/studentController.js
// -------------------------------------------------------------------
// Handles profile retrieval / update and rich dashboard data for Module 1.
// -------------------------------------------------------------------

const { PrismaClient } = require('@prisma/client');
const { inMemoryStudents } = require('./authController');
const { inMemoryBaselines, inMemoryAttempts, inMemoryResponses } = require('./preAssessmentController');

let prisma;
try {
  const { getPrismaClient } = require('../../../prismaClient');
  prisma = getPrismaClient() || new PrismaClient();
} catch {
  prisma = new PrismaClient();
}

const ASSESSMENT_DURATION_MS = 15 * 60 * 1000;

/** GET /api/student/profile */
async function getProfile(req, res) {
  const studentId = req.student.id;
  try {
    let student = null;
    try {
      if (prisma) {
        student = await prisma.student.findUnique({ where: { id: studentId } });
      }
    } catch {
      // Fallback
    }

    if (!student) {
      for (const s of inMemoryStudents.values()) {
        if (s.id === studentId || (req.student && req.student.email && s.email === req.student.email.toLowerCase().trim())) {
          student = s;
          break;
        }
      }
    }

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const { hashedPassword, ...publicData } = student;
    return res.json({ success: true, student: publicData });
  } catch (e) {
    console.error('[StudentController] getProfile error:', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/** PUT /api/student/profile */
async function updateProfile(req, res) {
  const studentId = req.student.id;
  const { fullName, college, branch, yearOfStudy } = req.body;
  try {
    let updated = null;
    try {
      if (prisma) {
        updated = await prisma.student.update({
          where: { id: studentId },
          data: { fullName, college, branch, yearOfStudy },
        });
      }
    } catch {
      // Fallback
    }

    if (!updated) {
      for (const [email, s] of inMemoryStudents.entries()) {
        if (s.id === studentId || (req.student && req.student.email && s.email === req.student.email.toLowerCase().trim())) {
          s.fullName = fullName || s.fullName;
          s.college = college !== undefined ? college : s.college;
          s.branch = branch !== undefined ? branch : s.branch;
          s.yearOfStudy = yearOfStudy !== undefined ? yearOfStudy : s.yearOfStudy;
          s.updatedAt = new Date();
          updated = s;
          inMemoryStudents.set(email, s);
          break;
        }
      }
    }

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    const { hashedPassword, ...publicData } = updated;
    return res.json({ success: true, student: publicData });
  } catch (e) {
    console.error('[StudentController] updateProfile error:', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/** GET /api/student/dashboard */
async function getDashboard(req, res) {
  const studentId = req.student.id;
  try {
    let student = null;
    let baseline = null;
    let ongoing = null;
    let lastCompletedAttempt = null;

    try {
      if (prisma) {
        student = await prisma.student.findUnique({ where: { id: studentId } });

        baseline = await prisma.baselineResult.findFirst({
          where: { studentId },
          orderBy: { createdAt: 'desc' },
        });

        ongoing = await prisma.preAssessmentAttempt.findFirst({
          where: { studentId, status: 'IN_PROGRESS' },
          orderBy: { startedAt: 'desc' },
          include: { responses: true },
        });

        lastCompletedAttempt = await prisma.preAssessmentAttempt.findFirst({
          where: { studentId, status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
        });
      }
    } catch {
      // Fallback to memory
    }

    // In-memory student lookup
    if (!student) {
      for (const s of inMemoryStudents.values()) {
        if (s.id === studentId || (req.student && req.student.email && s.email === req.student.email.toLowerCase().trim())) {
          student = s;
          break;
        }
      }
    }

    if (!baseline) {
      baseline = inMemoryBaselines.get(studentId) || null;
    }

    if (!ongoing) {
      for (const a of inMemoryAttempts.values()) {
        if (a.studentId === studentId && a.status === 'IN_PROGRESS') {
          ongoing = a;
          break;
        }
      }
    }

    if (!lastCompletedAttempt) {
      for (const a of inMemoryAttempts.values()) {
        if (a.studentId === studentId && a.status === 'COMPLETED') {
          lastCompletedAttempt = a;
          break;
        }
      }
    }

    // Check if ongoing has expired
    let activeAssessment = null;
    if (ongoing) {
      const elapsedMs = Date.now() - new Date(ongoing.startedAt).getTime();
      if (elapsedMs < ASSESSMENT_DURATION_MS) {
        let qIds = [];
        try {
          qIds = typeof ongoing.questionIds === 'string'
            ? JSON.parse(ongoing.questionIds)
            : ongoing.questionIds;
        } catch {
          qIds = [];
        }

        const respMap = inMemoryResponses.get(ongoing.id) || new Map();
        if (ongoing.responses && Array.isArray(ongoing.responses)) {
          ongoing.responses.forEach((r) => respMap.set(r.questionId, r));
        }

        let answeredCount = 0;
        let markedForReviewCount = 0;
        for (const qId of qIds) {
          const r = respMap.get(qId);
          if (r && r.selectedOption !== null && r.selectedOption !== undefined && r.selectedOption !== '') {
            answeredCount += 1;
          }
          if (r && r.isMarkedForReview) {
            markedForReviewCount += 1;
          }
        }

        const totalQuestions = ongoing.totalQuestions || qIds.length || 10;
        const remainingSeconds = Math.max(0, Math.floor((ASSESSMENT_DURATION_MS - elapsedMs) / 1000));
        const endTime = new Date(new Date(ongoing.startedAt).getTime() + ASSESSMENT_DURATION_MS).toISOString();

        activeAssessment = {
          id: ongoing.id,
          attemptId: ongoing.id,
          name: 'PARAKH Diagnostic Pre-Assessment',
          totalQuestions,
          answeredCount,
          unansweredCount: totalQuestions - answeredCount,
          markedForReviewCount,
          remainingSeconds,
          startedAt: ongoing.startedAt,
          endTime,
        };
      } else {
        // Mark timed out
        ongoing = null;
      }
    }

    const studentName = student?.fullName || req.student?.fullName || 'Student';
    const status = activeAssessment ? 'In Progress' : baseline ? 'Completed' : 'Not Started';

    // Parse baseline proficiencies if needed
    let rawProficiency = baseline?.topicProficiency || null;
    if (typeof rawProficiency === 'string') {
      try {
        rawProficiency = JSON.parse(rawProficiency);
      } catch {}
    }

    const strongTopics = rawProficiency?.strongTopics || [];
    const weakTopics = rawProficiency?.weakTopics || [];
    const baselineAccuracy = baseline?.overallAccuracy ?? null;
    const overallProficiency = baseline?.overallAccuracy ?? null;
    const attemptedQuestions = baseline?.totalQuestions ?? 0;

    // Recent activity metadata
    const recentActivity = {
      lastAssessmentDate: lastCompletedAttempt?.completedAt || baseline?.updatedAt || null,
      lastAssessmentScore: lastCompletedAttempt ? `${lastCompletedAttempt.correctAnswers} / ${lastCompletedAttempt.totalQuestions}` : baseline ? `${baseline.correctAnswers} / ${baseline.totalQuestions}` : 'No attempts yet',
      lastAssessmentAccuracy: baselineAccuracy !== null ? `${baselineAccuracy.toFixed(1)}%` : null,
      assessmentCompletionStatus: status,
      totalCompleted: lastCompletedAttempt || baseline ? 1 : 0,
    };

    return res.json({
      success: true,
      data: {
        student: student ? {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          college: student.college,
          branch: student.branch,
          yearOfStudy: student.yearOfStudy,
        } : null,
        studentName,
        assessmentStatus: status,
        activeAssessment,
        baseline: baseline || null,
        statistics: {
          baselineAccuracy,
          overallProficiency,
          strongTopicsCount: strongTopics.length,
          weakTopicsCount: weakTopics.length,
          attemptedQuestions,
        },
        recentActivity,
      },
    });
  } catch (e) {
    console.error('[StudentController] getDashboard error:', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = { getProfile, updateProfile, getDashboard };
