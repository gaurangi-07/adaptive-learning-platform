// controllers/authController.js
// -------------------------------------------------------------------
// Handles student registration and login logic.
// -------------------------------------------------------------------

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Helper to generate JWT (expires in 7 days)
function generateToken(student) {
  const payload = { sub: student.id, email: student.email };
  const secret = process.env.JWT_SECRET || 'default_jwt_secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { fullName, email, password, college, branch, yearOfStudy } = req.body;

    // Check for existing email
    const existing = await prisma.student.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: {
        fullName,
        email,
        hashedPassword,
        college,
        branch,
        yearOfStudy,
      },
    });

    const token = generateToken(student);
    const responseStudent = { id: student.id, fullName, email, college, branch, yearOfStudy };
    return res.status(201).json({ success: true, token, student: responseStudent });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const student = await prisma.student.findUnique({ where: { email } });
    if (!student) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const passwordMatch = await bcrypt.compare(password, student.hashedPassword);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const token = generateToken(student);
    const responseStudent = {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      college: student.college,
      branch: student.branch,
      yearOfStudy: student.yearOfStudy,
    };
    return res.status(200).json({ success: true, token, student: responseStudent });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = { register, login };
