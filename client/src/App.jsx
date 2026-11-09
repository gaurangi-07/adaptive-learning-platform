/**
 * @file App.jsx
 * @description Root routing component for the Adaptive Learning Platform.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StartAssessmentPage from './modules/module2/pages/StartAssessmentPage';
import AdaptiveQuizPage from './modules/module2/pages/AdaptiveQuizPage';
import AssessmentCompletePage from './modules/module2/pages/AssessmentCompletePage';
import HistoryPage from './modules/module2/pages/HistoryPage';

// Module 3 — Person 3 Pages
import M3DashboardPage from './modules/module3/pages/M3DashboardPage';
import AIQuestionGeneratorPage from './modules/module3/pages/AIQuestionGeneratorPage';
import QuestionBankPage from './modules/module3/pages/QuestionBankPage';
import PendingReviewsPage from './modules/module3/pages/PendingReviewsPage';
import StudentAnalyticsPage from './modules/module3/pages/StudentAnalyticsPage';
import StudentPerformanceReportPage from './modules/module3/pages/StudentPerformanceReportPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Module 2 — Adaptive Testing */}
        <Route path="/" element={<StartAssessmentPage />} />
        <Route path="/quiz/:attemptId" element={<AdaptiveQuizPage />} />
        <Route path="/results/:attemptId" element={<AssessmentCompletePage />} />
        <Route path="/history/:attemptId" element={<HistoryPage />} />

        {/* Module 3 — AI Question Bank & Student Analytics (Person 3) */}
        <Route path="/module3" element={<M3DashboardPage />} />
        <Route path="/module3/generate" element={<AIQuestionGeneratorPage />} />
        <Route path="/module3/questions" element={<QuestionBankPage />} />
        <Route path="/module3/pending" element={<PendingReviewsPage />} />
        <Route path="/module3/analytics" element={<StudentAnalyticsPage />} />
        <Route path="/module3/reports" element={<StudentPerformanceReportPage />} />

        {/* Module 1 placeholder */}
        <Route path="/module1/*" element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-700 mb-2">Module 1</h2>
              <p className="text-slate-500">Student Profiling & Pre-Assessment — Teammate 1's work</p>
            </div>
          </div>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
