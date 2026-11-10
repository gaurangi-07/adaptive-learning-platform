/**
 * @file App.jsx
 * @description Root routing component for the Adaptive Learning Platform.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signup from './modules/module1/pages/Signup';
import Login from './modules/module1/pages/Login';
import Profile from './modules/module1/pages/Profile';
import Dashboard from './modules/module1/pages/Dashboard';
import StartAssessmentPage from './modules/module2/pages/StartAssessmentPage';
import PreAssessmentIntro from './modules/module1/pages/PreAssessmentIntro';
import PreAssessmentMCQ from './modules/module1/pages/PreAssessmentMCQ';
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
                {/* Module 1 – Student Management */}
        <Route path="/module1/signup" element={<Signup />} />
        <Route path="/module1/login" element={<Login />} />
        <Route path="/module1/profile" element={<Profile />} />
        <Route path="/module1/dashboard" element={<Dashboard />} />
        {/* Default redirect for /module1 */}
        <Route path="/module1" element={<Navigate to="/module1/login" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
