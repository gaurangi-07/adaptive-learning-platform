# API Contracts — Module 2 Adaptive Testing

Base URL: `http://localhost:5000/api/adaptive`

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

