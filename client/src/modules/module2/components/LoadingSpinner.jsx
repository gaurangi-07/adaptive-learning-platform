/**
 * @file LoadingSpinner.jsx
 */

export default function LoadingSpinner({ message = 'Loading…', size = 'md' }) {
  const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" role="status" aria-live="polite">
      <div className={`${sizes[size]} rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin`} />
      {message && <p className="text-slate-500 text-sm font-medium">{message}</p>}
    </div>
  );
}

