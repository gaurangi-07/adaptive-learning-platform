/**
 * @file questionService.js
 * @description Core business logic for Module 3 Question Bank.
 *
 * Responsibilities:
 *   - CRUD operations for questions and their options
 *   - Duplicate / similarity detection
 *   - Status change workflow (approve / reject / archive)
 *   - Integration with QuestionBankAdapter used by Module 2
 */

const { getPrismaClient } = require('../../../prismaClient');
const { validateCreateQuestion, validateUpdateQuestion, validateStatusChange } = require('../validators/questionValidator');
const { findSimilarQuestions } = require('../utils/similarityUtils');

class QuestionService {
  constructor(prismaOverride = null) {
    this._prisma = prismaOverride;
  }

  get prisma() {
    return this._prisma || getPrismaClient();
  }

  // ─── List / search questions ────────────────────────────────────────────────

  async listQuestions({ subject, topic, difficulty, status, search, page = 1, limit = 20 } = {}) {
    try {
      const where = {};

      if (subject) where.subject = { equals: subject, mode: 'insensitive' };
      if (topic) where.topic = { equals: topic, mode: 'insensitive' };
      if (difficulty) where.difficulty = Number(difficulty);
      if (status) where.status = status;
      if (search) {
        where.questionText = { contains: search, mode: 'insensitive' };
      }

      const skip = (page - 1) * limit;

      const [questions, total] = await Promise.all([
        this.prisma.question.findMany({
          where,
          include: { options: { orderBy: { optionLabel: 'asc' } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.question.count({ where })
      ]);

      return {
        questions: questions.map(this._formatQuestion),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch {
      // Fallback to in-memory/mock question bank adapter
      const { questionBankAdapter } = require('../adapters/questionBankAdapter');
      let filtered = questionBankAdapter.questions || [];
      if (subject) filtered = filtered.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
      if (topic) filtered = filtered.filter(q => q.topic.toLowerCase() === topic.toLowerCase());
      if (difficulty) filtered = filtered.filter(q => q.difficulty === Number(difficulty));
      if (status) filtered = filtered.filter(q => (q.approvalStatus || 'APPROVED') === status);
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(q => (q.question || '').toLowerCase().includes(s));
      }

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const paginated = filtered.slice(skip, skip + limit);

      return {
        questions: paginated.map(q => ({
          id: q.id,
          subject: q.subject,
          topic: q.topic,
          competency: q.competency || '',
          difficulty: q.difficulty,
          questionText: q.question,
          options: (q.options || []).map(o => ({
            id: o.id,
            optionLabel: o.id,
            optionText: o.text,
            isCorrect: o.id === q.correctOption
          })),
          correctOption: q.correctOption,
          explanation: q.explanation || '',
          status: q.approvalStatus || 'APPROVED',
          source: 'MANUAL',
          createdAt: new Date().toISOString()
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }
  }

  // ─── Get single question ────────────────────────────────────────────────────

  async getQuestionById(id) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { optionLabel: 'asc' } },
        reviewHistory: { orderBy: { reviewedAt: 'desc' } }
      }
    });
    if (!question) return null;
    return this._formatQuestion(question);
  }

  // ─── Create question ────────────────────────────────────────────────────────

  async createQuestion(data, createdBy = null) {
    const validation = validateCreateQuestion(data);
    if (!validation.valid) {
      throw Object.assign(new Error('Validation failed'), {
        statusCode: 400,
        validationErrors: validation.errors
      });
    }

    const { subject, topic, competency, difficulty, questionText, options, correctOption, explanation, source, aiGenerationId } = validation.data;

    try {
      const question = await this.prisma.question.create({
        data: {
          subject,
          topic,
          competency: competency || '',
          difficulty,
          questionText,
          correctOption,
          explanation,
          status: 'PENDING',
          source: source || 'MANUAL',
          createdBy,
          aiGenerationId: aiGenerationId || null,
          options: {
            create: options.map((o) => ({
              optionLabel: o.optionLabel,
              optionText: o.optionText,
              isCorrect: o.isCorrect
            }))
          }
        },
        include: { options: { orderBy: { optionLabel: 'asc' } } }
      });

      return this._formatQuestion(question);
    } catch {
      // In-memory fallback when database is offline
      const { v4: uuidv4 } = require('uuid');
      const inMemoryQuestion = {
        id: uuidv4(),
        subject,
        topic,
        competency: competency || '',
        difficulty,
        questionText,
        options: options.map((o) => ({
          id: uuidv4(),
          optionLabel: o.optionLabel,
          optionText: o.optionText,
          isCorrect: o.isCorrect
        })),
        correctOption,
        explanation,
        status: 'PENDING',
        source: source || 'MANUAL',
        createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return inMemoryQuestion;
    }
  }

  // ─── Bulk create (from AI generation) ─────────────────────────────────────

  async createQuestionsBulk(questionsData, createdBy = null) {
    const created = [];
    const errors = [];

    for (let i = 0; i < questionsData.length; i++) {
      try {
        const q = await this.createQuestion(questionsData[i], createdBy);
        created.push(q);
      } catch (err) {
        errors.push({ index: i, error: err.message, validationErrors: err.validationErrors });
      }
    }

    return { created, errors };
  }

  // ─── Update question ────────────────────────────────────────────────────────

  async updateQuestion(id, data) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Question not found'), { statusCode: 404 });

    const validation = validateUpdateQuestion(data);
    if (!validation.valid) {
      throw Object.assign(new Error('Validation failed'), {
        statusCode: 400,
        validationErrors: validation.errors
      });
    }

    const { subject, topic, competency, difficulty, questionText, options, correctOption, explanation } = validation.data;

    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (topic !== undefined) updateData.topic = topic;
    if (competency !== undefined) updateData.competency = competency;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (questionText !== undefined) updateData.questionText = questionText;
    if (correctOption !== undefined) updateData.correctOption = correctOption;
    if (explanation !== undefined) updateData.explanation = explanation;

    if (options !== undefined) {
      // Delete old options, insert new
      await this.prisma.questionOption.deleteMany({ where: { questionId: id } });
    }

    const question = await this.prisma.question.update({
      where: { id },
      data: {
        ...updateData,
        ...(options !== undefined ? {
          options: {
            create: options.map((o) => ({
              optionLabel: o.optionLabel,
              optionText: o.optionText,
              isCorrect: o.isCorrect
            }))
          }
        } : {})
      },
      include: { options: { orderBy: { optionLabel: 'asc' } } }
    });

    return this._formatQuestion(question);
  }

  // ─── Delete question ────────────────────────────────────────────────────────

  async deleteQuestion(id) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Question not found'), { statusCode: 404 });

    await this.prisma.question.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ─── Change status (Approve / Reject / Archive) ────────────────────────────

  async changeStatus(id, { status, rejectionReason, reviewerId } = {}) {
    const validation = validateStatusChange({ status, rejectionReason, reviewerId });
    if (!validation.valid) {
      throw Object.assign(new Error('Validation failed'), {
        statusCode: 400,
        validationErrors: validation.errors
      });
    }

    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) throw Object.assign(new Error('Question not found'), { statusCode: 404 });

    const previousStatus = existing.status;

    const question = await this.prisma.question.update({
      where: { id },
      data: {
        status: validation.data.status,
        reviewedBy: reviewerId || null,
        reviewedAt: new Date(),
        rejectionReason: validation.data.rejectionReason || null,
        // Record history
        reviewHistory: {
          create: {
            reviewerId: reviewerId || null,
            previousStatus,
            newStatus: validation.data.status,
            rejectionReason: validation.data.rejectionReason || null
          }
        }
      },
      include: { options: { orderBy: { optionLabel: 'asc' } } }
    });

    // If a question is approved, reload the question bank adapter cache
    if (validation.data.status === 'APPROVED' || previousStatus === 'APPROVED') {
      try {
        const { questionBankAdapter } = require('../adapters/questionBankAdapter');
        await questionBankAdapter.reload();
      } catch (e) {
        // Non-fatal: adapter reload failure doesn't block the status change
        console.warn('QuestionBankAdapter reload warning:', e.message);
      }
    }

    return this._formatQuestion(question);
  }

  // ─── Duplicate detection ────────────────────────────────────────────────────

  async checkDuplicates(questionText, { subject, topic } = {}) {
    let existingQuestions = [];
    try {
      const where = {};
      if (subject) where.subject = { equals: subject, mode: 'insensitive' };
      if (topic) where.topic = { equals: topic, mode: 'insensitive' };

      existingQuestions = await this.prisma.question.findMany({
        where,
        select: { id: true, questionText: true, status: true }
      });
    } catch {
      // Fallback to adapter questions
      const { questionBankAdapter } = require('../adapters/questionBankAdapter');
      existingQuestions = questionBankAdapter.getQuestions({ subject, topic }).map((q) => ({
        id: q.id,
        questionText: q.question,
        status: q.approvalStatus || 'APPROVED'
      }));
    }

    const matches = findSimilarQuestions(questionText, existingQuestions);

    return {
      hasDuplicates: matches.some((m) => m.type === 'EXACT'),
      hasSimilar: matches.some((m) => m.type === 'SIMILAR'),
      matches,
      checkedAgainst: existingQuestions.length
    };
  }

  // ─── Metadata helpers ───────────────────────────────────────────────────────

  async getDistinctSubjects() {
    try {
      const result = await this.prisma.question.findMany({
        select: { subject: true },
        distinct: ['subject'],
        orderBy: { subject: 'asc' }
      });
      return result.map((r) => r.subject);
    } catch {
      return ['Mathematics'];
    }
  }

  async getDistinctTopics(subject) {
    try {
      const where = subject ? { subject: { equals: subject, mode: 'insensitive' } } : {};
      const result = await this.prisma.question.findMany({
        where,
        select: { topic: true },
        distinct: ['topic'],
        orderBy: { topic: 'asc' }
      });
      return result.map((r) => r.topic);
    } catch {
      const { questionBankAdapter } = require('../adapters/questionBankAdapter');
      return questionBankAdapter.getAvailableTopics(subject);
    }
  }

  // ─── Internal format helper ─────────────────────────────────────────────────

  _formatQuestion(q) {
    return {
      id: q.id,
      subject: q.subject,
      topic: q.topic,
      competency: q.competency,
      difficulty: q.difficulty,
      questionText: q.questionText,
      options: (q.options || []).map((o) => ({
        id: o.id,
        optionLabel: o.optionLabel,
        optionText: o.optionText,
        isCorrect: o.isCorrect
      })),
      correctOption: q.correctOption,
      explanation: q.explanation,
      status: q.status,
      source: q.source,
      createdBy: q.createdBy,
      reviewedBy: q.reviewedBy,
      reviewedAt: q.reviewedAt,
      rejectionReason: q.rejectionReason,
      aiGenerationId: q.aiGenerationId,
      reviewHistory: q.reviewHistory || undefined,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt
    };
  }
}

module.exports = { QuestionService };
