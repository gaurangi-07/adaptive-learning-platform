// controllers/authController.js
// -------------------------------------------------------------------
// Handles student registration and login logic with secure bcrypt hashing,
// JWT token generation, and Prisma ORM integration.
// -------------------------------------------------------------------

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

let prisma;
try {
  const { getPrismaClient } = require('../../../prismaClient');
  prisma = getPrismaClient() || new PrismaClient();
} catch {
  prisma = new PrismaClient();
}

// In-memory student cache for local testing / development when PostgreSQL is offline
const inMemoryStudents = new Map();
let fallbackIdCounter = 1000;

/**
 * Generate a signed JWT token for the authenticated student.
 * Payload: { sub: student.id, email: student.email }
 * Expiry: 7 days
 */
function generateToken(student) {
  const payload = { sub: student.id, email: student.email };
  const secret = process.env.JWT_SECRET || 'parakh_adaptive_learning_secret_2026';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * POST /api/auth/register
 * Registers a new student account.
 */
async function register(req, res) {
  try {
    const { fullName, email, password, college, branch, yearOfStudy } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check whether email is already registered
    let existingStudent = null;
    try {
      if (prisma) {
        existingStudent = await prisma.student.findUnique({ where: { email: normalizedEmail } });
      }
    } catch (dbErr) {
      console.warn('[AuthController] DB lookup unavailable, checking fallback store:', dbErr.message);
      existingStudent = inMemoryStudents.get(normalizedEmail);
    }

    if (!existingStudent && inMemoryStudents.has(normalizedEmail)) {
      existingStudent = inMemoryStudents.get(normalizedEmail);
    }

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered. Please log in instead.'
      });
    }

    // 2. Hash password with bcrypt (salt rounds = 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Persist student in database (with in-memory fallback for offline/test environments)
    let student;
    try {
      if (prisma) {
        student = await prisma.student.create({
          data: {
            fullName: fullName.trim(),
            email: normalizedEmail,
            hashedPassword,
            college: college ? college.trim() : null,
            branch: branch ? branch.trim() : null,
            yearOfStudy: yearOfStudy || null,
          },
        });
      } else {
        throw new Error('Prisma client not configured');
      }
    } catch (dbErr) {
      console.warn('[AuthController] DB insert unavailable, saving to memory store:', dbErr.message);
      fallbackIdCounter += 1;
      student = {
        id: fallbackIdCounter,
        fullName: fullName.trim(),
        email: normalizedEmail,
        hashedPassword,
        college: college ? college.trim() : null,
        branch: branch ? branch.trim() : null,
        yearOfStudy: yearOfStudy || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryStudents.set(normalizedEmail, student);
    }

    // Always mirror to in-memory store for session continuity
    inMemoryStudents.set(normalizedEmail, student);

    // 4. Generate JWT token
    const token = generateToken(student);

    // 5. Return sanitized response (never expose password hash)
    const sanitizedStudent = {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      college: student.college,
      branch: student.branch,
      yearOfStudy: student.yearOfStudy,
    };

    return res.status(201).json({
      success: true,
      message: 'Student account registered successfully',
      token,
      student: sanitizedStudent,
    });
  } catch (err) {
    console.error('[AuthController] Register error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/login
 * Authenticates an existing student.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch student by email
    let student = null;
    try {
      if (prisma) {
        student = await prisma.student.findUnique({ where: { email: normalizedEmail } });
      }
    } catch (dbErr) {
      console.warn('[AuthController] DB lookup unavailable, checking fallback store:', dbErr.message);
      student = inMemoryStudents.get(normalizedEmail);
    }

    if (!student && inMemoryStudents.has(normalizedEmail)) {
      student = inMemoryStudents.get(normalizedEmail);
    }

    if (!student) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 2. Verify hashed password with bcrypt
    const isMatch = await bcrypt.compare(password, student.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // 3. Generate JWT token
    const token = generateToken(student);

    // 4. Return sanitized student info
    const sanitizedStudent = {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      college: student.college,
      branch: student.branch,
      yearOfStudy: student.yearOfStudy,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      student: sanitizedStudent,
    });
  } catch (err) {
    console.error('[AuthController] Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  generateToken,
  inMemoryStudents,
};
