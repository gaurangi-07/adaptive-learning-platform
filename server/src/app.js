/**
 * @file app.js
 * @description Express application setup for the Adaptive Learning Platform.
 */

const express = require('express');
const cors = require('cors');
const adaptiveRoutes = require('./modules/module2/routes/adaptiveRoutes');
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
          module3: 'Placeholder — Question Bank & Analytics'
        },
        timestamp: new Date().toISOString()
      }
    });
  });

  // Module 2 routes
  app.use('/api/adaptive', adaptiveRoutes);

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

