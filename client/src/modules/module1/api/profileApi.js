// src/modules/module1/api/profileApi.js
// Simple wrappers for profile and dashboard endpoints.

import axios from 'axios';

function authHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchProfile() {
  const response = await axios.get('/api/student/profile', { headers: authHeader() });
  return response.data;
}

export async function updateProfile(data) {
  const response = await axios.put('/api/student/profile', data, { headers: authHeader() });
  return response.data;
}

export async function fetchDashboard() {
  const response = await axios.get('/api/student/dashboard', { headers: authHeader() });
  return response.data;
}
