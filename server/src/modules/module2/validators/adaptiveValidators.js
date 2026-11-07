/**
 * @file adaptiveValidators.js
 * @description Zod validation schemas for all Module 2 API requests.
 */

const { z } = require('zod');

const StartAssessmentSchema = z.object({
  studentId: z.number({ required_error: "studentId is required" }).int().positive(),
  subject: z.string().min(1).default("Mathematics"),
  baselineLevel: z.number().int().min(1).max(3).optional(),
  topicScores: z.record(z.string(), z.number().min(0).max(100)).optional(),
  totalQuestions: z.number().int().min(5).max(50).optional()
});

const SubmitAnswerSchema = z.object({
  assessmentQuestionId: z.string().uuid({ message: "assessmentQuestionId must be a valid UUID" }),
  selectedOption: z.enum(["A", "B", "C", "D"], {
    required_error: "selectedOption must be A, B, C, or D"
  })
});

const AttemptIdParamSchema = z.object({
  attemptId: z.string().uuid({ message: "attemptId must be a valid UUID" })
});

module.exports = {
  StartAssessmentSchema,
  SubmitAnswerSchema,
  AttemptIdParamSchema
};

