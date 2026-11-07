/**
 * @file MCQCard.jsx
 * @description The main MCQ question card: question text + four option buttons.
 * Handles selected/correct/incorrect visual states after submission.
 */

const OPTION_LABELS = { A: 'A', B: 'B', C: 'C', D: 'D' };

function getOptionState(optionId, selectedOption, correctOption, isAnswered) {
  if (!isAnswered) return 'default';
  if (optionId === correctOption) return 'correct';
  if (optionId === selectedOption && selectedOption !== correctOption) return 'incorrect';
  return 'dimmed';
}

const optionClasses = {
  default: 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm cursor-pointer active:scale-[0.99]',
  selected: 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300 cursor-pointer',
  correct: 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200',
  incorrect: 'bg-rose-50 border-rose-500 ring-2 ring-rose-200',
  dimmed: 'bg-slate-50 border-slate-200 opacity-60'
};

const labelClasses = {
  default: 'bg-slate-100 text-slate-600',
  selected: 'bg-indigo-500 text-white',
  correct: 'bg-emerald-500 text-white',
  incorrect: 'bg-rose-500 text-white',
  dimmed: 'bg-slate-200 text-slate-400'
};

export default function MCQCard({
  question,
  selectedOption,
  onSelectOption,
  isAnswered = false,
  correctOption = null,
  isTimedOut = false
}) {
  const { questionText, options = [] } = question || {};

  return (
    <div className="card">
      {/* Question text */}
      <div className="mb-6">
        <p className="text-slate-800 text-lg font-medium leading-relaxed">
          {questionText || 'Loading question…'}
        </p>
        {isTimedOut && (
          <p className="mt-2 text-rose-600 text-sm font-semibold flex items-center gap-1.5">
            <span>⏰</span> Time's up! The correct answer is highlighted below.
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3" role="radiogroup" aria-label="Answer options">
        {options.map((opt) => {
          const state = getOptionState(opt.id, selectedOption, correctOption, isAnswered || isTimedOut);
          const isCurrentlySelected = selectedOption === opt.id && !isAnswered;
          const finalState = isCurrentlySelected && !isAnswered ? 'selected' : state;

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selectedOption === opt.id}
              disabled={isAnswered || isTimedOut}
              onClick={() => !isAnswered && !isTimedOut && onSelectOption?.(opt.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left
                transition-all duration-150 ${optionClasses[finalState]}`}
            >
              {/* Option label circle */}
              <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                font-bold text-sm transition-colors ${labelClasses[finalState]}`}>
                {OPTION_LABELS[opt.id]}
              </span>
              {/* Option text */}
              <span className={`flex-1 text-sm font-medium leading-snug ${
                finalState === 'dimmed' ? 'text-slate-400' : 'text-slate-800'
              }`}>
                {opt.text}
              </span>
              {/* Result icon */}
              {(isAnswered || isTimedOut) && finalState === 'correct' && (
                <span className="flex-shrink-0 text-emerald-500 text-lg" aria-label="Correct">✓</span>
              )}
              {isAnswered && finalState === 'incorrect' && (
                <span className="flex-shrink-0 text-rose-500 text-lg" aria-label="Incorrect">✗</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

