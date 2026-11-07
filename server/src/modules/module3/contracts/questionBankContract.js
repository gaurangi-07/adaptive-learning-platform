/**
 * @file questionBankContract.js
 * @description Integration Contract defining the boundary between Module 3 (Question Bank Management & AI Generation)
 * and Module 2 (Adaptive Testing Engine).
 *
 * Owned by: Module 3 Team
 * Consumed by: Module 2 (Adaptive Question Delivery)
 */

const { z } = require('zod');

const OptionItemSchema = z.object({
  id: z.enum(["A", "B", "C", "D"]),
  text: z.string().min(1, { message: "Option text is required" })
});

/**
 * Full Question schema stored in Question Bank (server-side only).
 */
const QuestionBankItemSchema = z.object({
  id: z.string().min(1),
  subject: z.string().min(1).default("Mathematics"),
  topic: z.string().min(1),
  competency: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  question: z.string().min(1),
  options: z.array(OptionItemSchema).length(4, { message: "Exactly 4 options (A, B, C, D) are required" }),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(1),
  approvalStatus: z.enum(["APPROVED", "PENDING", "REJECTED"]).default("APPROVED")
});

/**
 * Client-facing Question schema (sanitized - stripped of correctOption and explanation).
 */
const ClientSanitizedQuestionSchema = QuestionBankItemSchema.omit({
  correctOption: true,
  explanation: true
});

/**
 * Sanitizes a question item for safe transmission to the frontend.
 * Guarantees that neither correctOption nor explanation are leaked.
 * @param {z.infer<typeof QuestionBankItemSchema>} question
 */
function sanitizeQuestionForClient(question) {
  return {
    id: question.id,
    subject: question.subject,
    topic: question.topic,
    competency: question.competency,
    difficulty: question.difficulty,
    question: question.question,
    options: question.options.map(opt => ({
      id: opt.id,
      text: opt.text
    }))
  };
}

module.exports = {
  OptionItemSchema,
  QuestionBankItemSchema,
  ClientSanitizedQuestionSchema,
  sanitizeQuestionForClient
};
