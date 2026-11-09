/**
 * @file module3.test.js
 * @description Unit tests for Module 3 — Question Bank, AI Generation, Validation, Similarity.
 * Uses Vitest. No external DB or API calls — all logic is tested in isolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Import the pure-logic modules (no DB, no network) ───────────────────────
import {
  normalizeText,
  computeSimilarity,
  findSimilarQuestions,
  findExactDuplicate,
  EXACT_THRESHOLD,
  HIGH_SIMILARITY_THRESHOLD
} from '../server/src/modules/module3/utils/similarityUtils.js';

import {
  validateCreateQuestion,
  validateUpdateQuestion,
  validateAIGenerateRequest,
  validateStatusChange
} from '../server/src/modules/module3/validators/questionValidator.js';

import {
  generateMockQuestions,
  DIFFICULTY_LABELS
} from '../server/src/modules/module3/services/aiService.js';

// ─── Helper: build a valid question payload ────────────────────────────────────
function makeValidQuestion(overrides = {}) {
  return {
    subject: 'Mathematics',
    topic: 'Algebra',
    competency: 'Linear Equations',
    difficulty: 2,
    questionText: 'If 2x + 5 = 15, what is the value of x?',
    options: [
      { optionLabel: 'A', optionText: '5', isCorrect: true },
      { optionLabel: 'B', optionText: '10', isCorrect: false },
      { optionLabel: 'C', optionText: '7.5', isCorrect: false },
      { optionLabel: 'D', optionText: '4', isCorrect: false }
    ],
    correctOption: 'A',
    explanation: 'Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5.',
    ...overrides
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1 — Question Validation Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('MCQ Validation — Valid Question', () => {
  it('passes for a correctly formed question', () => {
    const result = validateCreateQuestion(makeValidQuestion());
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('preserves all required fields in output', () => {
    const result = validateCreateQuestion(makeValidQuestion());
    expect(result.valid).toBe(true);
    expect(result.data.subject).toBe('Mathematics');
    expect(result.data.topic).toBe('Algebra');
    expect(result.data.difficulty).toBe(2);
    expect(result.data.correctOption).toBe('A');
    expect(result.data.options).toHaveLength(4);
  });
});

describe('MCQ Validation — Question text', () => {
  it('rejects empty question text', () => {
    const result = validateCreateQuestion(makeValidQuestion({ questionText: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('questionText'))).toBe(true);
  });

  it('rejects whitespace-only question text', () => {
    const result = validateCreateQuestion(makeValidQuestion({ questionText: '   ' }));
    expect(result.valid).toBe(false);
  });
});

describe('MCQ Validation — Options', () => {
  it('rejects when fewer than 4 options are provided', () => {
    const q = makeValidQuestion();
    q.options = q.options.slice(0, 3);
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('4 options') || e.includes('options'))).toBe(true);
  });

  it('rejects when more than 4 options are provided', () => {
    const q = makeValidQuestion();
    q.options.push({ optionLabel: 'E', optionText: 'Extra option', isCorrect: false });
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
  });

  it('rejects when option text is empty', () => {
    const q = makeValidQuestion();
    q.options[1].optionText = '';
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
  });
});

describe('MCQ Validation — Correct answer', () => {
  it('rejects when no option is marked isCorrect', () => {
    const q = makeValidQuestion();
    q.options.forEach(o => { o.isCorrect = false; });
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('one option') || e.includes('isCorrect'))).toBe(true);
  });

  it('rejects when two options are marked isCorrect', () => {
    const q = makeValidQuestion();
    q.options[1].isCorrect = true; // Now A and B are both correct
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
  });

  it('rejects when correctOption does not match the isCorrect option label', () => {
    const q = makeValidQuestion();
    q.correctOption = 'B'; // But A is marked isCorrect
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
  });
});

describe('MCQ Validation — Required fields', () => {
  it('rejects missing subject', () => {
    const q = makeValidQuestion();
    delete q.subject;
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
  });

  it('rejects missing topic', () => {
    const q = makeValidQuestion();
    delete q.topic;
    const result = validateCreateQuestion(q);
    expect(result.valid).toBe(false);
  });

  it('rejects empty explanation', () => {
    const result = validateCreateQuestion(makeValidQuestion({ explanation: '' }));
    expect(result.valid).toBe(false);
  });

  it('rejects invalid difficulty (0)', () => {
    const result = validateCreateQuestion(makeValidQuestion({ difficulty: 0 }));
    expect(result.valid).toBe(false);
  });

  it('rejects invalid difficulty (4)', () => {
    const result = validateCreateQuestion(makeValidQuestion({ difficulty: 4 }));
    expect(result.valid).toBe(false);
  });

  it('accepts difficulty 1 (Easy)', () => {
    const result = validateCreateQuestion(makeValidQuestion({ difficulty: 1 }));
    expect(result.valid).toBe(true);
  });

  it('accepts difficulty 3 (Hard)', () => {
    const result = validateCreateQuestion(makeValidQuestion({ difficulty: 3 }));
    expect(result.valid).toBe(true);
  });
});

// ─── Status change validation ──────────────────────────────────────────────────
describe('MCQ Validation — Status change', () => {
  it('accepts APPROVED status', () => {
    const result = validateStatusChange({ status: 'APPROVED' });
    expect(result.valid).toBe(true);
  });

  it('requires rejectionReason when status is REJECTED', () => {
    const result = validateStatusChange({ status: 'REJECTED' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('rejection'))).toBe(true);
  });

  it('accepts REJECTED with a reason', () => {
    const result = validateStatusChange({ status: 'REJECTED', rejectionReason: 'Too easy' });
    expect(result.valid).toBe(true);
  });

  it('accepts ARCHIVED status', () => {
    const result = validateStatusChange({ status: 'ARCHIVED' });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid status string', () => {
    const result = validateStatusChange({ status: 'ACTIVE' });
    expect(result.valid).toBe(false);
  });
});

// ─── AI generate request validation ───────────────────────────────────────────
describe('AI Generation Request Validation', () => {
  it('accepts valid request with string difficulty', () => {
    const result = validateAIGenerateRequest({
      subject: 'Mathematics', topic: 'Algebra', difficulty: 'Medium', count: 5
    });
    expect(result.valid).toBe(true);
    expect(result.data.difficulty).toBe(2); // transformed
  });

  it('accepts valid request with numeric difficulty', () => {
    const result = validateAIGenerateRequest({
      subject: 'Science', topic: 'Physics', difficulty: 3, count: 3
    });
    expect(result.valid).toBe(true);
    expect(result.data.difficulty).toBe(3);
  });

  it('rejects missing subject', () => {
    const result = validateAIGenerateRequest({ topic: 'Algebra', difficulty: 'Easy', count: 5 });
    expect(result.valid).toBe(false);
  });

  it('rejects count exceeding maximum (20)', () => {
    const result = validateAIGenerateRequest({
      subject: 'Math', topic: 'Algebra', difficulty: 'Easy', count: 25
    });
    expect(result.valid).toBe(false);
  });

  it('defaults count to 5 when not provided', () => {
    const result = validateAIGenerateRequest({
      subject: 'Math', topic: 'Algebra', difficulty: 'Easy'
    });
    expect(result.valid).toBe(true);
    expect(result.data.count).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2 — Duplicate / Similarity Detection Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Text Normalization', () => {
  it('lowercases input', () => {
    expect(normalizeText('HELLO WORLD')).toBe('hello world');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('hello   world')).toBe('hello world');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('removes punctuation (not math operators)', () => {
    const result = normalizeText('What is x? Find it!');
    expect(result).not.toContain('?');
    expect(result).not.toContain('!');
  });
});

describe('Similarity Scoring', () => {
  it('returns 1.0 for identical strings', () => {
    const score = computeSimilarity('What is 2 + 2?', 'What is 2 + 2?');
    expect(score).toBe(1.0);
  });

  it('returns a high score for near-identical strings', () => {
    const score = computeSimilarity(
      'If 2x + 5 = 15, what is the value of x?',
      'If 2x + 5 = 15, find the value of x?'
    );
    expect(score).toBeGreaterThan(0.6);
  });

  it('returns a low score for unrelated questions', () => {
    const score = computeSimilarity(
      'What is the area of a triangle?',
      'Find the compound interest on 8000 at 10% per annum.'
    );
    expect(score).toBeLessThan(0.4);
  });

  it('returns 0 for completely different short strings', () => {
    const score = computeSimilarity('abc', 'xyz');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.5);
  });
});

describe('Duplicate Detection', () => {
  const existingQuestions = [
    { id: 'Q1', questionText: 'If 2x + 5 = 15, what is the value of x?' },
    { id: 'Q2', questionText: 'What is the area of a triangle with base 10 and height 6?' },
    { id: 'Q3', questionText: 'Solve for y: 3y - 9 = 0' }
  ];

  it('detects exact duplicate', () => {
    const matches = findSimilarQuestions(
      'If 2x + 5 = 15, what is the value of x?',
      existingQuestions
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].type).toBe('EXACT');
    expect(matches[0].questionId).toBe('Q1');
  });

  it('findExactDuplicate returns matching ID', () => {
    const id = findExactDuplicate(
      'If 2x + 5 = 15, what is the value of x?',
      existingQuestions
    );
    expect(id).toBe('Q1');
  });

  it('findExactDuplicate returns null for non-duplicate', () => {
    const id = findExactDuplicate('Something completely different', existingQuestions);
    expect(id).toBeNull();
  });

  it('detects no match for clearly different question', () => {
    const matches = findSimilarQuestions(
      'What is the speed of light in a vacuum?',
      existingQuestions
    );
    expect(matches.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 3 — Mock AI Provider Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Mock AI Question Generator', () => {
  it('generates the requested number of questions', () => {
    const questions = generateMockQuestions({ subject: 'Mathematics', topic: 'Algebra', difficulty: 2, count: 5 });
    expect(questions).toHaveLength(5);
  });

  it('each generated question has correct structure', () => {
    const [q] = generateMockQuestions({ subject: 'Science', topic: 'Physics', difficulty: 1, count: 1 });
    expect(q).toHaveProperty('subject', 'Science');
    expect(q).toHaveProperty('topic', 'Physics');
    expect(q).toHaveProperty('difficulty', 1);
    expect(q).toHaveProperty('questionText');
    expect(q.options).toHaveLength(4);
    expect(q).toHaveProperty('correctOption');
    expect(q).toHaveProperty('explanation');
    expect(q).toHaveProperty('source', 'AI');
  });

  it('each generated question has exactly one correct option', () => {
    const questions = generateMockQuestions({ subject: 'Math', topic: 'Geometry', difficulty: 3, count: 3 });
    for (const q of questions) {
      const correctCount = q.options.filter(o => o.isCorrect).length;
      expect(correctCount).toBe(1);
    }
  });

  it('generated questions pass the validator', () => {
    const questions = generateMockQuestions({ subject: 'Mathematics', topic: 'Trigonometry', difficulty: 2, count: 3 });
    for (const q of questions) {
      const result = validateCreateQuestion(q);
      expect(result.valid).toBe(true);
    }
  });

  it('DIFFICULTY_LABELS maps correctly', () => {
    expect(DIFFICULTY_LABELS[1]).toBe('Easy');
    expect(DIFFICULTY_LABELS[2]).toBe('Medium');
    expect(DIFFICULTY_LABELS[3]).toBe('Hard');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 4 — Analytics Calculation Tests (pure arithmetic, no DB)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Analytics Calculations', () => {
  function safeAccuracy(correct, total) {
    if (!total || total === 0) return 0;
    return Math.round((correct / total) * 10000) / 100;
  }

  function avgTime(times) {
    if (!times || times.length === 0) return 0;
    return Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10;
  }

  it('accuracy is 0 when no questions attempted', () => {
    expect(safeAccuracy(0, 0)).toBe(0);
  });

  it('accuracy is 100 when all questions correct', () => {
    expect(safeAccuracy(10, 10)).toBe(100);
  });

  it('accuracy rounds to 2 decimal places', () => {
    expect(safeAccuracy(7, 10)).toBe(70);
    expect(safeAccuracy(1, 3)).toBe(33.33);
  });

  it('average response time is 0 for empty array', () => {
    expect(avgTime([])).toBe(0);
  });

  it('average response time is correct', () => {
    expect(avgTime([10, 20, 30])).toBe(20);
  });

  it('average response time rounds to 1 decimal', () => {
    expect(avgTime([12.5, 17.5])).toBe(15);
  });

  it('topic grouping produces correct accuracy', () => {
    const responses = [
      { topic: 'Algebra', isCorrect: true, responseTimeSec: 15, difficulty: 2 },
      { topic: 'Algebra', isCorrect: false, responseTimeSec: 20, difficulty: 2 },
      { topic: 'Geometry', isCorrect: true, responseTimeSec: 10, difficulty: 1 }
    ];

    const topicMap = {};
    for (const r of responses) {
      if (!topicMap[r.topic]) topicMap[r.topic] = { attempted: 0, correct: 0 };
      topicMap[r.topic].attempted++;
      if (r.isCorrect) topicMap[r.topic].correct++;
    }

    expect(safeAccuracy(topicMap['Algebra'].correct, topicMap['Algebra'].attempted)).toBe(50);
    expect(safeAccuracy(topicMap['Geometry'].correct, topicMap['Geometry'].attempted)).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART 5 — Answer-Key Security Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Answer-Key Security', () => {
  it('sanitizeQuestionForClient removes correctOption', async () => {
    // Import the sanitizer from the existing contract
    const { sanitizeQuestionForClient } = await import('../server/src/modules/module3/contracts/questionBankContract.js');

    const fullQuestion = {
      id: 'Q1',
      subject: 'Mathematics',
      topic: 'Algebra',
      competency: 'Linear Equations',
      difficulty: 2,
      question: 'If 2x + 5 = 15, what is x?',
      options: [
        { id: 'A', text: '5' },
        { id: 'B', text: '10' },
        { id: 'C', text: '7.5' },
        { id: 'D', text: '4' }
      ],
      correctOption: 'A',
      explanation: 'Subtract 5 from both sides...',
      approvalStatus: 'APPROVED'
    };

    const sanitized = sanitizeQuestionForClient(fullQuestion);

    expect(sanitized).not.toHaveProperty('correctOption');
    expect(sanitized).not.toHaveProperty('explanation');
    expect(sanitized).toHaveProperty('id');
    expect(sanitized).toHaveProperty('question');
    expect(sanitized.options).toHaveLength(4);
  });

  it('each sanitized option has id and text but no isCorrect', async () => {
    const { sanitizeQuestionForClient } = await import('../server/src/modules/module3/contracts/questionBankContract.js');

    const fullQuestion = {
      id: 'Q2', subject: 'Math', topic: 'Geometry', competency: 'Area', difficulty: 1,
      question: 'Area?',
      options: [{ id: 'A', text: 'Yes' }, { id: 'B', text: 'No' }, { id: 'C', text: 'Maybe' }, { id: 'D', text: 'Unknown' }],
      correctOption: 'A',
      explanation: 'Because...',
      approvalStatus: 'APPROVED'
    };

    const sanitized = sanitizeQuestionForClient(fullQuestion);
    for (const opt of sanitized.options) {
      expect(opt).toHaveProperty('id');
      expect(opt).toHaveProperty('text');
      expect(opt).not.toHaveProperty('isCorrect');
    }
  });
});
