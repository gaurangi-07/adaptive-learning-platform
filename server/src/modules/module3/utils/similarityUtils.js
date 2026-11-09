/**
 * @file similarityUtils.js
 * @description Text similarity utilities for duplicate question detection.
 *
 * Uses a hybrid approach:
 *   - Character n-grams (bigrams/trigrams) for spelling/phrasing variations
 *   - Word token Jaccard for vocabulary overlap
 * Combined, this yields robust similarity for natural language educational questions.
 */

/**
 * Normalize text for comparison.
 * Lowercases, removes punctuation (except math operators), collapses whitespace.
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s+\-*/=<>()^]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate word tokens from normalized text.
 * @param {string} text
 * @returns {Set<string>}
 */
function getWordTokens(text) {
  const words = normalizeText(text).split(' ').filter(Boolean);
  return new Set(words);
}

/**
 * Generate character n-grams from a string.
 * @param {string} text
 * @param {number} n
 * @returns {Set<string>}
 */
function getNgrams(text, n = 3) {
  const ngrams = new Set();
  const padded = ` ${text} `;
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Calculate Jaccard similarity between two sets.
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number} - 0.0 to 1.0
 */
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Compute similarity score between two question texts.
 * Uses 50% word-level Jaccard + 50% character-ngrams Jaccard.
 * @param {string} textA
 * @param {string} textB
 * @returns {number} - 0.0 to 1.0
 */
function computeSimilarity(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  // Exact match check
  if (normA === normB) return 1.0;

  // Word token similarity
  const wordsA = getWordTokens(normA);
  const wordsB = getWordTokens(normB);
  const wordSim = jaccardSimilarity(wordsA, wordsB);

  // Character bigram similarity (more sensitive to word root matches than trigrams)
  const ngramsA = getNgrams(normA, 2);
  const ngramsB = getNgrams(normB, 2);
  const charSim = jaccardSimilarity(ngramsA, ngramsB);

  // Hybrid score: 60% words, 40% chars
  return Math.round((wordSim * 0.6 + charSim * 0.4) * 100) / 100;
}

const EXACT_THRESHOLD = 0.98;
const HIGH_SIMILARITY_THRESHOLD = 0.55;

/**
 * Find similar questions from a list of existing questions.
 *
 * @param {string} newQuestionText
 * @param {Array<{ id: string, questionText: string }>} existingQuestions
 * @param {object} [options]
 * @returns {Array<{ questionId: string, score: number, type: 'EXACT' | 'SIMILAR' }>}
 */
function findSimilarQuestions(newQuestionText, existingQuestions, options = {}) {
  const {
    exactThreshold = EXACT_THRESHOLD,
    similarThreshold = HIGH_SIMILARITY_THRESHOLD
  } = options;

  const matches = [];

  for (const q of existingQuestions) {
    const score = computeSimilarity(newQuestionText, q.questionText);

    if (score >= exactThreshold) {
      matches.push({ questionId: q.id, score, type: 'EXACT' });
    } else if (score >= similarThreshold) {
      matches.push({ questionId: q.id, score, type: 'SIMILAR' });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Quick check for exact duplicate.
 * @param {string} newText
 * @param {Array<{ id: string, questionText: string }>} existingQuestions
 * @returns {string | null}
 */
function findExactDuplicate(newText, existingQuestions) {
  const normNew = normalizeText(newText);
  for (const q of existingQuestions) {
    if (normalizeText(q.questionText) === normNew) return q.id;
  }
  return null;
}

module.exports = {
  normalizeText,
  getWordTokens,
  getNgrams,
  jaccardSimilarity,
  computeSimilarity,
  findSimilarQuestions,
  findExactDuplicate,
  EXACT_THRESHOLD,
  HIGH_SIMILARITY_THRESHOLD
};
