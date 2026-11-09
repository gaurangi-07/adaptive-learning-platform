/**
 * @file StatusBadge.jsx
 * @description Displays question approval status with color-coded badge.
 */

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300',  dot: 'bg-amber-500'  },
  APPROVED: { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300',   dot: 'bg-rose-500'   },
  ARCHIVED: { label: 'Archived', bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-300',  dot: 'bg-slate-400'  }
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const textSize = size === 'xs' ? 'text-xs' : 'text-xs';
  const padding = size === 'xs' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 ${padding} rounded-full border font-semibold
      ${textSize} ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
