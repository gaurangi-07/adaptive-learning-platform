/**
 * @file aiService.js
 * @description AI Question Generation Service for Module 3.
 *
 * Supports two providers:
 *   - "mock"   — deterministic fake MCQs for local dev & testing
 *   - "openai" — real OpenAI Chat Completions API
 *   - "groq"   — Groq's OpenAI-compatible Chat Completions API
 *
 * Provider selection:  AI_PROVIDER=mock | openai | groq  (default: mock)
 * OpenAI key:          OPENAI_API_KEY=sk-...
 * OpenAI model:        OPENAI_MODEL=gpt-4o-mini  (default)
 *
 * IMPORTANT: Never expose OPENAI_API_KEY to the frontend.
 */

const { validateCreateQuestion } = require('../validators/questionValidator');

// ─── Difficulty label helpers ──────────────────────────────────────────────────
const DIFFICULTY_LABELS = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const DIFFICULTY_FROM_LABEL = { Easy: 1, Medium: 2, Hard: 3 };

function difficultyLabel(d) {
  return DIFFICULTY_LABELS[d] || 'Medium';
}

// ─── Mock Provider ─────────────────────────────────────────────────────────────

/**
 * Generate deterministic mock MCQs for development and testing.
 * Does NOT call any external API.
 */
function generateMockQuestions({ subject, topic, difficulty, count }) {
  const label = difficultyLabel(difficulty);
  const questions = [];

  for (let i = 1; i <= count; i++) {
    const q = {
      subject,
      topic,
      competency: `${topic} Core Concepts`,
      difficulty,
      questionText: `[Mock Q${i} — ${label}] In the topic of ${topic} (${subject}), which of the following statements is correct?`,
      options: [
        { optionLabel: 'A', optionText: `Option A — ${topic} answer ${i}`, isCorrect: true },
        { optionLabel: 'B', optionText: `Option B — Distractor for ${topic}`, isCorrect: false },
        { optionLabel: 'C', optionText: `Option C — Distractor for ${topic}`, isCorrect: false },
        { optionLabel: 'D', optionText: `Option D — Distractor for ${topic}`, isCorrect: false }
      ],
      correctOption: 'A',
      explanation: `This is the mock explanation for question ${i} about ${topic}. Option A is correct because it accurately describes the core concept.`,
      source: 'AI'
    };
    questions.push(q);
  }

  return questions;
}

// ─── OpenAI Provider ───────────────────────────────────────────────────────────

/**
 * Generate MCQs using the OpenAI Chat Completions API.
 * Returns parsed, validated question objects.
 */
async function generateOpenAIQuestions({ subject, topic, difficulty, count }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to your .env file or switch AI_PROVIDER=mock.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const label = difficultyLabel(difficulty);

  const systemPrompt = `You are an expert educational MCQ generator for ${subject}.
Generate high-quality, accurate multiple-choice questions for students.
Each question must have exactly 4 options (A, B, C, D) with exactly one correct answer.
Respond ONLY with valid JSON — no markdown, no code fences, no extra text.`;

  const userPrompt = `Generate ${count} ${label}-difficulty MCQ(s) on the topic "${topic}" in ${subject}.

Return a JSON array where each element has this exact structure:
{
  "questionText": "...",
  "options": [
    { "optionLabel": "A", "optionText": "...", "isCorrect": true|false },
    { "optionLabel": "B", "optionText": "...", "isCorrect": true|false },
    { "optionLabel": "C", "optionText": "...", "isCorrect": true|false },
    { "optionLabel": "D", "optionText": "...", "isCorrect": true|false }
  ],
  "correctOption": "A"|"B"|"C"|"D",
  "explanation": "...",
  "competency": "..."
}

Rules:
- Exactly one option has isCorrect: true
- The correctOption field must match the isCorrect option's label
- For ${label} difficulty: ${
    difficulty === 1
      ? 'straightforward, recall-based questions'
      : difficulty === 2
      ? 'application and understanding questions'
      : 'analysis, synthesis, or multi-step reasoning questions'
  }
- Do not repeat the same question
- Explanation must justify why the correct answer is right`;

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    },
    30000 // 30-second timeout
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response.');

  let parsed;
  try {
    const obj = JSON.parse(content);
    // Handle both { questions: [...] } and [ ... ]
    parsed = Array.isArray(obj)
      ? obj
      : obj.questions || obj.mcqs || (obj.questionText || obj.question ? [obj] : Object.values(obj)[0]);
    if (!Array.isArray(parsed)) throw new Error('Expected an array of questions.');
  } catch (err) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${err.message}`);
  }

  // Enrich with subject/topic/source
  return parsed.map((q) => ({
    subject,
    topic,
    competency: q.competency || `${topic} Concepts`,
    difficulty,
    questionText: q.questionText || q.question || '',
    options: (q.options || []).map((o) => ({
      optionLabel: o.optionLabel || o.id || o.label || '',
      optionText: o.optionText || o.text || '',
      isCorrect: Boolean(o.isCorrect)
    })),
    correctOption: q.correctOption || q.correct_option || '',
    explanation: q.explanation || '',
    source: 'AI'
  }));
}

async function generateGroqQuestions(params) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file or switch AI_PROVIDER=mock.');
  }

  const originalKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = apiKey;
  process.env.OPENAI_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  try {
    global.fetch = (url, options) => originalFetch(
      url.replace('https://api.openai.com/v1', 'https://api.groq.com/openai/v1'),
      options
    );
    return await generateOpenAIQuestions(params);
  } finally {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
    process.env.OPENAI_MODEL = originalModel;
  }
}

// ─── Timeout wrapper ───────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`OpenAI request timed out after ${timeoutMs / 1000}s.`);
    }
    throw err;
  }
}

// ─── Main exported service ─────────────────────────────────────────────────────

/**
 * Generate MCQs using the configured AI provider.
 *
 * @param {object} params
 * @param {string} params.subject
 * @param {string} params.topic
 * @param {number} params.difficulty - 1, 2, or 3
 * @param {number} params.count
 * @returns {Promise<{ questions: object[], invalidCount: number, errors: string[] }>}
 */
async function generateQuestions({ subject, topic, difficulty, count }) {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  let rawQuestions;
  if (provider === 'openai') {
    rawQuestions = await generateOpenAIQuestions({ subject, topic, difficulty, count });
  } else if (provider === 'groq') {
    rawQuestions = await generateGroqQuestions({ subject, topic, difficulty, count });
  } else {
    // Default: mock (safe for local dev + CI)
    rawQuestions = generateMockQuestions({ subject, topic, difficulty, count });
  }

  // Validate each generated question
  const validQuestions = [];
  const errors = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const result = validateCreateQuestion(rawQuestions[i]);
    if (result.valid) {
      validQuestions.push(result.data);
    } else {
      errors.push(`Question ${i + 1}: ${result.errors.join('; ')}`);
    }
  }

  return {
    questions: validQuestions,
    invalidCount: rawQuestions.length - validQuestions.length,
    errors,
    provider
  };
}

module.exports = {
  generateQuestions,
  generateMockQuestions,
  DIFFICULTY_LABELS,
  DIFFICULTY_FROM_LABEL
};
