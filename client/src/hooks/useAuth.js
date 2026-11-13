/**
 * @file useAuth.js
 * @description Shared authentication hook for all three modules.
 * Reads Module 1's localStorage tokens so Module 2 and Module 3
 * pages can access the authenticated student identity.
 */

export function useAuth() {
  const token = localStorage.getItem('authToken');

  let student = null;
  try {
    const raw = localStorage.getItem('studentUser');
    student = raw ? JSON.parse(raw) : null;
  } catch {
    student = null;
  }

  function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('studentUser');
    window.location.href = '/login';
  }

  return {
    token,
    student,
    isAuthenticated: Boolean(token),
    studentId: student?.id ?? null,
    studentName: student?.fullName ?? 'Student',
    logout
  };
}
