/**
 * @file server.js
 * @description Entry point — starts the Express server.
 */

require('dotenv').config();
const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`\n🚀  Adaptive Learning Platform — Module 2 Server`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Listening   : http://localhost:${PORT}`);
  console.log(`   Health      : http://localhost:${PORT}/api/health`);
  console.log(`   Adaptive API: http://localhost:${PORT}/api/adaptive/health\n`);
});

