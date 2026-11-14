-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIMED_OUT');

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "college" TEXT,
    "branch" TEXT,
    "yearOfStudy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaselineResult" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "overallAccuracy" DOUBLE PRECISION NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "topicProficiency" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaselineResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptiveAssessment" (
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

    CONSTRAINT "AdaptiveAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
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

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResponse" (
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

    CONSTRAINT "StudentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicProficiency" (
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

    CONSTRAINT "TopicProficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DifficultyHistory" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "questionOrder" INTEGER NOT NULL,
    "previousDifficulty" INTEGER NOT NULL,
    "newDifficulty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DifficultyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreAssessmentAttempt" (
    "id" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "topicProficiency" JSONB,
    "questionIds" JSONB NOT NULL,

    CONSTRAINT "PreAssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreAssessmentResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" INTEGER,
    "questionId" TEXT NOT NULL,
    "selectedOption" TEXT,
    "responseTimeSec" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isMarkedForReview" BOOLEAN NOT NULL DEFAULT false,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreAssessmentResponse_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "QuestionReviewHistory" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "previousStatus" "QuestionStatus",
    "newStatus" "QuestionStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BaselineResult_studentId_key" ON "BaselineResult"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentResponse_assessmentQuestionId_key" ON "StudentResponse"("assessmentQuestionId");

-- CreateIndex
CREATE INDEX "StudentResponse_assessmentId_idx" ON "StudentResponse"("assessmentId");

-- CreateIndex
CREATE INDEX "StudentResponse_assessmentId_topic_idx" ON "StudentResponse"("assessmentId", "topic");

-- CreateIndex
CREATE INDEX "StudentResponse_questionId_idx" ON "StudentResponse"("questionId");

-- CreateIndex
CREATE INDEX "TopicProficiency_studentId_topic_idx" ON "TopicProficiency"("studentId", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "TopicProficiency_assessmentId_topic_key" ON "TopicProficiency"("assessmentId", "topic");

-- CreateIndex
CREATE INDEX "DifficultyHistory_assessmentId_idx" ON "DifficultyHistory"("assessmentId");

-- CreateIndex
CREATE INDEX "DifficultyHistory_assessmentId_topic_idx" ON "DifficultyHistory"("assessmentId", "topic");

-- CreateIndex
CREATE INDEX "PreAssessmentResponse_attemptId_idx" ON "PreAssessmentResponse"("attemptId");

-- CreateIndex
CREATE INDEX "PreAssessmentResponse_studentId_idx" ON "PreAssessmentResponse"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "PreAssessmentResponse_attemptId_questionId_key" ON "PreAssessmentResponse"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "questions_subject_topic_difficulty_idx" ON "questions"("subject", "topic", "difficulty");

-- CreateIndex
CREATE INDEX "questions_status_idx" ON "questions"("status");

-- CreateIndex
CREATE INDEX "questions_createdAt_idx" ON "questions"("createdAt");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");

-- CreateIndex
CREATE INDEX "QuestionReviewHistory_questionId_idx" ON "QuestionReviewHistory"("questionId");

-- CreateIndex
CREATE INDEX "QuestionReviewHistory_reviewerId_idx" ON "QuestionReviewHistory"("reviewerId");

-- AddForeignKey
ALTER TABLE "BaselineResult" ADD CONSTRAINT "BaselineResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptiveAssessment" ADD CONSTRAINT "AdaptiveAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AdaptiveAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponse" ADD CONSTRAINT "StudentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AdaptiveAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResponse" ADD CONSTRAINT "StudentResponse_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "AssessmentQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicProficiency" ADD CONSTRAINT "TopicProficiency_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AdaptiveAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DifficultyHistory" ADD CONSTRAINT "DifficultyHistory_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AdaptiveAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreAssessmentAttempt" ADD CONSTRAINT "PreAssessmentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreAssessmentResponse" ADD CONSTRAINT "PreAssessmentResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PreAssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreAssessmentResponse" ADD CONSTRAINT "PreAssessmentResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReviewHistory" ADD CONSTRAINT "QuestionReviewHistory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

