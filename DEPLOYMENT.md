# PARAKH — Production Deployment Guide

This guide walks through deploying the complete **PARAKH Adaptive Learning Platform** to production:
- **Database:** [Neon Serverless PostgreSQL](https://neon.tech)
- **Backend:** [Render](https://render.com) (Node.js + Express Web Service)
- **Frontend:** [Vercel](https://vercel.com) (React + Vite SPA)

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             Vercel CDN                 │
                      │   PARAKH Frontend (React + Vite)       │
                      │   https://your-app.vercel.app          │
                      └──────────────────┬─────────────────────┘
                                         │
                         HTTPS API calls │ (VITE_API_URL)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │             Render Web Service         │
                      │   PARAKH Backend (Express API)         │
                      │   https://your-api.onrender.com        │
                      └──────────────────┬─────────────────────┘
                                         │
                        PostgreSQL (SSL) │ (DATABASE_URL)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │             Neon PostgreSQL            │
                      │   Serverless Database + Prisma ORM     │
                      │   ep-xyz.us-east-2.aws.neon.tech       │
                      └────────────────────────────────────────┘
```

---

## 1. Neon PostgreSQL Setup

1. **Create an Account & Project:**
   - Go to [neon.tech](https://neon.tech) and sign in.
   - Click **"Create Project"**.
   - Set the project name (e.g. `parakh-adaptive-db`).
   - Choose a region closest to your Render deployment (e.g. `AWS US East (Ohio)`).
   - Postgres version: **16** (or default).
   - Click **"Create project"**.

2. **Retrieve the Connection String:**
   - In the Neon Console Dashboard, find the **Connection Details** widget.
   - Choose **"Pooled connection"** (recommended for production) or **"Direct connection"**.
   - Make sure **"Prisma"** or **"Node.js"** format is selected.
   - The connection string looks like:
     ```text
     postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - Copy this string — you will use it as `DATABASE_URL` in Render and for the migration step.

---

## 2. Prisma Production Migration (Neon)

Before starting the backend on Render, apply the database schema to your Neon database.

### Option A: From your local terminal (Recommended & Safest)

Run the production migration command pointing to your Neon database:

```bash
# Set your Neon DATABASE_URL and run the migration deploy command
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" npx prisma migrate deploy --schema prisma/schema.prisma
```

Expected output:
```text
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "neondb", schema "public"

1 migration found in prisma/migrations
Applying migration `20261109080500_init`

All migrations have been successfully applied.
```

### Option B: Automatic migration on Render Build

You can set your Render **Build Command** to automatically apply migrations during every deploy:

```bash
npm install && npx prisma generate --schema prisma/schema.prisma && npx prisma migrate deploy --schema prisma/schema.prisma
```

---

## 3. Render Backend Deployment

1. **Create a New Web Service:**
   - Go to [dashboard.render.com](https://dashboard.render.com) and click **"New +"** → **"Web Service"**.
   - Connect your GitHub repository: `gaurangi-07/adaptive-learning-platform`.
   - Branch: `main`.

2. **Configure Service Settings:**
   - **Name:** `parakh-backend` (or your preferred name)
   - **Region:** Same region as your Neon database (e.g. `Ohio (US East)`)
   - **Environment:** `Node`
   - **Root Directory:** Leave empty (uses repository root)
   - **Build Command:**
     ```bash
     npm install && npx prisma generate --schema prisma/schema.prisma && npx prisma migrate deploy --schema prisma/schema.prisma
     ```
   - **Start Command:**
     ```bash
     node server/src/server.js
     ```
   - **Plan:** Free (or Starter for persistent uptime)

3. **Configure Environment Variables (in Render Dashboard → "Environment"):**

   | Variable Name | Recommended Value / Description | Required? |
   |---------------|---------------------------------|-----------|
   | `NODE_ENV` | `production` | **Yes** |
   | `PORT` | `10000` (Render assigns this automatically) | Render auto-sets |
   | `DATABASE_URL` | Your Neon PostgreSQL connection string with `?sslmode=require` | **Yes** |
   | `JWT_SECRET` | Strong random 64+ char string (generate: `openssl rand -base64 32`) | **Yes** |
   | `CLIENT_URL` | Your Vercel frontend URL (e.g. `https://parakh.vercel.app`) | **Yes** |
   | `FRONTEND_URL` | Same as `CLIENT_URL` (supported as alias) | Optional |
   | `AI_PROVIDER` | `mock` (or `groq` for live AI generation) | **Yes** |
   | `GROQ_API_KEY` | Your Groq API key (if `AI_PROVIDER=groq`) | Optional |
   | `GROQ_MODEL` | `llama-3.1-8b-instant` | Optional |
   | `ENABLE_MOCK_QUESTION_BANK` | `true` (serves 65 curated math questions when DB is new) | **Yes** |
   | `ENABLE_MOCK_STUDENT` | `false` (enforces real database persistence) | **Yes** |
   | `SESSION_QUESTION_COUNT` | `10` | Optional |
   | `QUESTION_TIMEOUT_SECONDS`| `90` | Optional |

4. **Health Check Path:**
   - In Render service settings, set **Health Check Path** to `/health` or `/api/health`.

5. **Deploy:**
   - Click **"Create Web Service"**.
   - Wait for the build and deployment logs to show:
     ```text
     🚀  Adaptive Learning Platform — Unified API Server
        Environment : production
        Host        : 0.0.0.0:10000
        Health      : http://localhost:10000/api/health
     ```
   - Copy your deployed Render URL (e.g. `https://parakh-backend.onrender.com`).

---

## 4. Vercel Frontend Deployment

1. **Import Project on Vercel:**
   - Go to [vercel.com](https://vercel.com) and click **"Add New..."** → **"Project"**.
   - Import your GitHub repository: `gaurangi-07/adaptive-learning-platform`.

2. **Configure Project Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `client` (Click "Edit" and choose `client`)
   - **Build Command:** `npm run build` (or leave default `vite build`)
   - **Output Directory:** `dist` (default)
   - **Install Command:** `npm install` (default)

3. **Configure Environment Variables (in Vercel Project Settings):**

   | Variable Name | Value | Required? |
   |---------------|-------|-----------|
   | `VITE_API_URL` | Your deployed Render backend URL (e.g. `https://parakh-backend.onrender.com`) | **Yes** |

   > **Note:** Do NOT include a trailing slash, or if you do, the app automatically strips it and appends `/api`.

4. **Deploy:**
   - Click **"Deploy"**.
   - Vercel will install dependencies, build the static bundle with chunk optimizations, and deploy to Vercel's Edge Network.
   - Copy your Vercel production URL (e.g. `https://parakh.vercel.app`).

5. **Update Render CORS:**
   - Return to your Render Dashboard → `parakh-backend` → **Environment**.
   - Ensure `CLIENT_URL` matches your exact Vercel URL (e.g. `https://parakh.vercel.app`).
   - Render will automatically trigger a zero-downtime redeploy with the updated CORS origin.

---

## 5. Post-Deployment Verification Checklist

Once both services are deployed, perform the following verification:

- [ ] **1. Backend Health Check:**
  - Visit: `https://your-backend.onrender.com/health` → returns `{"status":"ok", ...}`
  - Visit: `https://your-backend.onrender.com/api/health` → returns `{"success":true, "data":{...}}`

- [ ] **2. Frontend Initial Load:**
  - Open: `https://your-frontend.vercel.app`
  - Verifies that the login page loads smoothly without console errors.

- [ ] **3. Student Registration (Module 1):**
  - Navigate to `/signup`.
  - Register a new student account (Name, Email, Password, College, Branch, Year).
  - Verifies:
    - Form submission returns `HTTP 201 Created`.
    - JWT is saved to browser `localStorage`.
    - Redirects cleanly to `/module1/dashboard`.
    - Student record is inserted into Neon PostgreSQL.

- [ ] **4. SPA Page Refresh (Vercel Routing):**
  - While on `/module1/dashboard`, press **Ctrl+R** / **Cmd+R** (Hard Refresh).
  - Verifies that `vercel.json` rewrites work and the dashboard reloads without 404.

- [ ] **5. Diagnostic Pre-Assessment (Module 1):**
  - Click **"Start Diagnostic Test"**.
  - Answer 10 MCQs across topics.
  - Submit the pre-assessment.
  - Verifies:
    - Baseline accuracy and topic scores are computed.
    - `BaselineResult` is persisted in Neon PostgreSQL.

- [ ] **6. Adaptive Assessment (Module 2):**
  - From the dashboard, click **"Start Adaptive Test"**.
  - Verifies:
    - The engine seeds ability from the student's baseline level.
    - Difficulty adjusts dynamically after each submission.
    - Timer countdown and timeout detection function properly.
    - Completion leads to the summary and unified report (`/report/:attemptId`).

- [ ] **7. Teacher's Portal & AI Generation (Module 3):**
  - Click **"Teacher's Portal"** in the sidebar (navigates to `/module3`).
  - Verify Question Bank renders the questions.
  - Navigate to **"AI Question Generator"** and generate 2 questions.
  - Verify new questions are generated, validated, and listed in pending reviews.

---

## 6. Troubleshooting Common Production Issues

### Issue 1: CORS Error in Browser Console
- **Symptom:** `Access to XMLHttpRequest at 'https://...onrender.com/api/...' from origin 'https://...vercel.app' has been blocked by CORS policy`.
- **Solution:** In Render Dashboard → Environment Variables, verify `CLIENT_URL` is set to your exact Vercel URL without trailing slash (e.g. `https://parakh.vercel.app`). Also note that the backend automatically permits all `https://*.vercel.app` preview URLs.

### Issue 2: Render Free Tier Cold Starts
- **Symptom:** The first request after 15 minutes of inactivity takes 40-50 seconds to respond.
- **Solution:** This is standard for Render's free tier (services spin down when idle). Subsequent requests are instant. For 24/7 instant response, upgrade the Render web service to the "Starter" plan ($7/mo) or set up a free health-check ping (e.g. via UptimeRobot) targeting `https://your-backend.onrender.com/health` every 10 minutes.

### Issue 3: Page Refresh 404 on Vercel
- **Symptom:** Visiting `https://your-app.vercel.app/quiz/xyz` directly or refreshing results in a Vercel 404 page.
- **Solution:** Both `client/vercel.json` and root `vercel.json` include SPA rewrite rules routing all traffic to `/index.html`. Ensure `vercel.json` is committed in your git repository.

### Issue 4: Neon Database Connection Dropped / SSL Error
- **Symptom:** `Can't reach database server` or `Connection terminated unexpectedly`.
- **Solution:** Always ensure `?sslmode=require` is present at the end of your Neon `DATABASE_URL`. Use Neon's **pooled connection string** (port 5432 with `-pooler` in host) for higher concurrency.
