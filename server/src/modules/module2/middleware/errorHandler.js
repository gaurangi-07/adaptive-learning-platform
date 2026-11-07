/**
 * @file errorHandler.js
 * @description Centralized error-handling middleware for consistent API responses.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    success: false,
    error: err.message || 'Internal Server Error'
  };

  if (err.details) {
    response.details = err.details;
  }

  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  if (statusCode === 500 && !err.isOperational) {
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json(response);
}

module.exports = { AppError, errorHandler };

