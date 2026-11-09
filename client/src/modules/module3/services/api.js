/**
 * @file api.js
 * @description Axios instance for Module 3 frontend API calls.
 * Re-uses the same base URL pattern as Module 2.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach user identity if available (Module 1 integration)
api.interceptors.request.use((config) => {
  const userId = localStorage.getItem('parakh_user_id');
  if (userId) config.headers['x-user-id'] = userId;
  return config;
});

// Response interceptor — unwrap data.data for convenience
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
