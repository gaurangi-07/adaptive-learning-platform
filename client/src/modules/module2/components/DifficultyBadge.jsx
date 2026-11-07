/**
 * @file DifficultyBadge.jsx
 * @description Visual difficulty level indicator badge.
 */

import { getDifficultyConfig } from '../utils/difficultyUtils';

export default function DifficultyBadge({ difficulty, showIcon = true }) {
  const config = getDifficultyConfig(difficulty);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
        border ${config.badgeClass}`}
      aria-label={`Difficulty: ${config.label}`}
    >
      {showIcon && <span aria-hidden="true">{config.icon}</span>}
      {config.label}
    </span>
  );
}

