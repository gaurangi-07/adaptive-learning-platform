/**
 * @file M3Layout.jsx
 * @description Shared sidebar + header layout for all Module 3 pages.
 * Uses the existing project design system (Tailwind, indigo brand).
 */

import { NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/module3',           label: 'Dashboard',           icon: '🏠' },
  { path: '/module3/generate',  label: 'AI Question Generator', icon: '🤖' },
  { path: '/module3/questions', label: 'Question Bank',         icon: '📚' },
  { path: '/module3/pending',   label: 'Pending Reviews',       icon: '📋' },
  { path: '/module3/analytics', label: 'Student Analytics',     icon: '📊' },
  { path: '/module3/reports',   label: 'Performance Reports',   icon: '📈' }
];

export default function M3Layout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎓</span>
            <span className="font-black text-slate-900 text-lg">PARAKH</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Module 3 — AI & Analytics</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/module3'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer links */}
        <div className="p-4 border-t border-slate-100 space-y-1">
          <NavLink
            to="/assessment"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 transition-all font-medium"
          >
            <span>⚡</span> Adaptive Assessment
          </NavLink>
          <NavLink
            to="/module1/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 transition-all font-medium"
          >
            <span>⟵</span> Student Dashboard
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page header */}
        {(title || subtitle) && (
          <header className="bg-white border-b border-slate-200 px-8 py-5">
            {title && <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </header>
        )}

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
