/**
 * @file app.js
 * @description Express application setup for the Adaptive Learning Platform.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const adaptiveRoutes = require('./modules/module2/routes/adaptiveRoutes');
const authRoutes = require('./modules/module1/routes/authRoutes');


const questionRoutes = require('./modules/module3/routes/questionRoutes');
const aiRoutes = require('./modules/module3/routes/aiRoutes');
const analyticsRoutes = require('./modules/module3/routes/analyticsRoutes');
const { errorHandler } = require('./modules/module2/middleware/errorHandler');

function createApp() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json());

  // Root health
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Adaptive Learning Platform API',
        version: '1.0.0',
        modules: {
          module1: 'Placeholder — Student Profiling & Pre-Assessment',
          module2: 'Active — Adaptive Testing System',
          module3: 'Active — Question Bank, AI Generation & Analytics'
        },
        timestamp: new Date().toISOString()
      }
    });
  });

  // Auth routes
  app.use('/api/auth', authRoutes);

  // Student routes (profile, dashboard)
  const preAssessmentRoutes = require('./modules/module1/routes/preAssessmentRoutes');
  app.use('/api/assessment', preAssessmentRoutes);

  app.use('/api/student', studentRoutes);

  app.use('/api/adaptive', adaptiveRoutes);

  // Module 3 routes
  app.use('/api/questions', questionRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
