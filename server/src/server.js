/**
 * @file server.js
 * @description Entry point — starts the Express server.
 */

require('dotenv').config();
const { createApp } = require('./app');

const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0';
const app = createApp();

const server = app.listen(PORT, HOST, () => {
  console.log(`\n🚀  Adaptive Learning Platform — Unified API Server`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Host        : ${HOST}:${PORT}`);
  console.log(`   Health      : http://localhost:${PORT}/api/health`);
  console.log(`   Adaptive API: http://localhost:${PORT}/api/adaptive/health\n`);
});

// Graceful shutdown handling for container/cloud platforms (e.g. Render)
const shutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
