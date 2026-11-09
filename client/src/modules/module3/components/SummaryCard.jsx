/**
 * @file SummaryCard.jsx
 * @description Stat summary card used across Module 3 analytics pages.
 */

export default function SummaryCard({ icon, label, value, subValue, color = 'indigo' }) {
  const colorMap = {
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  iconBg: 'bg-indigo-100'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   iconBg: 'bg-amber-100'   },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    iconBg: 'bg-rose-100'    },
    slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   iconBg: 'bg-slate-100'   }
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className={`card ${c.bg} border-0 flex items-center gap-4`}>
      <div className={`${c.iconBg} rounded-xl p-3 text-2xl`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-black ${c.text}`}>{value}</p>
        {subValue && <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}
