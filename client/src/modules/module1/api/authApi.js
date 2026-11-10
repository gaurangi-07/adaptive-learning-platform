// src/modules/module1/api/authApi.js
// Client API service for student authentication.

import axios from 'axios';

const API_BASE = '/api/auth';

export async function registerStudent(data) {
  const response = await axios.post(`${API_BASE}/register`, data);
  if (response.data.token) {
    localStorage.setItem('authToken', response.data.token);
  }
  if (response.data.student) {
    localStorage.setItem('studentUser', JSON.stringify(response.data.student));
  }
  return response.data;
}

export async function loginStudent(data) {
  const response = await axios.post(`${API_BASE}/login`, data);
  if (response.data.token) {
    localStorage.setItem('authToken', response.data.token);
  }
  if (response.data.student) {
    localStorage.setItem('studentUser', JSON.stringify(response.data.student));
  }
  return response.data;
}

export function getCurrentStudent() {
  try {
    const raw = localStorage.getItem('studentUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('authToken'));
}

export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('studentUser');
}
