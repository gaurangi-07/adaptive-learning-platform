# Integration Guide — Connecting All Three Modules

## Module 1 → Module 2 Integration

**What Module 2 needs from Module 1:**
A student baseline object on assessment start.

**Step 1 (Dev):** Module 2 uses `MockStudentBaselineAdapter` automatically.

**Step 2 (Integration):** When Module 1 is ready, replace the adapter:
```js
// server/src/modules/module1/adapters/mockStudentBaselineAdapter.js
// Change getStudentBaseline() to call Module 1's DB:
static async getStudentBaseline(studentId) {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  const preAssessment = await prisma.preAssessment.findFirst({ where: { studentId } });
  return {
    studentId: student.id,
    subject: preAssessment.subject,
    baselineLevel: preAssessment.baselineLevel,
    topicScores: preAssessment.topicScores
  };
}
```

**Validation:** Always validate against `baselineContract.js` before passing to the engine.

---

## Module 2 → Module 3 Integration

**What Module 3 receives from Module 2:**
A structured assessment summary after each completed session.

**Endpoint:** `GET /api/adaptive/:attemptId/summary`

**Output schema:** `server/src/modules/module3/contracts/assessmentSummaryContract.js`

Module 3 can poll this endpoint or Module 2 can POST to Module 3's webhook (optional).

---

## Module 3 → Module 2 Integration (Question Bank)

**What Module 2 needs from Module 3:**
Approved questions matching `{ subject, topic, difficulty }`.

**Step 1 (Dev):** Module 2 reads from `mocks/questions.json` via `QuestionBankAdapter`.

**Step 2 (Integration):** When Module 3's question bank DB is ready:
```js
// server/src/modules/module3/adapters/questionBankAdapter.js
// Replace file-based load with Prisma query:
getQuestions({ subject, topic, difficulty, excludeIds }) {
  return prisma.question.findMany({
    where: {
      subject, topic, difficulty,
      approvalStatus: 'APPROVED',
      id: { notIn: excludeIds }
    }
  });
}
```

---

## Checklist for Full Integration

- [ ] Module 1: Implement `User`, `StudentProfile`, `PreAssessment` models
- [ ] Module 1: Update `MockStudentBaselineAdapter.getStudentBaseline()` to real DB
- [ ] Module 1: Set `ENABLE_MOCK_STUDENT=false` in production `.env`
- [x] Module 3: Implement `Question` & `QuestionOption` models matching `QuestionBankItemSchema`
- [x] Module 3: Implement AI generation service (OpenAI + Mock fallback)
- [x] Module 3: Implement duplicate & similarity detection
- [x] Module 3: Implement teacher review & approval queue
- [x] Module 3: Update `QuestionBankAdapter.getQuestions()` to query live DB + mock fallback
- [x] Module 3: Connect approved questions with Module 2 Adaptive Testing
- [x] Module 3: Implement student analytics & report generation consuming real response data
- [x] Module 3: Implement full teacher/admin UI (Generator, Bank, Pending Reviews, Analytics, Reports)
