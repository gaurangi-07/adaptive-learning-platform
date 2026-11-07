/**
 * @file adaptiveAlgorithm.js
 * @description Core Adaptive Question-Selection Algorithm for Module 2.
 *
 * Algorithm Strategy:
 * - Simple, reliable ability-based difficulty adaptation per topic.
 * - 3 difficulty levels: 1 (Easy), 2 (Medium), 3 (Hard).
 * - Starting difficulty derived from Module 1 baseline assessment.
 *
 * Difficulty Adjustment Rules:
 * 1. Three consecutive correct answers in a topic → increase difficulty by 1.
 * 2. Two incorrect answers in the last three attempts in a topic → decrease difficulty by 1.
 * 3. Otherwise → maintain current difficulty.
 * - Min difficulty: 1, Max difficulty: 3.
 *
 * Topic Selection Strategy:
 * - Prioritize weakest topics (lowest proficiency) while maintaining coverage.
 * - Avoid repeated questions.
 *
 * This module is intentionally kept modular so advanced models
 * (e.g., Item Response Theory, Bayesian Knowledge Tracing) can replace it later.
 */

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 3;
const CONSECUTIVE_CORRECT_FOR_UPGRADE = 3;
const INCORRECT_WINDOW = 3;
const INCORRECT_THRESHOLD_FOR_DOWNGRADE = 2;

/**
 * Determine the initial difficulty for a topic based on the baseline score from Module 1.
 * @param {number} baselineScore - Topic score from 0 to 100
 * @returns {number} 1, 2, or 3
 */
function computeInitialDifficulty(baselineScore) {
  if (baselineScore >= 70) return 3; // Strong → start Hard
  if (baselineScore >= 40) return 2; // Average → start Medium
  return 1;                          // Weak → start Easy
}

/**
 * Decide the next difficulty level for a topic based on the updated response history.
 *
 * @param {object} params
 * @param {number} params.currentDifficulty - Current difficulty (1, 2, or 3)
 * @param {number} params.consecutiveCorrect - Count of consecutive correct answers in the topic
 * @param {boolean[]} params.recentOutcomes - Array of recent true/false outcomes (most recent last)
 * @returns {{ newDifficulty: number, reason: string, details: string }}
 */
function computeNextDifficulty({ currentDifficulty, consecutiveCorrect, recentOutcomes }) {
  // Rule 1: Three consecutive correct → upgrade
  if (consecutiveCorrect >= CONSECUTIVE_CORRECT_FOR_UPGRADE) {
    const newDifficulty = Math.min(currentDifficulty + 1, MAX_DIFFICULTY);
    if (newDifficulty !== currentDifficulty) {
      return {
        newDifficulty,
        reason: '3_CONSECUTIVE_CORRECT',
        details: `Student answered ${consecutiveCorrect} consecutive questions correctly in this topic. Difficulty increased from ${currentDifficulty} to ${newDifficulty}.`
      };
    }
    return {
      newDifficulty: currentDifficulty,
      reason: 'MAX_DIFFICULTY_REACHED',
      details: `Student answered ${consecutiveCorrect} consecutive questions correctly but is already at maximum difficulty (${MAX_DIFFICULTY}).`
    };
  }

  // Rule 2: Two incorrect in the last 3 attempts → downgrade
  const windowSlice = recentOutcomes.slice(-INCORRECT_WINDOW);
  if (windowSlice.length >= 2) {
    const incorrectCount = windowSlice.filter(outcome => outcome === false).length;
    if (incorrectCount >= INCORRECT_THRESHOLD_FOR_DOWNGRADE) {
      const newDifficulty = Math.max(currentDifficulty - 1, MIN_DIFFICULTY);
      if (newDifficulty !== currentDifficulty) {
        return {
          newDifficulty,
          reason: '2_INCORRECT_IN_LAST_3',
          details: `Student answered ${incorrectCount} out of last ${windowSlice.length} questions incorrectly in this topic. Difficulty decreased from ${currentDifficulty} to ${newDifficulty}.`
        };
      }
      return {
        newDifficulty: currentDifficulty,
        reason: 'MIN_DIFFICULTY_REACHED',
        details: `Student struggled (${incorrectCount} incorrect in last ${windowSlice.length}) but is already at minimum difficulty (${MIN_DIFFICULTY}).`
      };
    }
  }

  // Rule 3: Maintain
  return {
    newDifficulty: currentDifficulty,
    reason: 'MAINTAINED',
    details: `No difficulty change triggered. Consecutive correct: ${consecutiveCorrect}, recent window: [${windowSlice.map(o => o ? '✓' : '✗').join(', ')}].`
  };
}

/**
 * Select the next topic for the student, prioritizing weak areas while ensuring coverage.
 *
 * Strategy:
 * 1. Sort topics by currentProficiency ascending (weakest first).
 * 2. Among equally weak topics, prefer the one with fewer questions attempted.
 * 3. Check that at least one question is available for the selected topic and difficulty.
 *
 * @param {Array<object>} topicProficiencies - Array of TopicProficiency records
 * @param {Function} hasAvailableQuestions - (topic, difficulty, excludeIds) => boolean
 * @param {string[]} usedQuestionIds - Question IDs already used in this session
 * @returns {{ topic: string, difficulty: number } | null}
 */
function selectNextTopic(topicProficiencies, hasAvailableQuestions, usedQuestionIds = []) {
  // Sort: weakest proficiency first, then fewest attempts
  const sorted = [...topicProficiencies].sort((a, b) => {
    if (a.currentProficiency !== b.currentProficiency) {
      return a.currentProficiency - b.currentProficiency;
    }
    return a.questionsAttempted - b.questionsAttempted;
  });

  for (const tp of sorted) {
    const targetDifficulty = tp.currentDifficulty;

    // Try exact difficulty
    if (hasAvailableQuestions(tp.topic, targetDifficulty, usedQuestionIds)) {
      return { topic: tp.topic, difficulty: targetDifficulty };
    }

    // Try nearest available difficulty (prefer easier first for fallback)
    const nearestCandidates = [targetDifficulty - 1, targetDifficulty + 1]
      .filter(d => d >= MIN_DIFFICULTY && d <= MAX_DIFFICULTY);

    for (const fallbackDiff of nearestCandidates) {
      if (hasAvailableQuestions(tp.topic, fallbackDiff, usedQuestionIds)) {
        return { topic: tp.topic, difficulty: fallbackDiff };
      }
    }
  }

  // No questions available in any topic at any difficulty
  return null;
}

/**
 * Select a specific question from the pool for a given topic and difficulty.
 *
 * @param {Array<object>} availableQuestions - Filtered question pool
 * @returns {object|null}
 */
function selectQuestion(availableQuestions) {
  if (!availableQuestions || availableQuestions.length === 0) return null;
  // Random selection from available pool to avoid predictability
  const index = Math.floor(Math.random() * availableQuestions.length);
  return availableQuestions[index];
}

/**
 * Update topic proficiency after an answer.
 *
 * @param {object} proficiency - Current TopicProficiency state
 * @param {boolean} isCorrect
 * @returns {object} Updated proficiency fields
 */
function updateProficiency(proficiency, isCorrect) {
  const recentOutcomes = JSON.parse(proficiency.recentOutcomes || '[]');
  recentOutcomes.push(isCorrect);

  const newConsecutiveCorrect = isCorrect ? proficiency.consecutiveCorrect + 1 : 0;
  const newQuestionsAttempted = proficiency.questionsAttempted + 1;
  const newQuestionsCorrect = proficiency.questionsCorrect + (isCorrect ? 1 : 0);

  // Recalculate proficiency as weighted moving average
  const baseWeight = 0.7;
  const newWeight = 0.3;
  const answerScore = isCorrect ? 100 : 0;
  const newProficiency = Math.round(
    (proficiency.currentProficiency * baseWeight + answerScore * newWeight) * 100
  ) / 100;

  // Compute next difficulty
  const { newDifficulty, reason, details } = computeNextDifficulty({
    currentDifficulty: proficiency.currentDifficulty,
    consecutiveCorrect: newConsecutiveCorrect,
    recentOutcomes
  });

  // Reset consecutive correct if difficulty changed upward
  const finalConsecutiveCorrect = (newDifficulty > proficiency.currentDifficulty) ? 0 : newConsecutiveCorrect;

  return {
    currentProficiency: Math.max(0, Math.min(100, newProficiency)),
    questionsAttempted: newQuestionsAttempted,
    questionsCorrect: newQuestionsCorrect,
    consecutiveCorrect: finalConsecutiveCorrect,
    currentDifficulty: newDifficulty,
    recentOutcomes: JSON.stringify(recentOutcomes),
    difficultyDecision: { previousDifficulty: proficiency.currentDifficulty, newDifficulty, reason, details }
  };
}

module.exports = {
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
  CONSECUTIVE_CORRECT_FOR_UPGRADE,
  INCORRECT_WINDOW,
  INCORRECT_THRESHOLD_FOR_DOWNGRADE,
  computeInitialDifficulty,
  computeNextDifficulty,
  selectNextTopic,
  selectQuestion,
  updateProficiency
};

