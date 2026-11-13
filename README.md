# Adaptive Learning Platform — PARAKH Adaptive Assessment System

**Official Problem Statement:** Integration of AI for Adaptive Learning for MCQ Selection in PARAKH

## Project Overview
## Module 1 — Student Management & Pre-Assessment

Module 1 is the **entry point** of the entire PARAKH platform. It handles everything from a student first creating an account to producing a fully computed baseline proficiency profile that the adaptive engine (Module 2) uses to personalise its question selection.

---

### Module 1 Features

- ✅ **Student Registration** — Full sign-up form collecting name, email, password (bcrypt-hashed, 12 salt rounds), college, branch, and year of study. Duplicate email is rejected immediately.
- ✅ **JWT Authentication** — On every successful login the server signs a JWT (HS256). The `protect` middleware verifies the token on every protected route and attaches `req.student` for downstream use.
- ✅ **Student Dashboard** — Personalised SaaS-style dashboard with a collapsible sidebar, stat cards (overall accuracy, questions attempted, strong/weak topics), a Recharts topic-proficiency bar chart, and direct action buttons for Diagnostic Test and Adaptive Test.
- ✅ **Diagnostic Pre-Assessment (10-question MCQ)** — Covers 5 topics (2 questions each) at a fixed medium difficulty. Includes a per-question countdown timer, a question navigation panel, mark-for-review flags, auto-save on every answer, and full session resumption if the student closes the tab mid-test.
- ✅ **Baseline Proficiency Calculation** — Immediately after the pre-assessment is submitted the server computes: overall accuracy percentage, per-topic proficiency score (0–100), identification of strong topics (≥ 60 %) and weak topics (< 60 %), and an initial difficulty tier (Easy / Medium / Hard).
- ✅ **BaselineResult Persistence** — The computed scores are written to the `BaselineResult` table in PostgreSQL and are immediately available to Module 2 via `GET /api/student/dashboard`.
- ✅ **Active Assessment Recovery** — On every login the frontend checks `GET /api/assessment/active`. If an in-progress session is found, a modal offers the student the option to resume exactly where they left off or abandon the attempt.
- ✅ **Assessment History** — A paginated table listing every pre-assessment attempt with its date, total score, and status (COMPLETED / ABANDONED).
- ✅ **Student Profile Management** — Students can view and update their college, branch, and year of study at any time without affecting their assessment records.
- ✅ **Teacher's Portal Link** — The dashboard sidebar contains a dedicated **Teacher's Portal** entry that navigates directly to the Module 3 AI question generation and analytics interface.

---

**Module 2 — Adaptive Testing System** is a fully working computer-adaptive testing (CAT) engine that:
- Receives student baseline ability from Module 1
- Presents MCQ questions that dynamically adjust in difficulty
- Tracks per-topic proficiency and response analytics
- Delivers structured assessment summaries to Module 3

---
## Module 2 Features

- ✅ Adaptive question-difficulty engine (3 levels: Easy / Medium / Hard)
- ✅ Per-topic proficiency tracking
- ✅ Question repetition prevention
- ✅ Server-enforced 90-second question timer with expiry
- ✅ Duplicate submission protection
- ✅ Correct answer hidden from frontend before submission
- ✅ Post-answer explanation & difficulty change explanation
- ✅ Assessment summary with topic breakdown for Module 3
- ✅ 65 curated Mathematics questions (5 topics × 13 each)
- ✅ Full REST API with Zod validation
- ✅ React UI with responsive, accessible design
- ✅ 20+ automated unit tests

---


## Repository Structure

```
adaptive-learning-platform/
├── client/                      # React + Vite frontend
│   └── src/
│       ├── modules/
│       │   ├── module1/         # Placeholder (Teammate 1)
│       │   ├── module2/         # Complete implementation
│       │   │   ├── components/  # UI components
│       │   │   ├── pages/       # Route pages
│       │   │   ├── hooks/       # React hooks
│       │   │   ├── services/    # API client calls
│       │   │   └── utils/       # Utility helpers
│       │   └── module3/         # AI question bank and analytics
│       ├── App.jsx
│       └── main.jsx
├── server/                      # Node.js + Express backend
│   └── src/
│       ├── modules/
│       │   ├── module1/         # Integration contracts + mock adapter
│       │   ├── module2/         # Complete implementation
│       │   │   ├── routes/      # Express routes
│       │   │   ├── controllers/ # Request handlers
│       │   │   ├── services/    # Business logic
│       │   │   ├── algorithms/  # Adaptive algorithm
│       │   │   ├── middleware/  # Validation, error handling
│       │   │   └── validators/  # Zod schemas
│       │   └── module3/         # AI, question bank, review, and analytics
│       ├── app.js
│       └── server.js
├── prisma/
│   └── schema.prisma            # Database models
├── mocks/
│   └── questions.json           # 65 sample Mathematics questions
├── tests/                       # Adaptive, integration, and Module 3 tests
├── docs/
│   ├── MODULE2_OVERVIEW.md
│   ├── API_CONTRACTS.md
│   ├── ADAPTIVE_ALGORITHM.md
│   ├── DATABASE_SCHEMA.md
│   ├── INTEGRATION_GUIDE.md
│   ├── LOCAL_SETUP.md
│   └── TESTING.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/gaurangi-07/adaptive-learning-platform.git
cd adaptive-learning-platform

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Install server dependencies
cd server && npm install

# 4. Run Prisma migrations
cd .. && DATABASE_URL="postgresql://..." npx prisma migrate dev --name init --schema prisma/schema.prisma

# 5. Install frontend dependencies
cd client && npm install

# 6. Start backend and frontend together from the project root
cd .. && npm run dev:all
```

See [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) for full instructions.

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- Backend health: `http://localhost:5001/api/health`

---

## Team Assignments

| Module | Teammate | Status |
|--------|----------|--------|
| Module 1 — Student Profiling & Pre-Assessment | Teammate 1 | Placeholder contracts ready |
| **Module 2 — Adaptive Testing System** | **Aryan (Person 2)** | **Complete** |
| **Module 3 — AI Question Bank & Analytics** | **Person 3** | **Complete** |

---

## Module 3 Features (Person 3 — AI Question Bank & Student Analytics)

- ✅ **AI Question Generation**: Automated MCQ generation with subject, topic, and difficulty controls (Groq API + deterministic Mock AI).
- ✅ **Rigorous MCQ Validation**: Zod-based validation ensuring 4 distinct options (A/B/C/D), exactly 1 correct answer, non-empty statements, explanations, and proper difficulty levels.
- ✅ **Duplicate & Similarity Detection**: Hybrid character n-gram + word-token Jaccard similarity algorithm detecting exact duplicates and flagging similar questions for review.
- ✅ **Question Bank Management**: Full CRUD interface with search, multi-field filtering, pagination, and deletion protection.
- ✅ **Teacher Review Workflow**: Dedicated review queue for `PENDING` questions with inline editing, one-click approvals, and audit-logged rejections with mandatory reasons.
- ✅ **Seamless Module 2 Integration**: Approved questions automatically feed into Person 2's adaptive engine via `QuestionBankAdapter`.
- ✅ **Strict Answer-Key Protection**: `correctOption` and `explanation` strictly stripped from all student-facing assessment responses.
- ✅ **Student Performance Analytics**: Real-time aggregation of accuracy, topic breakdown, difficulty performance, and response times from `StudentResponse` records.
- ✅ **Data Visualizations**: Recharts-powered bar charts, pie charts, and progression line charts.
- ✅ **Student Performance Reports**: Printable/PDF official performance transcripts with topic mastery indicators and recommended learning pathways.

### Module 3 API

- `POST /api/ai/generate` - Generate, validate, check, and save questions as `PENDING`.
- `GET /api/questions` - Search and filter the question bank.
- `PATCH /api/questions/:id/status` - Approve, reject, or archive questions.
- `GET /api/analytics/report/:studentId` - Get a full performance report.
- `GET /api/analytics/topic-performance/:studentId` - Get topic-level results.
- `GET /api/analytics/difficulty-performance/:studentId` - Get difficulty-level results.
- `GET /api/analytics/time-performance/:studentId` - Get response-time results.

### Module 3 Workflow

```text
Groq or mock generation -> validation -> duplicate check -> PENDING
	-> teacher review -> APPROVED -> Module 2 adaptive assessment
```

---


## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |
| `ENABLE_MOCK_STUDENT` | Use mock student baselines (dev only) |
| `SESSION_QUESTION_COUNT` | Questions per session (default: 10) |
| `QUESTION_TIMEOUT_SECONDS` | Per-question time limit (default: 90) |
| `AI_PROVIDER` | `mock`, `groq`, or `openai` (default: `mock`) |
| `GROQ_API_KEY` | Server-side Groq API key; never commit this value |
| `GROQ_MODEL` | Groq model, such as `openai/gpt-oss-20b` |
| `OPENAI_API_KEY` | Optional OpenAI key when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | Optional OpenAI model when `AI_PROVIDER=openai` |
| `ENABLE_MOCK_QUESTION_BANK` | Use approved mock questions instead of database questions |

For live Groq generation, add these values to the local `server/.env` file:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-20b
ENABLE_MOCK_QUESTION_BANK=false
```

Use `AI_PROVIDER=mock` for development without an external AI key. See the Module 3 guides in [server/src/modules/module3/README.md](server/src/modules/module3/README.md) and [client/src/modules/module3/README.md](client/src/modules/module3/README.md).

---

## License

MIT License — University Major Project, 2026
