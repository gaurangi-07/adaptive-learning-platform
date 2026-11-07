# Adaptive Algorithm — Technical Documentation

## Overview

Module 2 implements a **simple, reliable ability-based difficulty adaptation algorithm**
operating across 3 difficulty levels and 5 Mathematics topics.

> This algorithm is intentionally straightforward and verifiable. It does **not** claim
> to implement full Item Response Theory (IRT) or machine-learning models.
> The module is designed so advanced ability estimation can be plugged in later.

---

## Difficulty Levels

| Level | Label  | Starting Condition |
|-------|--------|--------------------|
| 1     | Easy   | Baseline score < 40 |
| 2     | Medium | Baseline score 40–69 |
| 3     | Hard   | Baseline score ≥ 70 |

---

## Adjustment Rules (per Topic)

```
IF consecutiveCorrect >= 3  →  difficulty = min(current + 1, 3)   [UPGRADE]
ELSE IF incorrectCount(last 3) >= 2  →  difficulty = max(current - 1, 1)  [DOWNGRADE]
ELSE  →  no change  [MAINTAINED]
```

The rules are evaluated after **every answer submission** for the specific topic answered.

---

## Topic Selection Strategy

1. Sort topics by **currentProficiency ascending** (weakest topics first).
2. Among equally weak topics, prefer the one with **fewest questions attempted**.
3. Try to match the **exact current difficulty** for the selected topic.
4. If no questions available at exact difficulty → try **nearest difficulty** (prefer easier fallback).
5. If no questions available in any topic at any difficulty → **complete the assessment**.

---

## Proficiency Score Update

After each answer, topic proficiency is updated using a weighted moving average:
```
newProficiency = currentProficiency × 0.7 + answerScore × 0.3
```
where `answerScore = 100` (correct) or `0` (incorrect).

This keeps recent performance weighted without discarding long-term history.

---

## Difficulty Decision Tracking

Every difficulty decision (upgrade / downgrade / maintained / max reached / min reached)
is recorded in `DifficultyHistory` with:
- Previous difficulty
- New difficulty
- Reason code (e.g., `3_CONSECUTIVE_CORRECT`, `2_INCORRECT_IN_LAST_3`, `MAINTAINED`)
- Human-readable explanation

This provides a complete audit trail for teachers and Module 3 analytics.

---

## Response-Time Usage

Response time is recorded per question for **analytics purposes only**.
The algorithm does **not** penalize students for slower responses, as slower responses
do not necessarily indicate lower ability (some students take care with hard questions).

---

## Extending the Algorithm

The algorithm is in `server/src/modules/module2/algorithms/adaptiveAlgorithm.js`.

To plug in IRT or a trained ML model:
1. Replace `computeNextDifficulty()` with a model-based ability estimator.
2. Keep `selectNextTopic()` and `selectQuestion()` as they provide question routing.
3. The `updateProficiency()` function's proficiency score can be replaced with a theta estimate.

The service layer (`adaptiveService.js`) does not need to change.

