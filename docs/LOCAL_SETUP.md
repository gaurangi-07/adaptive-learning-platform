# Local Setup Guide

## Prerequisites
- Node.js v18 or later
- PostgreSQL 14 or later (running locally)
- npm v9 or later

## 1. Clone & Configure

```bash
git clone https://github.com/gaurangi-07/adaptive-learning-platform.git
cd adaptive-learning-platform
cp .env.example .env
```

Edit `.env` and set your PostgreSQL credentials:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/adaptive_learning_db?schema=public"
```

## 2. Create the Database

```bash
psql -U postgres -c "CREATE DATABASE adaptive_learning_db;"
```

## 3. Install Server Dependencies

```bash
cd server
npm install
```

## 4. Generate Prisma Client & Run Migrations

From the project root:
```bash
cd ..
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate dev --name init --schema prisma/schema.prisma
```

## 5. Start the Backend

```bash
cd server
npm run dev
```
Server starts at `http://localhost:5000`  
Health check: `http://localhost:5000/api/adaptive/health`

## 6. Install & Start Frontend

```bash
cd client
npm install
npm run dev
```
Frontend starts at `http://localhost:5173`

## 7. Run Tests

```bash
cd server
npm test
```

## 8. Build Frontend (Production)

```bash
cd client
npm run build
```
Build output appears in `client/dist/`

## Common Issues

**PostgreSQL not running:**  
Mac: `brew services start postgresql@18`

**Prisma migration errors:**  
Reset with: `npx prisma migrate reset --schema prisma/schema.prisma`

**Port already in use:**  
Change `PORT=5001` in `.env`

