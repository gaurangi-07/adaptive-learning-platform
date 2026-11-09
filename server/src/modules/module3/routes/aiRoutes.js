/**
 * @file aiRoutes.js
 * @description Express routes for Module 3 AI Question Generation.
 *
 * Base path: /api/ai
 */

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { generateQuestions } = require('../services/aiService');
const { validateAIGenerateRequest } = require('../validators/questionValidator');
const { QuestionService } = require('../services/questionService');
const { getPrismaClient } = require('../../../prismaClient');

const router = Router();
const questionService = new QuestionService();

// ─── POST /api/ai/generate ────────────────────────────────────────────────────
router.post('/generate', async (req, res, next) => {
  try {
    const validation = validateAIGenerateRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: 'Invalid request', details: validation.errors });
    }

    const { subject, topic, difficulty, count } = validation.data;
    const createdBy = req.headers['x-user-id'] || null;

    // Create generation log
    const prisma = getPrismaClient();
    let generationLog = { id: uuidv4() };
    let dbLogCreated = false;
    try {
      if (prisma) {
        const dbLog = await prisma.aIGenerationLog.create({
          data: {
            id: generationLog.id,
            provider: process.env.AI_PROVIDER || 'mock',
            subject,
            topic,
            difficulty,
            requestedCount: count,
            status: 'PENDING'
          }
        });
        generationLog = dbLog;
        dbLogCreated = true;
      }
    } catch {
      // Database offline — in-memory fallback log with valid UUID
    }

    let generationResult;
    try {
      generationResult = await generateQuestions({ subject, topic, difficulty, count });
    } catch (aiErr) {
      // Update log to FAILED
      try {
        if (prisma) {
          await prisma.aIGenerationLog.update({
            where: { id: generationLog.id },
            data: { status: 'FAILED', errorMessage: aiErr.message }
          });
        }
      } catch {}
      return res.status(502).json({
        success: false,
        error: `AI provider error: ${aiErr.message}`,
        provider: process.env.AI_PROVIDER || 'mock'
      });
    }

    const { questions: validatedQuestions, invalidCount, errors, provider } = generationResult;

    // Run duplicate check and save valid questions
    const savedQuestions = [];
    const duplicateWarnings = [];
    const saveErrors = [];

    for (const q of validatedQuestions) {
      // Check for duplicates before saving
      const dupCheck = await questionService.checkDuplicates(q.questionText, { subject, topic });

      if (dupCheck.hasDuplicates) {
        // Exact duplicate — skip silently but warn
        duplicateWarnings.push({
          questionText: q.questionText.slice(0, 80) + '…',
          type: 'EXACT_DUPLICATE',
          matchedId: dupCheck.matches[0]?.questionId
        });
        continue;
      }

      try {
        const saved = await questionService.createQuestion(
          { ...q, aiGenerationId: generationLog.id },
          createdBy
        );
        savedQuestions.push(saved);

        if (dupCheck.hasSimilar) {
          duplicateWarnings.push({
            questionId: saved.id,
            questionText: q.questionText.slice(0, 80) + '…',
            type: 'SIMILAR',
            matches: dupCheck.matches.slice(0, 3)
          });
        }
      } catch (saveErr) {
        saveErrors.push({ error: saveErr.message });
      }
    }

    // Update generation log
    try {
      if (prisma && dbLogCreated) {
        await prisma.aIGenerationLog.update({
          where: { id: generationLog.id },
          data: {
            status: 'COMPLETED',
            generatedCount: validatedQuestions.length,
            validCount: savedQuestions.length
          }
        });
      }
    } catch {}

    res.status(201).json({
      success: true,
      data: {
        generationId: generationLog.id,
        provider,
        subject,
        topic,
        difficulty,
        requestedCount: count,
        generatedCount: validatedQuestions.length,
        savedCount: savedQuestions.length,
        invalidCount,
        duplicatesSkipped: duplicateWarnings.filter((w) => w.type === 'EXACT_DUPLICATE').length,
        questions: savedQuestions,
        duplicateWarnings,
        validationErrors: errors,
        saveErrors,
        message: `${savedQuestions.length} question(s) generated and saved as PENDING. Requires teacher review.`
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/ai/logs ─────────────────────────────────────────────────────────
router.get('/logs', async (req, res, next) => {
  try {
    const prisma = getPrismaClient();
    const logs = await prisma.aIGenerationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, data: { logs } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/ai/health ───────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  const provider = process.env.AI_PROVIDER || 'mock';
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const groqConfigured = Boolean(process.env.GROQ_API_KEY);
  res.json({
    success: true,
    data: {
      provider,
      openaiConfigured,
      groqConfigured,
      model: provider === 'groq'
        ? process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
        : process.env.OPENAI_MODEL || 'gpt-4o-mini',
      status: (provider === 'openai' && !openaiConfigured) ||
        (provider === 'groq' && !groqConfigured) ? 'misconfigured' : 'ready'
    }
  });
});

module.exports = router;
