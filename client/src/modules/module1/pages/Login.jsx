/**
 * @file Login.jsx
 * @description Modern, responsive student login page for PARAKH Adaptive Learning Platform.
 * First entry-point of the application.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginStudent } from '../api/authApi';

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validate() {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!form.password) {
      errs.password = 'Password is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (generalError) setGeneralError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const resp = await loginStudent({
        email: form.email.trim(),
        password: form.password,
      });

      if (resp.success) {
        navigate('/module1/dashboard');
      } else {
        setGeneralError(resp.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'Invalid email or password. Please try again.';
      setGeneralError(apiError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">

        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3 shadow-sm">
            <span>🎓</span> PARAKH Adaptive Learning
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Sign In</h1>
          <p className="text-slate-500 text-sm mt-1">
            Access your personalized adaptive assessments & learning dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">

          {/* General Error Alert */}
          {generalError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start justify-between gap-2 animate-shake">
              <div className="flex items-start gap-2">
                <span className="text-base leading-none">⚠️</span>
                <span className="font-medium text-xs sm:text-sm">{generalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGeneralError('')}
                className="text-rose-400 hover:text-rose-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="email">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. student@college.edu"
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.email
                      ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-400 text-rose-900'
                      : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 text-slate-900'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-rose-600 text-xs font-semibold mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide" htmlFor="password">
                  Password <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.password
                      ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-400 text-rose-900'
                      : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 text-xs font-semibold focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <span className="flex items-center gap-1">🙈 Hide</span>
                  ) : (
                    <span className="flex items-center gap-1">👁️ Show</span>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-600 text-xs font-semibold mt-1.5 flex items-center gap-1">
                  <span>•</span> {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-indigo-200 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign In to Student Portal →</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">
              New Student?
            </span>
          </div>

          {/* Create Account Link */}
          <div className="text-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all"
            >
              Create New Student Account
            </Link>
          </div>
        </div>

        {/* Quick Portal Switcher for Evaluators / Teachers */}
        <div className="mt-6 p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-3">
          <span>Quick Access:</span>
          <Link to="/assessment" className="text-indigo-600 font-semibold hover:underline">
            ⚡ Direct Quiz
          </Link>
          <span className="text-slate-300">•</span>
          <Link to="/module3" className="text-indigo-600 font-semibold hover:underline">
            ⚙️ Teacher Portal
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          PARAKH Project · Ministry of Education Aligned · © 2026
        </p>
      </div>
    </div>
  );
}
