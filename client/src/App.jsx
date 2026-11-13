/**
 * @file App.jsx
 * @description Root routing component for the PARAKH Adaptive Learning Platform.
 * All three modules are connected through a unified router.
 * Protected routes require Module 1 JWT authentication.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Module 1 — Student Auth & Pre-assessment
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

// Unified Report
import UnifiedReportPage from './pages/UnifiedReportPage';

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
        {/* ── Public routes (no login required) ── */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/module1/login" element={<Login />} />
        <Route path="/module1/signup" element={<Signup />} />

        {/* ── Module 1: Student pages (protected) ── */}
        <Route path="/module1/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/module1/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/module1/pre-assessment" element={<ProtectedRoute><PreAssessmentIntro /></ProtectedRoute>} />
        <Route path="/module1/pre-assessment/:attemptId" element={<ProtectedRoute><PreAssessmentMCQ /></ProtectedRoute>} />
        <Route path="/pre-assessment" element={<ProtectedRoute><PreAssessmentIntro /></ProtectedRoute>} />
        <Route path="/pre-assessment/:attemptId" element={<ProtectedRoute><PreAssessmentMCQ /></ProtectedRoute>} />
        <Route path="/module1" element={<Navigate to="/module1/dashboard" replace />} />

        {/* ── Module 2: Adaptive Testing (protected) ── */}
        <Route path="/assessment" element={<ProtectedRoute><StartAssessmentPage /></ProtectedRoute>} />
        <Route path="/quiz/:attemptId" element={<ProtectedRoute><AdaptiveQuizPage /></ProtectedRoute>} />
        <Route path="/results/:attemptId" element={<ProtectedRoute><AssessmentCompletePage /></ProtectedRoute>} />
        <Route path="/history/:attemptId" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/report/:adaptiveAttemptId" element={<ProtectedRoute><UnifiedReportPage /></ProtectedRoute>} />

        {/* ── Module 3: AI & Analytics (protected) ── */}
        <Route path="/module3" element={<ProtectedRoute><M3DashboardPage /></ProtectedRoute>} />
        <Route path="/module3/generate" element={<ProtectedRoute><AIQuestionGeneratorPage /></ProtectedRoute>} />
        <Route path="/module3/questions" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />
        <Route path="/module3/pending" element={<ProtectedRoute><PendingReviewsPage /></ProtectedRoute>} />
        <Route path="/module3/analytics" element={<ProtectedRoute><StudentAnalyticsPage /></ProtectedRoute>} />
        <Route path="/module3/reports" element={<ProtectedRoute><StudentPerformanceReportPage /></ProtectedRoute>} />

        {/* Catch-all → login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
