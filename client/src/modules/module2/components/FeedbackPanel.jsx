/**
 * @file FeedbackPanel.jsx
 * @description Post-answer feedback panel showing correctness, explanation, and difficulty change.
 */

import { getDifficultyConfig } from '../utils/difficultyUtils';

export default function FeedbackPanel({ feedback, onNext, isLastQuestion }) {
  if (!feedback) return null;

  const { isCorrect, isTimedOut, explanation, difficultyChange, responseTimeSec } = feedback;

  const diffPrev = difficultyChange?.previous;
  const diffNew = difficultyChange?.new;
  const diffChanged = diffPrev !== diffNew;
  const diffIncreased = diffNew > diffPrev;
  const newDiffConfig = getDifficultyConfig(diffNew);

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all duration-300 ${
      isTimedOut
        ? 'bg-amber-50 border-amber-300'
        : isCorrect
          ? 'bg-emerald-50 border-emerald-300'
          : 'bg-rose-50 border-rose-300'
    }`}>
      {/* Result header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
          isTimedOut ? 'bg-amber-200' : isCorrect ? 'bg-emerald-200' : 'bg-rose-200'
        }`}>
          {isTimedOut ? '⏰' : isCorrect ? '✓' : '✗'}
        </div>
        <div>
          <p className={`font-bold text-base ${
            isTimedOut ? 'text-amber-800' : isCorrect ? 'text-emerald-800' : 'text-rose-800'
          }`}>
            {isTimedOut ? "Time's Up!" : isCorrect ? 'Correct!' : 'Incorrect'}
          </p>
          {responseTimeSec !== undefined && (
            <p className="text-xs text-slate-500 mt-0.5">
              Response time: <span className="font-medium">{responseTimeSec}s</span>
            </p>
          )}
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="bg-white/70 rounded-xl p-4 mb-4 border border-white">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Explanation</p>
          <p className="text-sm text-slate-700 leading-relaxed">{explanation}</p>
        </div>
      )}

      {/* Difficulty change */}
      {difficultyChange && diffChanged && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4 ${newDiffConfig.bgColor} ${newDiffConfig.borderColor} border`}>
          <span>{diffIncreased ? '📈' : '📉'}</span>
          <span className={`font-medium ${newDiffConfig.textColor}`}>
            Difficulty {diffIncreased ? 'increased' : 'decreased'} to{' '}
            <strong>{newDiffConfig.label}</strong>
          </span>
          {difficultyChange.reason && (
            <span className="text-xs text-slate-400 ml-auto">({difficultyChange.reason.replace(/_/g, ' ')})</span>
          )}
        </div>
      )}
      {difficultyChange && !diffChanged && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4 bg-slate-50 border border-slate-200 text-slate-600">
          <span>➡️</span>
          <span>Difficulty remains at <strong>{getDifficultyConfig(diffNew).label}</strong></span>
        </div>
      )}

      {/* Next button */}
      <button
        type="button"
        onClick={onNext}
        className="btn-primary w-full"
      >
        {isLastQuestion ? 'View Results' : 'Next Question →'}
      </button>
    </div>
  );
}

