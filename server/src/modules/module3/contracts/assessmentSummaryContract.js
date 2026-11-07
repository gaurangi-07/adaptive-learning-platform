/**
 * @file assessmentSummaryContract.js
 * @description Integration Contract defining the output payload that Module 2 produces
 * upon assessment completion for Module 3 (Analytics, Reporting, and AI Learning Recommendations).
 *
 * Produced by: Module 2 (Adaptive Assessment Completion)
 * Consumed by: Module 3 (Analytics & Recommendations Engine)
 */

const { z } = require('zod');

const TopicSummaryItemSchema = z.object({
  topic: z.string(),
  initialScore: z.number().min(0).max(100),
  finalProficiency: z.number().min(0).max(100),
  deltaProficiency: z.number(),
  questionsAttempted: z.number().int().min(0),
  questionsCorrect: z.number().int().min(0),
  accuracyPercentage: z.number().min(0).max(100),
  finalDifficultyLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  masteryStatus: z.enum(["MASTERED", "PROFICIENT", "DEVELOPING", "CRITICAL_ATTENTION"])
});

const ResponseTimeAnalyticsSchema = z.object({
  averageResponseTimeSeconds: z.number().min(0),
  fastestResponseTimeSeconds: z.number().min(0),
  slowestResponseTimeSeconds: z.number().min(0),
  averageByDifficulty: z.object({
    easyLevel1: z.number().nullable(),
    mediumLevel2: z.number().nullable(),
    hardLevel3: z.number().nullable()
  }),
  timedOutQuestionsCount: z.number().int().min(0),
  pacingInsight: z.string()
});

const DifficultyProgressionStepSchema = z.object({
  questionOrder: z.number().int().positive(),
  topic: z.string(),
  questionDifficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  isCorrect: z.boolean(),
  responseTimeSec: z.number().min(0),
  resultingDifficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  decisionReason: z.string()
});

const AssessmentSummarySchema = z.object({
  attemptId: z.string().uuid(),
  studentId: z.number().int().positive(),
  subject: z.string(),
  totalQuestions: z.number().int().positive(),
  answeredCount: z.number().int().min(0),
  totalCorrect: z.number().int().min(0),
  overallScore: z.number().min(0),
  accuracyPercentage: z.number().min(0).max(100),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  durationSeconds: z.number().min(0),
  topicBreakdown: z.array(TopicSummaryItemSchema),
  responseTimeAnalytics: ResponseTimeAnalyticsSchema,
  difficultyProgression: z.array(DifficultyProgressionStepSchema),
  recommendedFocusAreas: z.array(z.string()),
  exportedForModule3At: z.string().datetime()
});

module.exports = {
  AssessmentSummarySchema,
  TopicSummaryItemSchema,
  ResponseTimeAnalyticsSchema,
  DifficultyProgressionStepSchema
};
