/**
 * @file App.jsx
 * @description Root routing component for the PARAKH Adaptive Learning Platform.
 * Sets the Student Login page as the initial landing page (/).
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './modules/module1/pages/Login';
import Signup from './modules/module1/pages/Signup';
import Profile from './modules/module1/pages/Profile';
import Dashboard from './modules/module1/pages/Dashboard';
import PreAssessmentIntro from './modules/module1/pages/PreAssessmentIntro';
import PreAssessmentMCQ from './modules/module1/pages/PreAssessmentMCQ';

// Module 2 — Adaptive Testing System
import StartAssessmentPage from './modules/module2/pages/StartAssessmentPage';
import AdaptiveQuizPage from './modules/module2/pages/AdaptiveQuizPage';
import AssessmentCompletePage from './modules/module2/pages/AssessmentCompletePage';
import HistoryPage from './modules/module2/pages/HistoryPage';

// Module 3 — AI Question Bank & Student Analytics
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
        {/* FIRST PAGE: Student Login as the website entry point */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Module 1 – Student Management & Diagnostic Assessment */}
        <Route path="/module1/login" element={<Login />} />
        <Route path="/module1/signup" element={<Signup />} />
        <Route path="/module1/profile" element={<Profile />} />
        <Route path="/module1/dashboard" element={<Dashboard />} />
        <Route path="/module1/pre-assessment" element={<PreAssessmentIntro />} />
        <Route path="/module1/pre-assessment/:attemptId" element={<PreAssessmentMCQ />} />
        <Route path="/module1" element={<Navigate to="/" replace />} />

        {/* Module 2 — Computer Adaptive Testing Engine */}
        <Route path="/assessment" element={<StartAssessmentPage />} />
        <Route path="/quiz/:attemptId" element={<AdaptiveQuizPage />} />
        <Route path="/results/:attemptId" element={<AssessmentCompletePage />} />
        <Route path="/history/:attemptId" element={<HistoryPage />} />

        {/* Module 3 — AI Question Bank & Student Analytics */}
        <Route path="/module3" element={<M3DashboardPage />} />
        <Route path="/module3/generate" element={<AIQuestionGeneratorPage />} />
        <Route path="/module3/questions" element={<QuestionBankPage />} />
        <Route path="/module3/pending" element={<PendingReviewsPage />} />
        <Route path="/module3/analytics" element={<StudentAnalyticsPage />} />
        <Route path="/module3/reports" element={<StudentPerformanceReportPage />} />

        {/* Default catch-all redirects to the Login landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
