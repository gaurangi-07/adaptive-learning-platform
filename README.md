# Adaptive Learning Platform — Module 2: Adaptive Testing System

## Project Overview

**Official Problem Statement:** Integration of AI for Adaptive Learning for MCQ Selection in PARAKH

**Module 2 — Adaptive Testing System** is a fully working computer-adaptive testing (CAT) engine that:
- Receives student baseline ability from Module 1
- Presents MCQ questions that dynamically adjust in difficulty
- Tracks per-topic proficiency and response analytics
- Delivers structured assessment summaries to Module 3

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
│       │   └── module3/         # Placeholder (Teammate 3)
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
│       │   └── module3/         # Integration contracts + mock adapter
│       ├── app.js
│       └── server.js
├── prisma/
│   └── schema.prisma            # Database models
├── mocks/
│   └── questions.json           # 65 sample Mathematics questions
├── tests/
│   └── adaptiveAlgorithm.test.js
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

# 5. Start backend
cd server && npm run dev

# 6. Install and start frontend
cd ../client && npm install && npm run dev
```

See [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) for full instructions.

---

## Team Assignments

| Module | Teammate | Status |
|--------|----------|--------|
| Module 1 — Student Profiling & Pre-Assessment | Teammate 1 | Placeholder contracts ready |
| **Module 2 — Adaptive Testing System** | **You (Aryan)** | **Complete** |
| Module 3 — Question Bank & Analytics | Teammate 3 | Placeholder contracts ready |

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

---

## License

MIT License — University Major Project, 2026

