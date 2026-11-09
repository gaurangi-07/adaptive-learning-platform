/**
 * @file DifficultyBadge.jsx
 * @description Numeric/label difficulty badge for Module 3 (1=Easy, 2=Medium, 3=Hard).
 */

const DIFFICULTY_CONFIG = {
  1: { label: 'Easy',   bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  2: { label: 'Medium', bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200'   },
  3: { label: 'Hard',   bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-200'    }
};

export default function DifficultyBadge({ difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[2];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold
      ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}
