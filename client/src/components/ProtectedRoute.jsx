/**
 * @file ProtectedRoute.jsx
 * @description Route guard that redirects unauthenticated users to /login.
 * Uses Module 1's localStorage auth token as the single source of truth.
 */

import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
