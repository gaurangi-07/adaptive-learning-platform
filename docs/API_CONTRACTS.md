# API Contracts — Module 2 Adaptive Testing

Base URL: `http://localhost:5001/api/adaptive`

---

## POST /start
**Start a new adaptive assessment session.**

Request body:
```json
{
  "studentId": 12,
  "subject": "Mathematics",
  "totalQuestions": 10
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "attemptId": "uuid-v4",
    "studentId": 12,
    "subject": "Mathematics",
    "totalQuestions": 10,
    "startedAt": "2026-11-08T...",
    "topicProficiencies": [
      { "topic": "Algebra", "initialScore": 70, "currentDifficulty": 3 }
    ]
  }
}
```

---

## GET /:attemptId/next
**Retrieve the next adaptively-selected question.**

Response (200):
```json
{
  "success": true,
  "data": {
    "completed": false,
    "attemptId": "uuid",
    "assessmentQuestionId": "uuid",
    "questionNumber": 3,
    "totalQuestions": 10,
    "question": {
      "id": "MATH-ALG-05",
      "topic": "Algebra",
      "competency": "Quadratic Equations",
      "difficulty": 2,
      "questionText": "Solve: x² - 5x + 6 = 0",
      "options": [
        { "id": "A", "text": "x = 2 and x = 3" },
        { "id": "B", "text": "x = 1 and x = 6" },
        { "id": "C", "text": "x = -2 and x = -3" },
        { "id": "D", "text": "x = 2 only" }
      ]
    },
    "allocatedSeconds": 90,
    "presentedAt": "2026-11-08T...",
    "progress": { "answered": 2, "total": 10, "percentComplete": 20 }
  }
}
```

> ⚠️ `correctOption` and `explanation` are **never sent** to the frontend on this endpoint.

---

## POST /:attemptId/answer
**Submit an answer.**

Request body:
```json
{
  "assessmentQuestionId": "uuid",
  "selectedOption": "A"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "isCorrect": true,
    "isTimedOut": false,
    "correctOption": "A",
    "explanation": "Factoring: (x-2)(x-3)=0 gives x=2 and x=3.",
    "responseTimeSec": 18.5,
    "difficultyChange": {
      "previous": 2, "new": 2, "reason": "MAINTAINED", "details": "..."
    },
    "progress": { "answered": 3, "total": 10, "score": 2, "accuracy": 66.67, "isComplete": false }
  }
}
```

---

## GET /:attemptId/history
**Full question-by-question response history.**

---

## GET /:attemptId/summary
**Detailed assessment summary (for Module 3 analytics).**

Returns topic breakdown, response time analytics, difficulty progression, recommended focus areas.

---

## GET /health
**Health check including question bank status.**

---

## Error Response Format
All errors follow:
```json
{ "success": false, "error": "Human-readable message", "details": [...] }
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error or assessment already complete |
| 403 | Unauthorized access to another student's assessment |
| 404 | Assessment or question not found |
| 409 | Duplicate submission |
| 500 | Internal server error |

---

# API Contracts — Module 3 AI Generation, Question Bank & Analytics

## 1. AI Question Generation

Base URL: `http://localhost:5001/api/ai`

### POST /generate
**Generate educational MCQs using AI (OpenAI or Mock provider).**

Request body:
```json
{
  "subject": "Mathematics",
  "topic": "Algebra",
  "difficulty": "Medium",
  "count": 3
}
```
*Note: `difficulty` can be `"Easy"`, `"Medium"`, `"Hard"` or numeric `1`, `2`, `3`.*

Response (201):
```json
{
  "success": true,
  "data": {
    "generationId": "uuid",
    "provider": "mock",
    "subject": "Mathematics",
    "topic": "Algebra",
    "difficulty": 2,
    "requestedCount": 3,
    "generatedCount": 3,
    "savedCount": 3,
    "invalidCount": 0,
    "duplicatesSkipped": 0,
    "questions": [
      {
        "id": "uuid",
        "subject": "Mathematics",
        "topic": "Algebra",
        "difficulty": 2,
        "questionText": "...",
        "options": [
          { "id": "uuid", "optionLabel": "A", "optionText": "...", "isCorrect": true },
          { "id": "uuid", "optionLabel": "B", "optionText": "...", "isCorrect": false },
          { "id": "uuid", "optionLabel": "C", "optionText": "...", "isCorrect": false },
          { "id": "uuid", "optionLabel": "D", "optionText": "...", "isCorrect": false }
        ],
        "correctOption": "A",
        "explanation": "...",
        "status": "PENDING"
      }
    ],
    "message": "3 question(s) generated and saved as PENDING. Requires teacher review."
  }
}
```

### GET /logs
**Retrieve generation history logs.**

### GET /health
**Check AI provider configuration.**

---

## 2. Question Bank Management

Base URL: `http://localhost:5001/api/questions`

### GET /
**Query questions with pagination and search.**

Query parameters:
- `subject` (optional): Filter by subject name
- `topic` (optional): Filter by topic name
- `difficulty` (optional): 1, 2, or 3
- `status` (optional): `PENDING`, `APPROVED`, `REJECTED`, `ARCHIVED`
- `search` (optional): Full-text substring search on questionText
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

Response (200):
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "pagination": { "total": 65, "page": 1, "limit": 20, "totalPages": 4 }
  }
}
```

### GET /:id
**Get a single question by ID.**

### POST /
**Create a question manually.**

Request body:
```json
{
  "subject": "Mathematics",
  "topic": "Algebra",
  "competency": "Linear Equations",
  "difficulty": 2,
  "questionText": "If 2x + 5 = 15, what is the value of x?",
  "options": [
    { "optionLabel": "A", "optionText": "5", "isCorrect": true },
    { "optionLabel": "B", "optionText": "10", "isCorrect": false },
    { "optionLabel": "C", "optionText": "7.5", "isCorrect": false },
    { "optionLabel": "D", "optionText": "4", "isCorrect": false }
  ],
  "correctOption": "A",
  "explanation": "2x = 10, so x = 5."
}
```

### PUT /:id
**Update question details.**

### DELETE /:id
**Permanently delete a question.**

### PATCH /:id/status
**Change question status (Approve, Reject, Archive).**

Request body:
```json
{
  "status": "APPROVED"
}
```
*Note: For `status: "REJECTED"`, `rejectionReason` is mandatory:*
```json
{
  "status": "REJECTED",
  "rejectionReason": "Ambiguous option phrasing"
}
```

### POST /check-duplicate
**Check text similarity against existing questions.**

Request body:
```json
{
  "questionText": "If 2x + 5 = 15, solve for x?",
  "subject": "Mathematics",
  "topic": "Algebra"
}
```

---

## 3. Student Performance Analytics

Base URL: `http://localhost:5001/api/analytics`

### GET /report/:studentId
**Full analytics performance report for a student.**

Response (200):
```json
{
  "success": true,
  "data": {
    "studentId": 12,
    "assessmentsAttempted": 3,
    "totalQuestionsAttempted": 30,
    "totalCorrect": 21,
    "totalIncorrect": 9,
    "overallAccuracy": 70.0,
    "avgResponseTimeSec": 18.4,
    "topicPerformance": [
      {
        "topic": "Algebra",
        "questionsAttempted": 12,
        "questionsCorrect": 9,
        "questionsIncorrect": 3,
        "accuracy": 75.0,
        "avgResponseTimeSec": 15.2
      }
    ],
    "difficultyPerformance": {
      "easy": { "level": 1, "label": "Easy", "questionsAttempted": 10, "questionsCorrect": 9, "accuracy": 90.0 },
      "medium": { "level": 2, "label": "Medium", "questionsAttempted": 14, "questionsCorrect": 10, "accuracy": 71.43 },
      "hard": { "level": 3, "label": "Hard", "questionsAttempted": 6, "questionsCorrect": 2, "accuracy": 33.33 }
    },
    "performanceOverTime": [...],
    "strongTopics": ["Algebra", "Arithmetic"],
    "weakTopics": ["Trigonometry"],
    "suggestedTopics": ["Trigonometry"]
  }
}
```

### GET /topic-performance/:studentId
**Topic-wise accuracy metrics grouped by question topic.**

### GET /difficulty-performance/:studentId
**Difficulty-wise accuracy (Easy / Medium / Hard).**

### GET /time-performance/:studentId
**Response time analytics (average, fastest, slowest, pacing by difficulty).**

### GET /assessments/:studentId
**List of recent adaptive assessment sessions attempted by the student.**
