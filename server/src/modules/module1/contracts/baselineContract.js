/**
 * @file baselineContract.js
 * @description Integration Contract defining the boundary between Module 1 (Student Profiling & Pre-Assessment)
 * and Module 2 (Adaptive Testing System).
 *
 * Owned by: Module 1 Team
 * Consumed by: Module 2 (Adaptive Engine Initialization)
 */

const { z } = require('zod');

/**
 * Zod schema defining the expected baseline payload produced by Module 1.
 */
const StudentBaselineSchema = z.object({
  studentId: z.number().int().positive({ message: "studentId must be a positive integer" }),
  subject: z.string().min(1, { message: "subject is required" }).default("Mathematics"),
  baselineLevel: z.number().int().min(1).max(3, { message: "baselineLevel must be 1 (Easy), 2 (Medium), or 3 (Hard)" }),
  topicScores: z.record(z.string(), z.number().min(0).max(100)).refine(
    (scores) => Object.keys(scores).length > 0,
    { message: "At least one topic score must be provided in topicScores" }
  ),
  metadata: z.object({
    studentName: z.string().optional(),
    classGrade: z.string().optional(),
    assessedAt: z.string().datetime().optional()
  }).optional()
});

/**
 * Validates a baseline payload against the contract.
 * @param {unknown} data - Untrusted baseline data from Module 1
 * @returns {{ valid: boolean, data?: z.infer<typeof StudentBaselineSchema>, errors?: z.ZodError }}
 */
function validateStudentBaseline(data) {
  const result = StudentBaselineSchema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error
    };
  }
  return {
    valid: true,
    data: result.data
  };
}

module.exports = {
  StudentBaselineSchema,
  validateStudentBaseline
};
