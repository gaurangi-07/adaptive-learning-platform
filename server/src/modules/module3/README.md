# Module 3 — Question Bank Management & Analytics Integration Contract

## Overview
This module is assigned to **Teammate 3** in the Adaptive Learning Platform for PARAKH.
It handles AI question generation, question review/approval workflows, performance reporting, analytics dashboards, and student learning recommendations.

## Assigned Responsibilities (Module 3)
- AI-driven MCQ generation across taxonomy and competencies.
- Question bank CRUD operations, vetting, and approval state management.
- Comprehensive analytics dashboard for teachers and students.
- Knowledge gap detection and personalized learning recommendations.

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

### Adapter for Independent Development
During development, Module 2 uses `server/src/modules/module3/adapters/questionBankAdapter.js`, which reads from `mocks/questions.json` containing 65+ curated, approved Mathematics questions.
When Module 3's database or microservice is ready, Teammate 3 simply implements the `QuestionBankAdapter` methods to query the live question repository.

