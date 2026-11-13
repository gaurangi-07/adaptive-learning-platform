/**
 * @file api.js
 * @description Axios instance for Module 3 frontend API calls.
 * Uses Module 1 JWT token for unified authentication.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach Module 1 JWT token + student ID header for read-only lookups
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  // Also send x-user-id for Module 3 endpoints that use it for createdBy tracking
  try {
    const student = JSON.parse(localStorage.getItem('studentUser') || 'null');
    if (student?.id) config.headers['x-user-id'] = String(student.id);
  } catch {}
  return config;
});

// Response interceptor — unwrap data.data for convenience + 401 redirect
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('studentUser');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
