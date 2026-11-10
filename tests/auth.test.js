/**
 * @file auth.test.js
 * @description Comprehensive unit tests for Module 1 Student Authentication.
 * Tests registration, login, bcrypt password hashing, JWT generation, and auth middleware.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { registerSchema, loginSchema } from '../server/src/modules/module1/validators/authValidator.js';
import { protect } from '../server/src/modules/module1/middleware/authMiddleware.js';
import { generateToken, inMemoryStudents, register, login } from '../server/src/modules/module1/controllers/authController.js';

describe('Module 1: Student Authentication Logic & Validation', () => {

  beforeEach(() => {
    inMemoryStudents.clear();
  });

  // ──────────────────────────────────────────────────────────
  // 1. ZOD VALIDATION SCHEMAS
  // ──────────────────────────────────────────────────────────
  describe('Form & Payload Validation (Zod)', () => {
    it('accepts valid registration payload with all fields', () => {
      const payload = {
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@example.edu',
        password: 'password123',
        confirmPassword: 'password123',
        college: 'NIT Trichy',
        branch: 'Computer Science',
        yearOfStudy: 2,
      };

      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('aarav.sharma@example.edu');
    });

    it('rejects registration when email format is invalid', () => {
      const payload = {
        fullName: 'Aarav Sharma',
        email: 'invalid-email-address',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const errors = result.error.format();
      expect(errors.email).toBeDefined();
    });

    it('rejects registration when password is less than 6 characters', () => {
      const payload = {
        fullName: 'Aarav Sharma',
        email: 'aarav@example.edu',
        password: '123',
        confirmPassword: '123',
      };

      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues.some((i) => i.message.includes('at least 6 characters'))).toBe(true);
    });

    it('rejects registration when password and confirmPassword do not match', () => {
      const payload = {
        fullName: 'Aarav Sharma',
        email: 'aarav@example.edu',
        password: 'securePassword1',
        confirmPassword: 'differentPassword2',
      };

      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error.issues.some((i) => i.message.includes('Passwords do not match'))).toBe(true);
    });

    it('accepts login with valid email and non-empty password', () => {
      const payload = {
        email: 'aarav@example.edu',
        password: 'password123',
      };

      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects login with missing password', () => {
      const payload = {
        email: 'aarav@example.edu',
        password: '',
      };

      const result = loginSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 2. BCRYPT HASHING & SECURITY
  // ──────────────────────────────────────────────────────────
  describe('Bcrypt Password Hashing & Sanitization', () => {
    it('hashes passwords and never stores plain text', async () => {
      const rawPassword = 'mySecretPassword!2026';
      const hash = await bcrypt.hash(rawPassword, 10);

      expect(hash).not.toBe(rawPassword);
      expect(hash.startsWith('$2b$10$') || hash.startsWith('$2a$10$')).toBe(true);

      const matches = await bcrypt.compare(rawPassword, hash);
      expect(matches).toBe(true);

      const wrongMatches = await bcrypt.compare('wrongPassword', hash);
      expect(wrongMatches).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 3. JWT TOKEN GENERATION & EXPIRATION
  // ──────────────────────────────────────────────────────────
  describe('JWT Token Handling', () => {
    it('generates a valid JWT token signed with secret and student payload', () => {
      const student = { id: 42, email: 'student42@example.edu' };
      const token = generateToken(student);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const secret = process.env.JWT_SECRET || 'parakh_adaptive_learning_secret_2026';
      const decoded = jwt.verify(token, secret);

      expect(decoded.sub).toBe(42);
      expect(decoded.email).toBe('student42@example.edu');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  // ──────────────────────────────────────────────────────────
  // 4. REGISTRATION CONTROLLER LOGIC
  // ──────────────────────────────────────────────────────────
  describe('Student Registration Controller', () => {
    it('successfully registers new student, creates hash, and returns sanitized student', async () => {
      const req = {
        body: {
          fullName: 'Priya Nair',
          email: 'priya.nair@college.edu',
          password: 'secretPassword123',
          confirmPassword: 'secretPassword123',
          college: 'IIT Madras',
          branch: 'Electrical Engineering',
          yearOfStudy: 3,
        },
      };

      let statusCode = 200;
      let responseBody = null;

      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseBody = data;
          return this;
        },
      };

      await register(req, res);

      expect(statusCode).toBe(201);
      expect(responseBody.success).toBe(true);
      expect(responseBody.token).toBeDefined();
      expect(responseBody.student.fullName).toBe('Priya Nair');
      expect(responseBody.student.email).toBe('priya.nair@college.edu');
      expect(responseBody.student.hashedPassword).toBeUndefined(); // NEVER exposed
      expect(responseBody.student.password).toBeUndefined();
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      const req1 = {
        body: {
          fullName: 'Student One',
          email: 'duplicate@test.com',
          password: 'password123',
          confirmPassword: 'password123',
        },
      };

      const res1 = {
        status(c) { this.code = c; return this; },
        json(d) { this.data = d; return this; },
      };

      await register(req1, res1);
      expect(res1.code).toBe(201);

      // Attempt duplicate
      const req2 = {
        body: {
          fullName: 'Student Two',
          email: 'duplicate@test.com',
          password: 'password456',
          confirmPassword: 'password456',
        },
      };

      const res2 = {
        status(c) { this.code = c; return this; },
        json(d) { this.data = d; return this; },
      };

      await register(req2, res2);
      expect(res2.code).toBe(409);
      expect(res2.data.success).toBe(false);
      expect(res2.data.error).toContain('already registered');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. LOGIN CONTROLLER LOGIC
  // ──────────────────────────────────────────────────────────
  describe('Student Login Controller', () => {
    it('authenticates valid credentials and returns 200 with JWT', async () => {
      // Seed student
      const regReq = {
        body: {
          fullName: 'Rohan Mehra',
          email: 'rohan.mehra@example.com',
          password: 'mypassword123',
          confirmPassword: 'mypassword123',
        },
      };
      const regRes = {
        status() { return this; },
        json() { return this; },
      };
      await register(regReq, regRes);

      // Attempt login
      const loginReq = {
        body: {
          email: 'rohan.mehra@example.com',
          password: 'mypassword123',
        },
      };
      let statusCode = 0;
      let responseBody = null;
      const loginRes = {
        status(code) { statusCode = code; return this; },
        json(data) { responseBody = data; return this; },
      };

      await login(loginReq, loginRes);

      expect(statusCode).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.token).toBeDefined();
      expect(responseBody.student.email).toBe('rohan.mehra@example.com');
      expect(responseBody.student.hashedPassword).toBeUndefined();
    });

    it('rejects wrong password with 401 Unauthorized', async () => {
      // Seed student
      const regReq = {
        body: {
          fullName: 'Neha Gupta',
          email: 'neha.gupta@example.com',
          password: 'correctPassword',
          confirmPassword: 'correctPassword',
        },
      };
      const regRes = { status() { return this; }, json() { return this; } };
      await register(regReq, regRes);

      // Attempt login with incorrect password
      const loginReq = {
        body: {
          email: 'neha.gupta@example.com',
          password: 'incorrectPassword',
        },
      };
      let statusCode = 0;
      let responseBody = null;
      const loginRes = {
        status(code) { statusCode = code; return this; },
        json(data) { responseBody = data; return this; },
      };

      await login(loginReq, loginRes);

      expect(statusCode).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain('Invalid email or password');
    });

    it('rejects unregistered email with 401 Unauthorized', async () => {
      const loginReq = {
        body: {
          email: 'nonexistent@example.com',
          password: 'somePassword',
        },
      };
      let statusCode = 0;
      const loginRes = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };

      await login(loginReq, loginRes);
      expect(statusCode).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────
  // 6. AUTHENTICATION MIDDLEWARE GUARD
  // ──────────────────────────────────────────────────────────
  describe('protect Middleware Guard', () => {
    it('rejects requests with missing Authorization header with 401', () => {
      const req = { headers: {} };
      let statusCode = 0;
      let responseBody = null;
      const res = {
        status(code) { statusCode = code; return this; },
        json(data) { responseBody = data; return this; },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      protect(req, res, next);

      expect(statusCode).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(nextCalled).toBe(false);
    });

    it('accepts valid Bearer token and attaches req.student', () => {
      const token = generateToken({ id: 101, email: 'verified@student.com' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = { status() { return this; }, json() { return this; } };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      protect(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.student).toBeDefined();
      expect(req.student.id).toBe(101);
      expect(req.student.email).toBe('verified@student.com');
    });
  });

});
