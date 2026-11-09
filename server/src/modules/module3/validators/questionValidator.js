/**
 * @file questionValidator.js
 * @description Zod-based validation schemas for Module 3 Question Bank.
 *
 * Validates:
 *   - Full question objects (server-side, with correct answer)
 *   - AI generation request payloads
 *   - Status change requests
 */

const { z } = require('zod');

const VALID_DIFFICULTIES = [1, 2, 3];
const VALID_OPTION_LABELS = ['A', 'B', 'C', 'D'];
const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED'];

// ─── Option schema ─────────────────────────────────────────────────────────────
const QuestionOptionSchema = z.object({
  optionLabel: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Option label must be A, B, C, or D' })
  }),
  optionText: z.string().trim().min(1, { message: 'Option text must not be empty' }),
  isCorrect: z.boolean()
});

// ─── Base Question Schema ───────────────────────────────────────────────────
const BaseQuestionSchema = z.object({
  subject: z.string().trim().min(1, { message: 'Subject is required' }),
  topic: z.string().trim().min(1, { message: 'Topic is required' }),
  competency: z.string().trim().default(''),
  difficulty: z.number().int().refine(
    (d) => VALID_DIFFICULTIES.includes(d),
    { message: 'Difficulty must be 1 (Easy), 2 (Medium), or 3 (Hard)' }
  ),
  questionText: z.string().trim().min(1, { message: 'Question text must not be empty' }),
  options: z.array(QuestionOptionSchema)
    .length(4, { message: 'Exactly 4 options (A, B, C, D) are required' }),
  correctOption: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'correctOption must be A, B, C, or D' })
  }),
  explanation: z.string().trim().min(1, { message: 'Explanation must not be empty' }),
  source: z.enum(['MANUAL', 'AI']).default('MANUAL'),
  aiGenerationId: z.string().uuid().optional().nullable()
});

function refineQuestion(data, ctx) {
  // Rule: Exactly one option must be marked isCorrect
  const correctOptions = data.options?.filter((o) => o.isCorrect) || [];
  if (correctOptions.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Exactly one option must be marked as correct. Found ${correctOptions.length}.`,
      path: ['options']
    });
  }

  // Rule: The option marked isCorrect must match correctOption label
  const markedLabel = correctOptions[0]?.optionLabel;
  if (correctOptions.length === 1 && markedLabel !== data.correctOption) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `The option marked isCorrect (${markedLabel}) must match correctOption (${data.correctOption}).`,
      path: ['correctOption']
    });
  }

  // Rule: Option labels must be exactly A, B, C, D (no duplicates, no missing)
  if (data.options) {
    const labels = data.options.map((o) => o.optionLabel).sort();
    if (labels.join('') !== 'ABCD') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Options must have exactly one each of labels A, B, C, and D.',
        path: ['options']
      });
    }
  }
}

// ─── Full question schema (for creation) ──────────────────────────────────────
const CreateQuestionSchema = BaseQuestionSchema.superRefine(refineQuestion);

// ─── Update question schema (all fields optional) ─────────────────────────────
const UpdateQuestionSchema = BaseQuestionSchema.partial();

// ─── Status change schema ──────────────────────────────────────────────────────
const StatusChangeSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED'], {
    errorMap: () => ({ message: 'Status must be PENDING, APPROVED, REJECTED, or ARCHIVED' })
  }),
  rejectionReason: z.string().trim().optional(),
  reviewerId: z.string().trim().optional()
}).superRefine((data, ctx) => {
  if (data.status === 'REJECTED' && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A rejection reason is required when rejecting a question.',
      path: ['rejectionReason']
    });
  }
});

// ─── AI Generation Request schema ─────────────────────────────────────────────
const AIGenerateSchema = z.object({
  subject: z.string().trim().min(1, { message: 'Subject is required' }),
  topic: z.string().trim().min(1, { message: 'Topic is required' }),
  difficulty: z.union([
    z.literal('Easy'),
    z.literal('Medium'),
    z.literal('Hard'),
    z.number().int().min(1).max(3)
  ]).transform((val) => {
    if (typeof val === 'string') {
      return val === 'Easy' ? 1 : val === 'Medium' ? 2 : 3;
    }
    return val;
  }),
  count: z.number().int().min(1).max(20).default(5)
});

// ─── Query filter schema ───────────────────────────────────────────────────────
const QuestionFilterSchema = z.object({
  subject: z.string().trim().optional(),
  topic: z.string().trim().optional(),
  difficulty: z.coerce.number().int().min(1).max(3).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

/**
 * Validates a question creation payload.
 * @param {unknown} data
 * @returns {{ valid: boolean, data?: object, errors?: string[] }}
 */
function validateCreateQuestion(data) {
  const result = CreateQuestionSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    };
  }
  return { valid: true, data: result.data };
}

/**
 * Validates a question update payload.
 * @param {unknown} data
 */
function validateUpdateQuestion(data) {
  const result = UpdateQuestionSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    };
  }
  return { valid: true, data: result.data };
}

/**
 * Validates an AI generation request.
 * @param {unknown} data
 */
function validateAIGenerateRequest(data) {
  const result = AIGenerateSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    };
  }
  return { valid: true, data: result.data };
}

/**
 * Validates a status change request.
 * @param {unknown} data
 */
function validateStatusChange(data) {
  const result = StatusChangeSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    };
  }
  return { valid: true, data: result.data };
}

/**
 * Validates question filter query params.
 * @param {unknown} data
 */
function validateQuestionFilters(data) {
  const result = QuestionFilterSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
    };
  }
  return { valid: true, data: result.data };
}

module.exports = {
  CreateQuestionSchema,
  UpdateQuestionSchema,
  StatusChangeSchema,
  AIGenerateSchema,
  QuestionFilterSchema,
  validateCreateQuestion,
  validateUpdateQuestion,
  validateAIGenerateRequest,
  validateStatusChange,
  validateQuestionFilters
};
