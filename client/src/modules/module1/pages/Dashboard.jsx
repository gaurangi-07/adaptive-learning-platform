/**
 * @file Dashboard.jsx
 * @description Modern SaaS-Style Student Dashboard for PARAKH Adaptive Learning Platform.
 * Features collapsible sidebar navigation, personalized student profile card,
 * 4 statistics metric cards, real-data topic proficiency horizontal bar chart,
 * performance overview with strong/weak topics, active assessment resumption modal,
 * and assessment history table.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { fetchDashboard } from '../api/profileApi';
import { fetchActiveAssessment, fetchAssessmentHistory } from '../api/assessmentApi';
import { logout, getCurrentStudent } from '../api/authApi';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation tabs: 'overview' | 'assessment' | 'performance' | 'history' | 'profile' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data states
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedNotice, setCompletedNotice] = useState(Boolean(location.state?.assessmentCompleted));

  const localStudent = getCurrentStudent();

  // Initial dashboard and active assessment loading
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError('');
      try {
        const resp = await fetchDashboard();
        if (resp.success) {
          setData(resp.data);
          if (resp.data.activeAssessment) {
            setActiveAssessment(resp.data.activeAssessment);
            setShowResumeModal(true);
          }
        }

        // Fetch active assessment check
        try {
          const activeResp = await fetchActiveAssessment();
          if (activeResp.success && activeResp.hasActiveAssessment && activeResp.activeAssessment) {
            setActiveAssessment(activeResp.activeAssessment);
            setShowResumeModal(true);
          }
        } catch {
          // Fallback handled by dashboard payload
        }

        // Fetch assessment history
        try {
          const histResp = await fetchAssessmentHistory();
          if (histResp.success && Array.isArray(histResp.history)) {
            setHistory(histResp.history);
          }
        } catch {
          // Ignore
        }
      } catch (err) {
        if (localStudent) {
          setData({
            studentName: localStudent.fullName || 'Student',
            assessmentStatus: 'Ready for Assessment',
            baseline: null,
            statistics: {},
            recentActivity: {},
          });
        } else {
          setError('Session expired. Please log in again.');
          logout();
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const student = data?.student || localStudent || {};
  const studentName = student.fullName || data?.studentName || 'Student';
  const collegeName = student.college || 'Engineering College / University';
  const branchName = student.branch || 'Computer Science & Engineering';
  const yearOfStudy = student.yearOfStudy ? `Year ${student.yearOfStudy}` : 'Undergraduate';
  const assessmentStatus = data?.assessmentStatus || 'Not Started';
  const baseline = data?.baseline;

  // Extract topic proficiencies
  let rawProficiency = baseline?.topicProficiency || null;
  if (typeof rawProficiency === 'string') {
    try {
      rawProficiency = JSON.parse(rawProficiency);
    } catch {
      rawProficiency = null;
    }
  }

  const metadataKeys = new Set([
    'topicAccuracy',
    'topicScores',
    'strongTopics',
    'weakTopics',
    'unknownTopics',
    'baselineLevel',
    'evaluatedAt',
  ]);

  const topicEntries = rawProficiency
    ? Object.entries(rawProficiency).filter(([k]) => !metadataKeys.has(k))
    : [];

  const strongTopics = rawProficiency?.strongTopics || [];
  const weakTopics = rawProficiency?.weakTopics || [];
  const unknownTopics = rawProficiency?.unknownTopics || [];

  // Starting tier
  const baselineLevel = rawProficiency?.baselineLevel || (
    baseline?.overallAccuracy >= 70 ? 3 : baseline?.overallAccuracy < 40 ? 1 : 2
  );

  const tierBadge = baselineLevel === 3
    ? { label: 'Level 3 · Hard / Advanced', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
    : baselineLevel === 1
    ? { label: 'Level 1 · Easy / Novice', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
    : { label: 'Level 2 · Medium / Intermediate', bg: 'bg-amber-50 text-amber-700 border-amber-200' };

  // Calculate statistics card values
  const accuracyVal = baseline?.overallAccuracy !== undefined && baseline?.overallAccuracy !== null
    ? `${baseline.overallAccuracy.toFixed(1)}%`
    : '—';
  const proficiencyVal = baseline ? `${(baseline.overallAccuracy).toFixed(0)} / 100` : '—';
  const strongCount = strongTopics.length;
  const weakCount = weakTopics.length;
  const attemptedCount = baseline?.totalQuestions || 0;

  // Sidebar navigation links
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'assessment', label: 'Take Assessment', icon: '⚡' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'history', label: 'Assessment History', icon: '🕒' },
    { id: 'profile', label: 'My Profile', icon: '👤', path: '/module1/profile' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-800 antialiased font-sans">

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. COLLAPSIBLE LEFT SIDEBAR */}
      {/* ────────────────────────────────────────────────────────── */}
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 h-screen z-50 bg-[#0f172a] text-slate-300 flex flex-col justify-between transition-all duration-300 shadow-xl ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
            <Link to="/module1/dashboard" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                P
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <span className="font-black text-lg text-white tracking-wider">PARAKH</span>
                  <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                    Adaptive Platform
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse toggle (desktop) */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white items-center justify-center text-xs transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              if (item.path) {
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">{item.icon}</span>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="text-base">{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer / User Profile & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {!sidebarCollapsed ? (
            <div className="p-2.5 rounded-xl bg-slate-800/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-bold text-white truncate">{studentName}</p>
                <p className="text-[10px] text-slate-400 truncate">{branchName}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-xs">
                {studentName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-all"
            title={sidebarCollapsed ? 'Logout' : undefined}
          >
            <span className="text-sm">🚪</span>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. MAIN WORKSPACE / TOPBAR & CONTENT */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
            >
              ☰
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900 capitalize">
                {activeTab === 'overview' ? 'Student Learning Portal' : activeTab}
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Continuous assessment & knowledge proficiency diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Online Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Platform Online</span>
            </div>

            {/* Quick Assessment Action */}
            <Link
              to="/module1/pre-assessment"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all flex items-center gap-1.5"
            >
              <span>⚡ Diagnostic Test</span>
            </Link>

            {/* Profile Avatar Pill */}
            <Link
              to="/module1/profile"
              className="flex items-center gap-2 p-1 pl-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline max-w-[120px] truncate">
                {studentName}
              </span>
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {studentName.charAt(0).toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Assessment Completed Alert Banner */}
        {completedNotice && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎉</span>
              <span>
                <strong>Pre-Assessment Submitted!</strong> Your baseline scores, strong/weak topic classifications, and starting tier have been updated below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCompletedNotice(false)}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Main Body */}
        <main className="p-4 sm:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">

          {loading ? (
            /* Loading Skeleton */
            <div className="space-y-6 animate-pulse">
              <div className="h-36 bg-slate-200 rounded-3xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
                ))}
              </div>
              <div className="h-64 bg-slate-200 rounded-2xl" />
            </div>
          ) : activeTab === 'history' ? (
            /* ────────────────────────────────────────────────── */
            /* ASSESSMENT HISTORY TAB VIEW */
            /* ────────────────────────────────────────────────── */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Assessment History</h2>
                  <p className="text-xs text-slate-500">Record of your past pre-assessment and adaptive evaluations</p>
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-100"
                >
                  ← Back to Overview
                </button>
              </div>

              {history.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Assessment Type</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Score</th>
                          <th className="py-3 px-4">Accuracy</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">{h.type}</td>
                            <td className="py-3 px-4">{h.subject}</td>
                            <td className="py-3 px-4 text-slate-400">
                              {h.startedAt ? new Date(h.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">{h.score} / {h.totalQuestions}</td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-indigo-600">{h.accuracy}%</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                h.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {h.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <div className="text-4xl">📝</div>
                  <h3 className="text-base font-bold text-slate-800">No Assessment Records Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Take the 15-minute diagnostic pre-assessment to establish your baseline proficiency.
                  </p>
                  <Link
                    to="/module1/pre-assessment"
                    className="inline-block mt-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 hover:bg-indigo-500"
                  >
                    Start Pre-Assessment
                  </Link>
                </div>
              )}
            </div>
          ) : activeTab === 'settings' ? (
            /* ────────────────────────────────────────────────── */
            /* SETTINGS TAB VIEW */
            /* ────────────────────────────────────────────────── */
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Platform Settings</h2>
                  <p className="text-xs text-slate-500">Configure your assessment preferences and notifications</p>
                </div>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-100"
                >
                  ← Back to Overview
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800">Assessment Preferences</h3>
                <div className="space-y-3 text-xs">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-800">Sound Effects & Timers</span>
                      <p className="text-[11px] text-slate-400">Play subtle sound alerts at 5 minutes and 1 minute</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-800">Keyboard Shortcuts</span>
                      <p className="text-[11px] text-slate-400">Enable 1-4 for options, arrows for navigation, R for review</p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-500">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ────────────────────────────────────────────────── */
            /* DEFAULT OVERVIEW / PERFORMANCE VIEW */
            /* ────────────────────────────────────────────────── */
            <>
              {/* ────────────────────────────────────────────── */}
              {/* 2. PERSONALIZED WELCOME SECTION */}
              {/* ────────────────────────────────────────────── */}
              <section className="bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Profile Avatar with online badge */}
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-black/20">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#0f172a]" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-indigo-200 border border-white/15 uppercase tracking-wider">
                          Active Student
                        </span>
                        <span className="text-xs text-indigo-200/80">• {collegeName}</span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        Welcome back, {studentName}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300">
                        {branchName} • <span className="text-indigo-300 font-semibold">{yearOfStudy}</span>
                      </p>
                      <p className="text-xs text-indigo-200/90 italic pt-1">
                        "Every challenge mastered today builds your foundation for engineering excellence."
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
                    <Link
                      to="/module1/pre-assessment"
                      className="px-5 py-3 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs sm:text-sm shadow-lg shadow-black/20 transition-all text-center flex items-center gap-2"
                    >
                      <span>⚡ Take Diagnostic Pre-Assessment</span>
                      <span>→</span>
                    </Link>
                    <span className="text-[11px] text-slate-400">10 Questions · 15 Min</span>
                  </div>
                </div>
              </section>

              {/* ────────────────────────────────────────────── */}
              {/* 3. FOUR ATTRACTIVE STATISTICS CARDS */}
              {/* ────────────────────────────────────────────── */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Card 1: Baseline Accuracy */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Baseline Accuracy
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                      🎯
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">{accuracyVal}</span>
                    {baseline && (
                      <span className="text-xs text-slate-400 font-medium">
                        ({baseline.correctAnswers}/{baseline.totalQuestions})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {baseline ? 'Evaluated on initial pre-assessment' : 'Establish baseline via pre-test'}
                  </p>
                </div>

                {/* Card 2: Overall Proficiency */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Overall Proficiency
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-bold">
                      ⚡
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-indigo-600">{proficiencyVal}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Normalized competency index across subjects
                  </p>
                </div>

                {/* Card 3: Strong Topics */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Strong Topics
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                      💪
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                      {baseline ? strongCount : '0'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Topics</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    {strongCount > 0 ? `${strongTopics.slice(0, 2).join(', ')} (≥70%)` : 'Score ≥70% to classify as strong'}
                  </p>
                </div>

                {/* Card 4: Topics Needing Improvement */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Need Improvement
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                      🎯
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-amber-600">
                      {baseline ? weakCount : '0'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Topics</span>
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium">
                    {weakCount > 0 ? `${weakTopics.slice(0, 2).join(', ')} (<50%)` : 'No weak topics detected (<50%)'}
                  </p>
                </div>

              </section>

              {/* ────────────────────────────────────────────── */}
              {/* 4 & 5. TOPIC PROFICIENCY & PERFORMANCE OVERVIEW */}
              {/* ────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Topic Proficiency Section (Horizontal Bar Chart) */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Topic Proficiency Breakdown</h3>
                      <p className="text-xs text-slate-400">Real diagnostic scores across core syllabus competencies</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      Module 1
                    </span>
                  </div>

                  {topicEntries.length > 0 ? (
                    <div className="space-y-4 pt-1">
                      {topicEntries.map(([topic, score]) => {
                        const isUnknown = score === 'unknown' || score === null || score === undefined;
                        const numericScore = typeof score === 'number' ? score : parseFloat(score) || 0;
                        const percent = Math.round(numericScore * 100);

                        return (
                          <div key={topic} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800">{topic}</span>
                              {isUnknown ? (
                                <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                  Unknown / Unattempted
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-[11px]">Ability: {numericScore.toFixed(2)}</span>
                                  <span className={`font-bold ${
                                    percent >= 70 ? 'text-emerald-600' : percent < 50 ? 'text-amber-600' : 'text-indigo-600'
                                  }`}>
                                    {percent}%
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Horizontal Bar */}
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isUnknown
                                    ? 'bg-slate-300 w-0'
                                    : percent >= 70
                                    ? 'bg-emerald-500'
                                    : percent < 50
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-600'
                                }`}
                                style={{ width: isUnknown ? '0%' : `${Math.min(100, Math.max(5, percent))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Default display if student hasn't completed test yet */
                    <div className="py-8 text-center space-y-3">
                      <div className="text-3xl">📊</div>
                      <p className="text-sm font-semibold text-slate-700">No diagnostic assessment data yet</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Complete your 10-question pre-assessment to generate your subject-level topic breakdown.
                      </p>
                      <Link
                        to="/module1/pre-assessment"
                        className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                      >
                        Start Diagnostic Test Now
                      </Link>
                    </div>
                  )}
                </div>

                {/* Performance Overview & Tier Card */}
                <div className="space-y-6">

                  {/* Starting Difficulty Tier */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Initial Difficulty Tier
                    </span>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${tierBadge.bg}`}>
                          {tierBadge.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Calibrated starting difficulty for the Computer Adaptive Testing (CAT) engine. Shifts dynamically between Easy, Medium, and Hard based on your answers.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>Questions Attempted:</span>
                      <strong className="text-slate-900 font-mono">{attemptedCount} / 10</strong>
                    </div>
                  </div>

                  {/* Strong & Weak Summary Cards */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Competency Strengths & Gaps
                    </h4>

                    {/* Strong Topics */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-700">Strong Topics (≥70%)</span>
                      {strongTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {strongTopics.map((t) => (
                            <span key={t} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">None currently above 70%.</p>
                      )}
                    </div>

                    {/* Weak Topics */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-amber-700">Topics to Strengthen (&lt;50%)</span>
                      {weakTopics.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {weakTopics.map((t) => (
                            <span key={t} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              ! {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No topics below 50%.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* ────────────────────────────────────────────── */}
              {/* 6 & 7. ASSESSMENT CARD & RECENT ACTIVITY */}
              {/* ────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 6. Assessment Card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-md flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                        Pre-Assessment Status
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        assessmentStatus === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {assessmentStatus}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {assessmentStatus === 'Completed' ? 'Diagnostic Pre-Assessment Completed' : 'Start Your Diagnostic Pre-Assessment'}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      {assessmentStatus === 'Completed'
                        ? 'Your baseline knowledge profile is fully calibrated. You can view detailed breakdowns or proceed to the Computer Adaptive Testing (CAT) assessment.'
                        : 'Establish your initial knowledge baseline across 5 key topic areas before adaptive testing begins. 10 curated questions, 15 minutes.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span><strong>10</strong> Questions</span>
                      <span>•</span>
                      <span><strong>15</strong> Minutes Duration</span>
                      <span>•</span>
                      <span><strong>5</strong> Topics</span>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                      {assessmentStatus === 'Completed' ? (
                        <Link
                          to="/assessment"
                          className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md transition-all"
                        >
                          Launch Adaptive Assessment →
                        </Link>
                      ) : (
                        <Link
                          to="/module1/pre-assessment"
                          className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs shadow-md transition-all"
                        >
                          Start Assessment Now →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7. Recent Activity Card */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Recent Activity
                    </span>
                    <h4 className="text-base font-bold text-slate-900">Latest Assessment Record</h4>

                    <div className="space-y-3 pt-2 text-xs">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500">Last Date</span>
                        <strong className="text-slate-800">
                          {data?.recentActivity?.lastAssessmentDate
                            ? new Date(data.recentActivity.lastAssessmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'No attempts yet'}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500">Last Score</span>
                        <strong className="text-indigo-600 font-mono">
                          {data?.recentActivity?.lastAssessmentScore || '—'}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-500">Status</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          assessmentStatus === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {data?.recentActivity?.assessmentCompletionStatus || assessmentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('history')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
                  >
                    View All History →
                  </button>
                </div>

              </div>
            </>
          )}

        </main>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. RESUME ASSESSMENT MODAL (TASK 3) */}
      {/* ────────────────────────────────────────────────────────── */}
      {showResumeModal && activeAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
              ⏱️
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                Active Assessment Found
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Your previous assessment is still in progress.
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You have an incomplete diagnostic pre-assessment session. You can resume your session immediately with your saved answers intact.
              </p>
            </div>

            {/* Assessment Details Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Assessment Name:</span>
                <strong className="text-slate-800">{activeAssessment.name || 'Diagnostic Pre-Assessment'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Questions Answered:</span>
                <strong className="text-emerald-600">{activeAssessment.answeredCount} of {activeAssessment.totalQuestions}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Questions Remaining:</span>
                <strong className="text-amber-600">{activeAssessment.unansweredCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Time:</span>
                <strong className="text-indigo-600 font-mono">
                  {Math.floor(activeAssessment.remainingSeconds / 60)}m {activeAssessment.remainingSeconds % 60}s
                </strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResumeModal(false);
                  navigate(`/module1/pre-assessment/${activeAssessment.id || activeAssessment.attemptId}`);
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <span>⚡ Resume Assessment</span>
              </button>

              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-all"
              >
                Cancel / Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
