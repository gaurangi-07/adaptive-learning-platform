/**
 * @file difficultyUtils.js
 * @description Utility helpers for difficulty display, colors, and labels.
 */

export const DIFFICULTY_CONFIG = {
  1: {
    label: 'Easy',
    shortLabel: 'E',
    color: 'emerald',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    barColor: 'bg-emerald-400',
    icon: '●'
  },
  2: {
    label: 'Medium',
    shortLabel: 'M',
    color: 'amber',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    barColor: 'bg-amber-400',
    icon: '●●'
  },
  3: {
    label: 'Hard',
    shortLabel: 'H',
    color: 'rose',
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    barColor: 'bg-rose-400',
    icon: '●●●'
  }
};

export function getDifficultyConfig(level) {
  return DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG[2];
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

export function getTimerColor(percentLeft) {
  if (percentLeft > 50) return 'text-emerald-600';
  if (percentLeft > 25) return 'text-amber-500';
  return 'text-rose-600';
}

export function getTimerBarColor(percentLeft) {
  if (percentLeft > 50) return 'bg-emerald-400';
  if (percentLeft > 25) return 'bg-amber-400';
  return 'bg-rose-500';
}

export function getMasteryConfig(status) {
  const configs = {
    MASTERED: { label: 'Mastered', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', icon: '🏆' },
    PROFICIENT: { label: 'Proficient', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: '✅' },
    DEVELOPING: { label: 'Developing', textColor: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', icon: '📈' },
    CRITICAL_ATTENTION: { label: 'Needs Focus', textColor: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', icon: '⚠️' }
  };
  return configs[status] || configs.DEVELOPING;
}

