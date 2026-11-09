/**
 * @file M3Spinner.jsx
 * @description Loading spinner for Module 3 pages.
 */

export default function M3Spinner({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
}
