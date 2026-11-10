// src/modules/module1/controllers/studentController.js
// -------------------------------------------------------------------
// Handles profile retrieval / update and dashboard data for Module 1.
// -------------------------------------------------------------------

const { PrismaClient } = require('@prisma/client');
const { inMemoryStudents } = require('./authController');

let prisma;
try {
  const { getPrismaClient } = require('../../../prismaClient');
  prisma = getPrismaClient() || new PrismaClient();
} catch {
  prisma = new PrismaClient();
}

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
        if (s.id === studentId) {
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
        if (s.id === studentId) {
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
    let studentName = 'Student';
    let baseline = null;
    let ongoing = null;

    try {
      if (prisma) {
        const student = await prisma.student.findUnique({ where: { id: studentId } });
        if (student) studentName = student.fullName;

        baseline = await prisma.baselineResult.findFirst({
          where: { studentId },
          orderBy: { createdAt: 'desc' },
        });

        ongoing = await prisma.preAssessmentAttempt.findFirst({
          where: { studentId, completedAt: null },
        });
      }
    } catch {
      // Fallback
    }

    if (studentName === 'Student') {
      for (const s of inMemoryStudents.values()) {
        if (s.id === studentId) {
          studentName = s.fullName;
          break;
        }
      }
    }

    const status = ongoing ? 'In Progress' : baseline ? 'Completed' : 'Not Started';
    return res.json({
      success: true,
      data: {
        studentName,
        assessmentStatus: status,
        baseline: baseline || null,
      },
    });
  } catch (e) {
    console.error('[StudentController] getDashboard error:', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = { getProfile, updateProfile, getDashboard };
