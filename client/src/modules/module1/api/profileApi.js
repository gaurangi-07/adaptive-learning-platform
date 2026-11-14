// src/modules/module1/api/profileApi.js
// Simple wrappers for profile and dashboard endpoints.

import axios from 'axios';
import { getApiBaseUrl } from '../../../config/api';

const API_BASE = getApiBaseUrl();

function authHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchProfile() {
  const response = await axios.get(`${API_BASE}/student/profile`, { headers: authHeader() });
  return response.data;
}

export async function updateProfile(data) {
  const response = await axios.put(`${API_BASE}/student/profile`, data, { headers: authHeader() });
  return response.data;
}

export async function fetchDashboard() {
  const response = await axios.get(`${API_BASE}/student/dashboard`, { headers: authHeader() });
  return response.data;
}
