# Module 2 — Adaptive Testing System Overview

## What This Module Does

Module 2 is the core engine of the PARAKH Adaptive Learning Platform.
It delivers a **Computer Adaptive Test (CAT)** that:

1. **Receives** student baseline ability and topic proficiency scores from Module 1.
2. **Selects** the first question based on baseline difficulty.
3. **Adapts** difficulty in real time based on student performance per topic.
4. **Tracks** response time, accuracy, and proficiency evolution.
5. **Delivers** a structured assessment summary to Module 3 for analytics and recommendations.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Difficulty adjustment per topic | Students may be strong in Algebra but weak in Geometry — topic-level tracking is more accurate |
| 3-consecutive-correct → upgrade | Avoids premature upgrades from lucky guesses |
| 2-incorrect-in-last-3 → downgrade | A sliding window avoids over-reacting to a single mistake |
| Correct answer never sent to frontend | Security — prevents clients from reading the answer before submission |
| Server-enforced expiry | Prevents timer bypass by manipulating client-side timer |
| Duplicate submission protection | 409 error on re-submission of same `assessmentQuestionId` |
| Mock adapters for Modules 1 & 3 | Allows fully independent development of all three modules |

## Student Flow

```
Student opens app
  → StartAssessmentPage: selects profile, clicks "Start"
  → POST /api/adaptive/start: creates session, initializes topic proficiencies
  → GET /api/adaptive/:id/next: returns first question (difficulty = baseline level)
  → AdaptiveQuizPage: displays question, timer, topic, difficulty badge
  → Student selects option, clicks "Submit Answer"
  → POST /api/adaptive/:id/answer: evaluates, adjusts difficulty, returns feedback
  → FeedbackPanel: shows correct/incorrect, explanation, difficulty change
  → Click "Next Question" → GET next question (difficulty may have changed)
  → Repeat until all questions answered
  → AssessmentCompletePage: shows score, topic breakdown, focus areas, analytics
  → GET /api/adaptive/:id/summary: structured data for Module 3
```

