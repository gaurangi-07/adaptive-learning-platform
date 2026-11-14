/**
 * @file app.js
 * @description Express application setup for the Adaptive Learning Platform.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const studentRoutes = require('./modules/module1/routes/studentRoutes');
const authRoutes = require('./modules/module1/routes/authRoutes');
const adaptiveRoutes = require('./modules/module2/routes/adaptiveRoutes');



const questionRoutes = require('./modules/module3/routes/questionRoutes');
const aiRoutes = require('./modules/module3/routes/aiRoutes');
const analyticsRoutes = require('./modules/module3/routes/analyticsRoutes');
const { errorHandler } = require('./modules/module2/middleware/errorHandler');

function createApp() {
  const app = express();

  // CORS configuration — handles localhost dev, deployed Vercel frontend, and preview deployments
  const allowedOrigins = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''));

  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (health checks, server-to-server, curl)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        allowedOrigins.includes('*') ||
        process.env.NODE_ENV !== 'production' ||
        /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(cleanOrigin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
  }));
  app.use(express.json());

  // Health-check endpoints for Render / container monitoring
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Adaptive Learning Platform API',
        version: '1.0.0',
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        modules: {
          module1: 'Active — Student Profiling & Pre-Assessment',
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
