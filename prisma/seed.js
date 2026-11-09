/**
 * @file seed.js
 * @description Seeds the PostgreSQL database with the 65 curated Mathematics questions
 * from mocks/questions.json into the Module 3 Question and QuestionOption tables.
 *
 * Usage:
 *   npx prisma db seed
 *   or: node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for PARAKH Question Bank...');

  const questionsFilePath = path.resolve(__dirname, '../mocks/questions.json');
  if (!fs.existsSync(questionsFilePath)) {
    console.error(`❌ mocks/questions.json not found at ${questionsFilePath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(questionsFilePath, 'utf8');
  const questions = JSON.parse(rawData);

  console.log(`📖 Found ${questions.length} questions in mocks/questions.json.`);

  let inserted = 0;
  let skipped = 0;

  for (const q of questions) {
    // Check if question already exists
    const existing = await prisma.question.findUnique({
      where: { id: q.id }
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.question.create({
      data: {
        id: q.id,
        subject: q.subject || 'Mathematics',
        topic: q.topic,
        competency: q.competency || '',
        difficulty: q.difficulty,
        questionText: q.question,
        correctOption: q.correctOption,
        explanation: q.explanation || '',
        status: q.approvalStatus === 'APPROVED' ? 'APPROVED' : 'PENDING',
        source: 'MANUAL',
        options: {
          create: (q.options || []).map((opt) => ({
            optionLabel: opt.id,
            optionText: opt.text,
            isCorrect: opt.id === q.correctOption
          }))
        }
      }
    });

    inserted++;
  }

  console.log(`✅ Seeding complete!`);
  console.log(`   - Inserted : ${inserted} questions`);
  console.log(`   - Skipped  : ${skipped} (already exist)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
