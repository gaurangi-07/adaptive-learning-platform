/**
 * @file api.js
 * @description Centralized API base URL resolver for the PARAKH frontend.
 *
 * Automatically resolves the backend API root:
 * - In production: uses VITE_API_URL (e.g. Render backend URL https://adaptive-platform.onrender.com)
 * - In development: defaults to '/api' which routes through the local Vite dev proxy.
 */

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) {
    return '/api';
  }
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = getApiBaseUrl();
export default API_BASE_URL;
