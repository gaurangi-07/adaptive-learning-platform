# Module 1 – Student Baseline API

This document defines the **integration contract** that Module 1 (Student Management & Pre‑assessment) exposes for consumption by the other modules (Module 2 – Adaptive Assessment, Module 3 – AI Generation & Analytics).

---

## 1️⃣ Baseline Result Model (Prisma)
```prisma
model BaselineResult {
  id               Int      @id @default(autoincrement())
  studentId        Int      @unique               // FK → Student.id
  overallAccuracy  Float    // 0‑100 percentage
  totalQuestions   Int
  correctAnswers   Int
  topicProficiency Json    // e.g. { "DBMS": 0.8, "DSA": 0.6 }
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relation
  student          Student @relation(fields: [studentId], references: [id])
}
```
The model is **read‑only for other modules** – it is written only by the Module 1 `POST /api/assessment/finish` endpoint (implemented later) and never mutated directly.

---

## 2️⃣ API Endpoints

### `GET /api/baseline/:studentId`
Returns the latest baseline result for the given student.

**Request**
```
GET /api/baseline/101
Headers:
  Authorization: Bearer <JWT>
```

**Response (200 OK)**
```json
{
  "studentId": 101,
  "assessmentId": 201,               // internal id of the pre‑assessment attempt
  "overallAccuracy": 72.0,
  "topicProficiency": {
    "DBMS": 0.8,
    "DSA": 0.6,
    "OS": 0.5
  },
  "totalQuestions": 20,
  "correctAnswers": 14
}
```
*All numeric fields are **floats** where appropriate; the client may cast to `int` if needed.*

**Error Responses**
| Code | Situation |
|------|-----------|
| 401  | Missing/invalid JWT |
| 404  | No baseline result for `studentId` |
| 500  | Internal server error |

---

## 3️⃣ Data Flow & Ownership
1. **Module 1** creates a `BaselineResult` after the pre‑assessment finishes (see `POST /api/assessment/finish`).
2. **Module 2** reads the baseline via `GET /api/baseline/:studentId` to seed its adaptive algorithm.
3. **Module 3** does **not** read/write this table – it only consumes the question‑bank.

All foreign‑key constraints are enforced at the DB level (Prisma).  No other module creates or updates the `BaselineResult` table, preventing duplication or conflict.

---

## 4️⃣ Consistency Guarantees
* `studentId` is the primary identifier across the whole platform (present in `Student`, `AdaptiveAssessment`, `BaselineResult`).
* `assessmentId` refers to the **pre‑assessment** attempt that generated the baseline. It is stored in `BaselineResult` as a reference (optional foreign key could be added later).
* The `topicProficiency` JSON field stores a **normalized score** (0‑1) per topic.

---

## 5️⃣ Future Extensions (Non‑breaking)
* Add an `assessmentId` foreign key to `BaselineResult` if a strict relational link is required.
* Introduce a `version` integer to support re‑baseline after a new pre‑assessment.

---

**Version:** 1.0 – initial integration contract.
