// src/modules/module1/controllers/studentController.js
// -------------------------------------------------------------------
// Handles profile retrieval / update and dashboard data for Module 1.
// -------------------------------------------------------------------

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/** GET /api/student/profile */
async function getProfile(req, res) {
  const studentId = req.student.id;
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    const { hashedPassword, ...publicData } = student; // omit password hash
    return res.json({ success: true, student: publicData });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/** PUT /api/student/profile */
async function updateProfile(req, res) {
  const studentId = req.student.id;
  const { fullName, college, branch, yearOfStudy } = req.body;
  try {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { fullName, college, branch, yearOfStudy },
    });
    const { hashedPassword, ...publicData } = updated;
    return res.json({ success: true, student: publicData });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/** GET /api/student/dashboard */
async function getDashboard(req, res) {
  const studentId = req.student.id;
  try {
    // Fetch the latest baseline result if any
    const baseline = await prisma.baselineResult.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    // Assessment status – we consider a pre‑assessment in progress if there is a PreAssessmentAttempt without completedAt
    const ongoing = await prisma.preAssessmentAttempt.findFirst({
      where: { studentId, completedAt: null },
    });
    const status = ongoing ? 'In Progress' : baseline ? 'Completed' : 'Not Started';
    return res.json({
      success: true,
      data: {
        studentName: ongoing?.student?.fullName || 'Student',
        assessmentStatus: status,
        baseline: baseline || null,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

module.exports = { getProfile, updateProfile, getDashboard };
