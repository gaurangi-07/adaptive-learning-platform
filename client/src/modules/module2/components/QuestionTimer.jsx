/**
 * @file QuestionTimer.jsx
 * @description Displays remaining time with animated progress ring and color warnings.
 */

import { formatTime, getTimerColor, getTimerBarColor } from '../utils/difficultyUtils';

export default function QuestionTimer({ timeLeft, percentLeft, allocatedSeconds }) {
  const timerColor = getTimerColor(percentLeft);
  const barColor = getTimerBarColor(percentLeft);
  const isUrgent = percentLeft <= 25;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-colors duration-300 ${
      isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
    }`}>
      {/* SVG Ring */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
          <circle
            cx="18" cy="18" r="15.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-slate-200"
          />
          <circle
            cx="18" cy="18" r="15.9"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${percentLeft} ${100 - percentLeft}`}
            strokeLinecap="round"
            className={`transition-all duration-1000 ${
              isUrgent ? 'text-rose-500' : percentLeft <= 50 ? 'text-amber-400' : 'text-emerald-500'
            }`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${timerColor} ${
          isUrgent ? 'animate-pulse' : ''
        }`}>
          {timeLeft}
        </span>
      </div>

      {/* Bar + Label */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium mb-1">
          {isUrgent ? '⏰ Hurry up!' : 'Time remaining'}
        </p>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
            style={{ width: `${percentLeft}%` }}
          />
        </div>
      </div>

      <span className={`text-sm font-mono font-bold ${timerColor} flex-shrink-0`}>
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}

