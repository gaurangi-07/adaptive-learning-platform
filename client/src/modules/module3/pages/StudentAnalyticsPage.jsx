/**
 * @file StudentAnalyticsPage.jsx
 * @description Comprehensive Student Performance Analytics Dashboard (Part 10).
 * Displays charts and tables based on ACTUAL assessment responses from Person 2:
 *   - Overall accuracy, total questions, correct/incorrect, avg response time
 *   - Topic-wise accuracy (BarChart)
 *   - Correct vs Incorrect (PieChart)
 *   - Accuracy over time (LineChart)
 *   - Difficulty-wise accuracy (BarChart)
 *   - Filters: Student, Subject, Date range
 */

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import M3Layout from '../components/M3Layout';
import SummaryCard from '../components/SummaryCard';
import M3Spinner from '../components/M3Spinner';
import { AnalyticsService } from '../services/analyticsService';

const MOCK_STUDENTS = [
  { id: 12, name: 'Aarav Sharma (ID #12)' },
  { id: 25, name: 'Diya Patel (ID #25)' },
  { id: 42, name: 'Rohan Verma (ID #42)' }
];

const PIE_COLORS = ['#10b981', '#f43f5e']; // Emerald (correct), Rose (incorrect)

export default function StudentAnalyticsPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(12);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await AnalyticsService.getReport(selectedStudentId, {
          subject: subjectFilter || undefined
        });
        setReport(res.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch student analytics.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [selectedStudentId, subjectFilter]);

  const pieData = report ? [
    { name: 'Correct', value: report.totalCorrect },
    { name: 'Incorrect', value: report.totalIncorrect }
  ].filter((d) => d.value > 0) : [];

  const diffData = report?.difficultyPerformance ? [
    { level: 'Easy',   accuracy: report.difficultyPerformance.easy?.accuracy ?? 0,   count: report.difficultyPerformance.easy?.questionsAttempted ?? 0 },
    { level: 'Medium', accuracy: report.difficultyPerformance.medium?.accuracy ?? 0, count: report.difficultyPerformance.medium?.questionsAttempted ?? 0 },
    { level: 'Hard',   accuracy: report.difficultyPerformance.hard?.accuracy ?? 0,   count: report.difficultyPerformance.hard?.questionsAttempted ?? 0 }
  ] : [];

  return (
    <M3Layout
      title="Student Performance Analytics"
      subtitle="Data-driven insights computed from real student assessments (Person 2 integration)"
    >
      <div className="space-y-6 max-w-6xl">
        {/* Controls / Filter Bar */}
        <div className="card flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              👤 Student:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="p-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
            >
              {MOCK_STUDENTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Subject:
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
            >
              <option value="">All Subjects</option>
              {(report?.subjects || ['Mathematics']).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <M3Spinner message="Crunching assessment analytics…" />
        ) : error ? (
          <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        ) : !report || report.assessmentsAttempted === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <span className="text-4xl block mb-2">📊</span>
            <p className="font-bold text-slate-700">No Assessment Data Yet</p>
            <p className="text-xs mt-1">
              Student #{selectedStudentId} hasn't completed any adaptive assessments yet.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                icon="📝"
                label="Assessments"
                value={report.assessmentsAttempted}
                color="indigo"
              />
              <SummaryCard
                icon="🎯"
                label="Accuracy"
                value={`${report.overallAccuracy}%`}
                subValue={`${report.totalCorrect}/${report.totalQuestionsAttempted} correct`}
                color="emerald"
              />
              <SummaryCard
                icon="⏱️"
                label="Avg. Time"
                value={`${report.avgResponseTimeSec}s`}
                subValue="per question"
                color="amber"
              />
              <SummaryCard
                icon="💡"
                label="Topics Tested"
                value={report.topicPerformance.length}
                color="slate"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: Topic-wise Accuracy */}
              <div className="card">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                  <span>📚 Topic-wise Accuracy (%)</span>
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.topicPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                      <Bar dataKey="accuracy" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Correct vs Incorrect (Pie) */}
              <div className="card">
                <h3 className="text-sm font-bold text-slate-800 mb-4">
                  🎯 Correct vs. Incorrect Answers
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={5}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Performance Over Time (Line) */}
              <div className="card">
                <h3 className="text-sm font-bold text-slate-800 mb-4">
                  📈 Accuracy Progression Over Time
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={report.performanceOverTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={(d) => new Date(d).toLocaleString()}
                        formatter={(v) => [`${v}%`, 'Accuracy']}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#4f46e5' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Difficulty-wise Accuracy */}
              <div className="card">
                <h3 className="text-sm font-bold text-slate-800 mb-4">
                  ⚖️ Difficulty-wise Accuracy (%)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={diffData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                      <Bar dataKey="accuracy" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-emerald-50/60 border-emerald-200">
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <span>💪</span> Strong Academic Areas (≥70% accuracy)
                </h4>
                {report.strongTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.strongTopics.map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">None identified yet.</p>
                )}
              </div>

              <div className="card bg-rose-50/60 border-rose-200">
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <span>⚠️</span> Areas Requiring Improvement (&lt;50% accuracy)
                </h4>
                {report.weakTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {report.weakTopics.map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-semibold">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No critical weaknesses detected.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </M3Layout>
  );
}
