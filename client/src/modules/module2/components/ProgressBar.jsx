/**
 * @file ProgressBar.jsx
 * @description Displays question progress and score statistics.
 */

export default function ProgressBar({ answered, total, score, accuracy }) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2 text-sm font-medium text-slate-600">
        <span>Progress</span>
        <span className="text-indigo-700 font-semibold">{answered} / {total} questions</span>
      </div>

      {/* Progress track */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% complete`}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-xl p-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Score</p>
          <p className="text-lg font-bold text-indigo-700">{score}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Accuracy</p>
          <p className="text-lg font-bold text-indigo-700">{accuracy}%</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Complete</p>
          <p className="text-lg font-bold text-indigo-700">{pct}%</p>
        </div>
      </div>
    </div>
  );
}

