// validators/authValidator.js
// -------------------------------------------------------------------
// Zod schemas for student registration and login request bodies.
// -------------------------------------------------------------------

const { z } = require('zod');

const registerSchema = z.object({
  fullName: z.string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters'),
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string({ required_error: 'Please confirm your password' })
    .min(1, 'Please confirm your password'),
  college: z.string().trim().optional().or(z.literal('')),
  branch: z.string().trim().optional().or(z.literal('')),
  yearOfStudy: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().int('Year of study must be an integer').min(1, 'Year of study must be between 1 and 6').max(6, 'Year of study must be between 1 and 6').optional()),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

/**
 * Express middleware that validates request body against a Zod schema.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const errorMessage = firstIssue ? firstIssue.message : 'Validation error';
      return res.status(400).json({
        success: false,
        error: errorMessage,
        details: result.error.format()
      });
    }
    req.body = result.data; // sanitized data
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
};
