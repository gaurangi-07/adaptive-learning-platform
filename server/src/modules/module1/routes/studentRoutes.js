// routes/studentRoutes.js
// -------------------------------------------------------------------
// Protected routes for student profile and dashboard (Module 1)
// -------------------------------------------------------------------

const express = require('express');
const { getProfile, updateProfile, getDashboard } = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // all routes require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/dashboard', getDashboard);

module.exports = router;
