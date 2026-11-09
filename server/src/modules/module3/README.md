# Module 3 - AI Question Bank and Student Analytics

## Overview
Module 3 provides AI-assisted MCQ generation, question-bank management, teacher review workflows, and student performance analytics for PARAKH.

The backend uses Express, Prisma, and PostgreSQL. Groq is supported for live generation, while the mock provider is available for local development and tests.

## Features

- AI MCQ generation through Groq or the deterministic mock provider.
- MCQ validation with exactly four options and one correct answer.
- Exact duplicate and similarity detection.
- Question bank search, filtering, editing, and deletion.
- Pending, approved, rejected, and archived question states.
- Teacher review history and rejection reasons.
- Topic, difficulty, and response-time analytics from Module 2 responses.
- Student performance reports and dashboard data.

## Backend Structure

| Area | Location |
| --- | --- |
| AI generation | `server/src/modules/module3/services/aiService.js` |
| Question management | `server/src/modules/module3/services/questionService.js` |
| Analytics | `server/src/modules/module3/services/analyticsService.js` |
| API routes | `server/src/modules/module3/routes/` |
| Validation | `server/src/modules/module3/validators/questionValidator.js` |
| Similarity detection | `server/src/modules/module3/utils/similarityUtils.js` |
| Module 2 adapter | `server/src/modules/module3/adapters/questionBankAdapter.js` |

## API Endpoints

### AI

- `POST /api/ai/generate`
- `GET /api/ai/health`
- `GET /api/ai/logs`

### Question Bank

- `GET /api/questions`
- `GET /api/questions/:id`
- `POST /api/questions`
- `PUT /api/questions/:id`
- `DELETE /api/questions/:id`
- `PATCH /api/questions/:id/status`

### Analytics

- `GET /api/analytics/report/:studentId`
- `GET /api/analytics/topic-performance/:studentId`
- `GET /api/analytics/difficulty-performance/:studentId`
- `GET /api/analytics/time-performance/:studentId`
- `GET /api/analytics/assessments/:studentId`

## Environment

For Groq-backed generation, configure the backend environment:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-20b
```

Use `AI_PROVIDER=mock` when no external API key is available. Never commit a real API key.

## Question Lifecycle

```text
Generate -> Validate -> Check duplicates -> Save as PENDING
                                      -> Teacher review -> APPROVED
                                      -> Module 2 adaptive assessment
```

Pending and rejected questions are excluded from the approved question flow.

## Integration Boundaries with Module 2

### 1. Inbound Question Bank Contract
Module 2 requests approved questions matching a specific subject, topic, and difficulty level without repetition.
Contract file: `server/src/modules/module3/contracts/questionBankContract.js`

Expected Question Object Format:
```json
{
  "id": "MATH-ALG-01",
  "subject": "Mathematics",
  "topic": "Algebra",
  "competency": "Linear Equations",
  "difficulty": 1,
  "question": "If 2x + 5 = 15, what is the value of x?",
  "options": [
    { "id": "A", "text": "5" },
    { "id": "B", "text": "10" },
    { "id": "C", "text": "7.5" },
    { "id": "D", "text": "4" }
  ],
  "correctOption": "A",
  "explanation": "Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5.",
  "approvalStatus": "APPROVED"
}
```

*Security note:* Module 2 enforces that `correctOption` and `explanation` are strictly withheld from the frontend client until an answer has been submitted or time has expired.

### 2. Outbound Assessment Summary Contract
Upon completion of an adaptive session, Module 2 produces a detailed analytic payload conforming to `server/src/modules/module3/contracts/assessmentSummaryContract.js`.

This payload provides:
- Topic-by-topic baseline vs final proficiency scores.
- Itemized accuracy and difficulty progression.
- Response time analytics (average by difficulty, pacing insights).
- Recommended focus areas for Module 3's recommendation engine.

### Adapter and Database Modes

`server/src/modules/module3/adapters/questionBankAdapter.js` supplies approved questions to Module 2.

- Set `ENABLE_MOCK_QUESTION_BANK=true` to use approved questions from `mocks/questions.json`.
- Set `ENABLE_MOCK_QUESTION_BANK=false` to load `APPROVED` questions from PostgreSQL through Prisma.

The adapter reloads after question status changes so newly approved questions can become available to Module 2.
