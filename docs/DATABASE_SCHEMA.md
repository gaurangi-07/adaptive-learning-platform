# Database Schema Documentation

## Overview

All Module 2 models use PostgreSQL with Prisma ORM.
Schema file: `prisma/schema.prisma`

---

## Models

### AdaptiveAssessment
Represents one complete adaptive assessment session.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| studentId | Int | FK → Module 1 `User.id` |
| subject | String | e.g., "Mathematics" |
| status | Enum | IN_PROGRESS / COMPLETED / ABANDONED |
| currentDifficulty | Int | Overall session difficulty (1-3) |
| totalQuestions | Int | Configured session length |
| answeredCount | Int | Questions answered so far |
| score | Int | Total correct answers |
| accuracy | Float | (score / answeredCount) × 100 |
| startedAt | DateTime | Session start |
| completedAt | DateTime? | Session end (null if in progress) |

---

### AssessmentQuestion
One question instance within an assessment (tracks which question was served when).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| assessmentId | UUID | FK → AdaptiveAssessment |
| questionId | String | FK → Module 3 `QuestionBank.id` |
| orderIndex | Int | 1-based position in session |
| topic | String | Copied from question bank |
| difficulty | Int | Difficulty at time of serving |
| questionText | String | Question text at time of serving |
| optionsJson | Json | Options array (no correctOption) |
| correctOption | String | Server-only: "A"/"B"/"C"/"D" |
| allocatedSeconds | Int | 90 |
| presentedAt | DateTime | When question was first served |

---

### StudentResponse
The student's submitted answer, response time, and evaluation result.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| assessmentId | UUID | FK → AdaptiveAssessment |
| assessmentQuestionId | UUID | FK → AssessmentQuestion (unique) |
| selectedOption | String? | "A"/"B"/"C"/"D" or null (timed out) |
| isCorrect | Boolean | Backend-evaluated correctness |
| isTimedOut | Boolean | Whether submission was after expiry |
| startedAt | DateTime | Question presented time |
| submittedAt | DateTime | Submission time |
| responseTimeMs | Int | submittedAt − startedAt in ms |
| responseTimeSec | Float | responseTimeMs / 1000 |
| difficulty | Int | Difficulty at time of answering |
| topic | String | Topic of this question |

---

### TopicProficiency
Per-topic tracking for the adaptive algorithm state within a session.

| Field | Type | Description |
|-------|------|-------------|
| assessmentId + topic | Unique | One record per topic per session |
| studentId | Int | FK → Module 1 |
| initialScore | Float | Baseline from Module 1 (0-100) |
| currentProficiency | Float | Evolving weighted score |
| questionsAttempted | Int | Total questions in this topic |
| questionsCorrect | Int | Correct answers in this topic |
| currentDifficulty | Int | Current difficulty for this topic |
| consecutiveCorrect | Int | Consecutive correct streak |
| recentOutcomes | String | JSON array of recent booleans |

---

### DifficultyHistory
Complete audit log of every difficulty decision.

| Field | Type | Description |
|-------|------|-------------|
| assessmentId | UUID | FK → AdaptiveAssessment |
| topic | String | Which topic triggered the change |
| questionOrder | Int | Which question number |
| previousDifficulty | Int | Before change |
| newDifficulty | Int | After change |
| reason | String | MAINTAINED / 3_CONSECUTIVE_CORRECT / 2_INCORRECT_IN_LAST_3 / etc. |
| details | String | Human-readable explanation |

---

## Module 3 Models (Person 3 — Question Bank & Analytics)

### Question
Stores all questions (manually created and AI-generated) with review status.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| subject | String | e.g., "Mathematics" |
| topic | String | e.g., "Algebra" |
| competency | String | Specific skill / subtopic |
| difficulty | Int | 1 (Easy), 2 (Medium), 3 (Hard) |
| questionText | Text | Full question statement |
| correctOption | String | "A", "B", "C", or "D" |
| explanation | Text | Pedagogical explanation |
| status | Enum | `PENDING`, `APPROVED`, `REJECTED`, `ARCHIVED` |
| source | String | `"MANUAL"` or `"AI"` |
| createdBy | String? | Teacher/admin ID |
| reviewedBy | String? | Reviewer ID |
| reviewedAt | DateTime? | Approval/rejection timestamp |
| rejectionReason | String? | Mandatory reason when rejected |
| aiGenerationId | UUID? | FK → AIGenerationLog |
| createdAt | DateTime | Timestamp |
| updatedAt | DateTime | Timestamp |

### QuestionOption
Stores the 4 multiple-choice options for each question.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| questionId | UUID | FK → Question (Cascade delete) |
| optionLabel | String | "A", "B", "C", or "D" |
| optionText | Text | Option statement |
| isCorrect | Boolean | Whether this option is the correct answer |

### AIGenerationLog
Audit log for AI question generation batches.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| provider | String | `"mock"` or `"openai"` |
| subject | String | Target subject |
| topic | String | Target topic |
| difficulty | Int | 1, 2, or 3 |
| requestedCount | Int | Number of questions requested |
| generatedCount | Int | Total parsed from AI |
| validCount | Int | Successfully validated and saved |
| status | String | `"PENDING"`, `"COMPLETED"`, `"FAILED"` |
| errorMessage | String? | Error details if failed |
| createdAt | DateTime | Generation timestamp |

### QuestionReviewHistory
Audit trail tracking question status transitions.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| questionId | UUID | FK → Question |
| reviewerId | String? | Teacher ID |
| previousStatus | Enum | Status before change |
| newStatus | Enum | Status after change |
| rejectionReason | String? | Rejection reason if applicable |
| reviewedAt | DateTime | Review timestamp |

---

## Cross-Module Connections

```
Module 1                    Module 2                    Module 3
─────────                   ────────                    ────────
User.id  ──────────────→  AdaptiveAssessment.studentId
                           AssessmentQuestion.questionId ←── QuestionBank.id
                           AssessmentSummary (output)  ──────→ Analytics Engine
```

## Migration

```bash
# Initial migration
npx prisma migrate dev --name init --schema prisma/schema.prisma

# View current schema in browser
npx prisma studio --schema prisma/schema.prisma
```
