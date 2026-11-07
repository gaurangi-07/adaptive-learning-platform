# Client Module 1 — Student Profiling & Auth UI (Placeholder)

## Scope
This folder is reserved for Teammate 1's frontend work:
- Sign up & Login views
- Student onboarding & demographic selection
- Pre-assessment diagnostic test UI
- Student profile dashboard

## Contract with Module 2 UI
Once the student completes their diagnostic assessment in Module 1, the client navigates to Module 2's `StartAssessmentPage` (or directly launches `AdaptiveQuizPage` passing `studentId`).
Module 2 will fetch the baseline or invoke `POST /api/adaptive/start` with the student identity.
