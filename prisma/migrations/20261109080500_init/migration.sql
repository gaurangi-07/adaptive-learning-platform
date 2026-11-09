-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIMED_OUT');

-- CreateTable
CREATE TABLE "adaptive_assessments" (
    "id" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'Mathematics',
    "status" "AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentDifficulty" INTEGER NOT NULL DEFAULT 2,
    "totalQuestions" INTEGER NOT NULL DEFAULT 10,
    "answeredCount" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adaptive_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "optionsJson" JSONB NOT NULL,
    "correctOption" TEXT NOT NULL,
    "explanation" TEXT,
    "allocatedSeconds" INTEGER NOT NULL DEFAULT 90,
    "presentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_responses" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "assessmentQuestionId" TEXT NOT NULL,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "isTimedOut" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "responseTimeSec" DOUBLE PRECISION NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_proficiencies" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "initialScore" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "currentProficiency" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "questionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "currentDifficulty" INTEGER NOT NULL DEFAULT 2,
    "consecutiveCorrect" INTEGER NOT NULL DEFAULT 0,
    "recentOutcomes" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_proficiencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "difficulty_history" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "questionOrder" INTEGER NOT NULL,
    "previousDifficulty" INTEGER NOT NULL,
    "newDifficulty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "difficulty_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "competency" TEXT NOT NULL DEFAULT '',
    "difficulty" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "aiGenerationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionLabel" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generation_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "requestedCount" INTEGER NOT NULL,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_review_history" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "previousStatus" "QuestionStatus" NOT NULL,
    "newStatus" "QuestionStatus" NOT NULL,
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_review_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adaptive_assessments_studentId_idx" ON "adaptive_assessments"("studentId");

-- CreateIndex
CREATE INDEX "adaptive_assessments_status_idx" ON "adaptive_assessments"("status");

-- CreateIndex
CREATE INDEX "adaptive_assessments_createdAt_idx" ON "adaptive_assessments"("createdAt");

-- CreateIndex
CREATE INDEX "assessment_questions_assessmentId_idx" ON "assessment_questions"("assessmentId");

-- CreateIndex
CREATE INDEX "assessment_questions_questionId_idx" ON "assessment_questions"("questionId");

-- CreateIndex
CREATE INDEX "assessment_questions_topic_difficulty_idx" ON "assessment_questions"("topic", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "student_responses_assessmentQuestionId_key" ON "student_responses"("assessmentQuestionId");

-- CreateIndex
CREATE INDEX "student_responses_assessmentId_idx" ON "student_responses"("assessmentId");

-- CreateIndex
CREATE INDEX "student_responses_assessmentId_topic_idx" ON "student_responses"("assessmentId", "topic");

-- CreateIndex
CREATE INDEX "student_responses_questionId_idx" ON "student_responses"("questionId");

-- CreateIndex
CREATE INDEX "topic_proficiencies_studentId_topic_idx" ON "topic_proficiencies"("studentId", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "topic_proficiencies_assessmentId_topic_key" ON "topic_proficiencies"("assessmentId", "topic");

-- CreateIndex
CREATE INDEX "difficulty_history_assessmentId_idx" ON "difficulty_history"("assessmentId");

-- CreateIndex
CREATE INDEX "difficulty_history_assessmentId_topic_idx" ON "difficulty_history"("assessmentId", "topic");

-- CreateIndex
CREATE INDEX "questions_subject_topic_difficulty_idx" ON "questions"("subject", "topic", "difficulty");

-- CreateIndex
CREATE INDEX "questions_status_idx" ON "questions"("status");

-- CreateIndex
CREATE INDEX "questions_createdAt_idx" ON "questions"("createdAt");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");

-- CreateIndex
CREATE INDEX "ai_generation_logs_createdAt_idx" ON "ai_generation_logs"("createdAt");

-- CreateIndex
CREATE INDEX "question_review_history_questionId_idx" ON "question_review_history"("questionId");

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "adaptive_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_responses" ADD CONSTRAINT "student_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "adaptive_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_responses" ADD CONSTRAINT "student_responses_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "assessment_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_proficiencies" ADD CONSTRAINT "topic_proficiencies_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "adaptive_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "difficulty_history" ADD CONSTRAINT "difficulty_history_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "adaptive_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_aiGenerationId_fkey" FOREIGN KEY ("aiGenerationId") REFERENCES "ai_generation_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_review_history" ADD CONSTRAINT "question_review_history_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
