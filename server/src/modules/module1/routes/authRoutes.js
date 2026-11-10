// routes/authRoutes.js
// -------------------------------------------------------------------
// Authentication routes for Module 1 (student registration & login)
// -------------------------------------------------------------------

const express = require('express');
const { register, login } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/authValidator');

const router = express.Router();

// POST /api/auth/register
router.post('/register', validateRegister, register);

// POST /api/auth/login
router.post('/login', validateLogin, login);

module.exports = router;
