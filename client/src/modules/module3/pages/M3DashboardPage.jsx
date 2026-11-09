/**
 * @file M3DashboardPage.jsx
 * @description Module 3 Overview Dashboard showing key stats, quick actions,
 * and entry points to all Person 3 features.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import M3Layout from '../components/M3Layout';
import SummaryCard from '../components/SummaryCard';
import M3Spinner from '../components/M3Spinner';
import { QuestionService } from '../services/questionService';
import { AnalyticsService } from '../services/analyticsService';

export default function M3DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    pendingQuestions: 0,
    approvedQuestions: 0,
    rejectedQuestions: 0,
    totalAssessments: 0
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [allRes, pendingRes, approvedRes, rejectedRes] = await Promise.allSettled([
          QuestionService.listQuestions({ limit: 1 }),
          QuestionService.listQuestions({ status: 'PENDING', limit: 1 }),
          QuestionService.listQuestions({ status: 'APPROVED', limit: 1 }),
          QuestionService.listQuestions({ status: 'REJECTED', limit: 1 })
        ]);

        setStats({
          totalQuestions: allRes.value?.data?.pagination?.total || 0,
          pendingQuestions: pendingRes.value?.data?.pagination?.total || 0,
          approvedQuestions: approvedRes.value?.data?.pagination?.total || 0,
          rejectedQuestions: rejectedRes.value?.data?.pagination?.total || 0,
          totalAssessments: 0
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <M3Layout
      title="Module 3 Overview"
      subtitle="AI Question Generation, Question Bank Management & Student Analytics"
    >
      {loading ? (
        <M3Spinner message="Loading dashboard…" />
      ) : (
        <div className="space-y-8 max-w-6xl">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard
              icon="📚"
              label="Total Questions"
              value={stats.totalQuestions}
              color="indigo"
            />
            <SummaryCard
              icon="⏳"
              label="Pending Review"
              value={stats.pendingQuestions}
              subValue="Needs teacher review"
              color="amber"
            />
            <SummaryCard
              icon="✅"
              label="Approved"
              value={stats.approvedQuestions}
              subValue="Live in assessments"
              color="emerald"
            />
            <SummaryCard
              icon="❌"
              label="Rejected"
              value={stats.rejectedQuestions}
              color="rose"
            />
          </div>

          {/* Quick Action Tiles */}
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => navigate('/module3/generate')}
                className="card hover:shadow-md hover:border-indigo-300 transition-all text-left group"
              >
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  AI Question Generator
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Generate batches of MCQs by subject, topic, and difficulty using OpenAI or Mock AI.
                </p>
                <span className="text-xs text-indigo-600 font-semibold mt-4 inline-block">
                  Generate now →
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/module3/pending')}
                className="card hover:shadow-md hover:border-amber-300 transition-all text-left group"
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  Review Pending MCQs
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Approve, reject, or edit newly generated questions before they enter live student assessments.
                </p>
                <span className="text-xs text-amber-600 font-semibold mt-4 inline-block">
                  {stats.pendingQuestions} waiting →
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/module3/analytics')}
                className="card hover:shadow-md hover:border-indigo-300 transition-all text-left group"
              >
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Student Analytics
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  View topic accuracy, difficulty-wise breakdown, and response times computed from real student assessments.
                </p>
                <span className="text-xs text-indigo-600 font-semibold mt-4 inline-block">
                  View analytics →
                </span>
              </button>
            </div>
          </div>

          {/* Integration Status Card */}
          <div className="card bg-indigo-50/50 border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <span>🔗</span> Cross-Module Integration Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-indigo-100">
                <span className="font-bold text-slate-700 block">Person 1: Onboarding</span>
                <span className="text-slate-500">
                  Ready. Uses <code className="bg-slate-100 px-1 py-0.5 rounded">x-user-id</code> header for student/teacher ID.
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100">
                <span className="font-bold text-slate-700 block">Person 2: Adaptive Quiz</span>
                <span className="text-slate-500">
                  Connected. QuestionBankAdapter serves approved questions to adaptive engine.
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100">
                <span className="font-bold text-slate-700 block">Person 3: Question Bank & Analytics</span>
                <span className="text-emerald-600 font-semibold">
                  Active. Full AI generation, review, and analytics suite operational.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </M3Layout>
  );
}
