// src/modules/module1/api/authApi.js
// Simple wrapper around the auth endpoints.

import axios from 'axios';

const API_BASE = '/api/auth';

export async function registerStudent(data) {
  const response = await axios.post(`${API_BASE}/register`, data);
  // store token locally for subsequent calls
  if (response.data.token) {
    localStorage.setItem('authToken', response.data.token);
  }
  return response.data;
}

export async function loginStudent(data) {
  const response = await axios.post(`${API_BASE}/login`, data);
  if (response.data.token) {
    localStorage.setItem('authToken', response.data.token);
  }
  return response.data;
}

export function logout() {
  localStorage.removeItem('authToken');
}
