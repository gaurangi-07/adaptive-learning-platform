/**
 * @file ErrorAlert.jsx
 */

export default function ErrorAlert({ message, onRetry, onDismiss }) {
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-rose-200 bg-rose-50 p-5 flex gap-4 items-start"
    >
      <span className="text-2xl flex-shrink-0" aria-hidden="true">⚠️</span>
      <div className="flex-1">
        <p className="font-semibold text-rose-800 mb-1">Something went wrong</p>
        <p className="text-sm text-rose-700 mb-3">{message}</p>
        <div className="flex gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-primary text-sm px-4 py-2">
              Try Again
            </button>
          )}
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="btn-secondary text-sm px-4 py-2">
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

