// validators/authValidator.js
// -------------------------------------------------------------------
// Zod schemas for registration and login request bodies.
// -------------------------------------------------------------------

const { z } = require('zod');

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6),
  college: z.string().optional(),
  branch: z.string().optional(),
  yearOfStudy: z.coerce.number().int().positive().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Express middleware that validates request body against a Zod schema.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.format();
      return res.status(400).json({ success: false, error: 'Validation error', details: errors });
    }
    req.body = result.data; // sanitized data
    next();
  };
}

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
};
