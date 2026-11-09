/**
 * @file StudentPerformanceReportPage.jsx
 * @description Detailed Student Performance Report for teachers/students (Part 11).
 * Features:
 *   - Printable / exportable layout
 *   - Student academic summary
 *   - Assessment history log
 *   - Comprehensive topic-by-topic breakdown
 *   - Difficulty-wise analysis
 *   - Response time & pacing analysis
 *   - Actionable learning recommendations
 */

import { useState, useEffect } from 'react';
import M3Layout from '../components/M3Layout';
import M3Spinner from '../components/M3Spinner';
import { AnalyticsService } from '../services/analyticsService';

const MOCK_STUDENTS = [
  { id: 12, name: 'Aarav Sharma', grade: 'Grade 10', section: 'A' },
  { id: 25, name: 'Diya Patel', grade: 'Grade 10', section: 'B' },
  { id: 42, name: 'Rohan Verma', grade: 'Grade 10', section: 'A' }
];

export default function StudentPerformanceReportPage() {
  const [selectedStudentId, setSelectedStudentId] = useState(12);
  const [report, setReport] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeStudent = MOCK_STUDENTS.find((s) => s.id === selectedStudentId) || MOCK_STUDENTS[0];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [repRes, assRes] = await Promise.all([
          AnalyticsService.getReport(selectedStudentId),
          AnalyticsService.getAssessments(selectedStudentId)
        ]);
        setReport(repRes.data);
        setAssessments(assRes.data.assessments || []);
      } catch (err) {
        setError(err.message || 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedStudentId]);

  function handlePrint() {
    window.print();
  }

  return (
    <M3Layout
      title="Student Performance Report"
      subtitle="Comprehensive assessment transcript, topic proficiencies, and learning pathways"
    >
      <div className="max-w-4xl space-y-6">
        {/* Controls Bar (hidden during print) */}
        <div className="card flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Select Student:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="p-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800"
            >
              {MOCK_STUDENTS.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2"
          >
            <span>🖨️</span> Print / Save as PDF
          </button>
        </div>

        {loading ? (
          <M3Spinner message="Generating performance report…" />
        ) : error ? (
          <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        ) : !report ? null : (
          /* Report Document Container */
          <div className="card bg-white p-8 space-y-8 shadow-md border-slate-300 print:border-none print:shadow-none print:p-0">
            {/* Report Header */}
            <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🎓</span>
                  <span className="text-xl font-extrabold text-slate-900">PARAKH ASSESSMENT SYSTEM</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Official Student Performance Transcript</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Generated: {new Date().toLocaleDateString()}</p>
                <p className="font-mono text-slate-400">ID: PARAKH-REP-{activeStudent.id}-{Date.now().toString().slice(-4)}</p>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Student Name</span>
                <span className="font-bold text-slate-900 text-sm">{activeStudent.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Student ID</span>
                <span className="font-bold text-slate-900 text-sm">#{activeStudent.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Grade / Class</span>
                <span className="font-bold text-slate-900 text-sm">{activeStudent.grade} - Section {activeStudent.section}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase">Assessments Taken</span>
                <span className="font-bold text-indigo-600 text-sm">{report.assessmentsAttempted}</span>
              </div>
            </div>

            {/* Overall Score Summary */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Overall Assessment Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xl font-black text-indigo-600 block">{report.overallAccuracy}%</span>
                  <span className="text-xs text-slate-500 font-medium">Overall Accuracy</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xl font-black text-emerald-600 block">{report.totalCorrect}</span>
                  <span className="text-xs text-slate-500 font-medium">Total Correct</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xl font-black text-rose-600 block">{report.totalIncorrect}</span>
                  <span className="text-xs text-slate-500 font-medium">Total Incorrect</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-2xl font-black text-amber-600 block">{report.avgResponseTimeSec}s</span>
                  <span className="text-xs text-slate-500 font-medium">Avg. Response Time</span>
                </div>
              </div>
            </div>

            {/* Topic Breakdown Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Topic-wise Mastery Breakdown
              </h3>
              {report.topicPerformance.length === 0 ? (
                <p className="text-xs text-slate-400">No topic performance recorded.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-3 font-bold">Topic</th>
                        <th className="p-3 font-bold text-center">Attempted</th>
                        <th className="p-3 font-bold text-center">Correct</th>
                        <th className="p-3 font-bold text-center">Accuracy</th>
                        <th className="p-3 font-bold text-center">Avg. Time</th>
                        <th className="p-3 font-bold text-right">Mastery Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.topicPerformance.map((t) => {
                        let masteryText = 'Developing';
                        let masteryColor = 'bg-amber-100 text-amber-800 border-amber-200';
                        if (t.accuracy >= 75) {
                          masteryText = 'Mastered';
                          masteryColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        } else if (t.accuracy < 50) {
                          masteryText = 'Critical Attention';
                          masteryColor = 'bg-rose-100 text-rose-800 border-rose-200';
                        }

                        return (
                          <tr key={t.topic} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{t.topic}</td>
                            <td className="p-3 text-center">{t.questionsAttempted}</td>
                            <td className="p-3 text-center font-bold text-emerald-600">{t.questionsCorrect}</td>
                            <td className="p-3 text-center font-bold">{t.accuracy}%</td>
                            <td className="p-3 text-center text-slate-500">{t.avgResponseTimeSec}s</td>
                            <td className="p-3 text-right">
                              <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${masteryColor}`}>
                                {masteryText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assessment History Table */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Recent Assessment History
              </h3>
              {assessments.length === 0 ? (
                <p className="text-xs text-slate-400">No assessment sessions recorded.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-3 font-bold">Assessment ID</th>
                        <th className="p-3 font-bold">Subject</th>
                        <th className="p-3 font-bold text-center">Score</th>
                        <th className="p-3 font-bold text-center">Accuracy</th>
                        <th className="p-3 font-bold text-center">Status</th>
                        <th className="p-3 font-bold text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assessments.slice(0, 5).map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-500">{a.id.slice(0, 8)}…</td>
                          <td className="p-3 font-semibold text-slate-800">{a.subject}</td>
                          <td className="p-3 text-center font-bold">{a.score}/{a.answeredCount}</td>
                          <td className="p-3 text-center font-bold text-indigo-600">{a.accuracy}%</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-semibold">
                              {a.status}
                            </span>
                          </td>
                          <td className="p-3 text-right text-slate-500">
                            {new Date(a.startedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actionable Learning Pathways */}
            <div className="p-5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                <span>🎯</span> Recommended Learning Pathways
              </h4>
              <p className="text-xs text-indigo-800">
                Based on adaptive assessment response patterns, student should prioritize:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {report.suggestedTopics.length > 0 ? (
                  report.suggestedTopics.map((t) => (
                    <span key={t} className="px-3 py-1 bg-white text-indigo-700 border border-indigo-300 rounded-lg text-xs font-bold shadow-sm">
                      📌 {t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">General curriculum practice recommended.</span>
                )}
              </div>
            </div>

            {/* Report Footer */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-400">
              <span>PARAKH Adaptive Assessment System · Confidential Student Record</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        )}
      </div>
    </M3Layout>
  );
}
