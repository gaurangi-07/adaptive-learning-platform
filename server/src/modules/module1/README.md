# Module 1 — Student Profiling & Pre-Assessment Integration Contract

## Overview
This module is assigned to **Teammate 1** in the Adaptive Learning Platform for PARAKH.
It handles user onboarding, pre-assessments, student ability calibration, and initial topic-level proficiencies.

## Assigned Responsibilities (Module 1)
- Student registration, authentication, and session management.
- Student profile and demographic tracking.
- Pre-assessment questionnaire and diagnostic test execution.
- Initial ability estimation (e.g. baseline level 1=Easy, 2=Medium, 3=Hard).
- Topic-wise proficiency mapping (0-100 scale).

## Integration Boundary with Module 2
Module 2 (Adaptive Testing System) **consumes** the baseline data produced by Module 1 to initialize the adaptive quiz session.

### Input Baseline Contract
When Module 2 calls `POST /api/adaptive/start`, it expects a payload conforming to `server/src/modules/module1/contracts/baselineContract.js`:

```json
{
  "studentId": 12,
  "subject": "Mathematics",
  "baselineLevel": 2,
  "topicScores": {
    "algebra": 70,
    "geometry": 40,
    "arithmetic": 80,
    "trigonometry": 35,
    "statistics": 65
  },
  "metadata": {
    "studentName": "Aarav Sharma",
    "classGrade": "Grade 10",
    "assessedAt": "2026-11-01T10:00:00.000Z"
  }
}
```

### Mock Adapter for Independent Development
During development, Module 2 utilizes `server/src/modules/module1/adapters/mockStudentBaselineAdapter.js`.
- Enabled when `ENABLE_MOCK_STUDENT=true` or `NODE_ENV=development`.
- **Disabled in production** to ensure real Module 1 authentication and profile services are plugged in.

### Instructions for Module 1 Teammate
1. Implement your models (e.g., `User`, `StudentProfile`, `PreAssessmentResult`) in PostgreSQL.
2. When ready to integrate, replace `MockStudentBaselineAdapter.getStudentBaseline(studentId)` with your actual database query or internal service call.
3. Validate all outputs against `baselineContract.js` to ensure seamless compatibility.
