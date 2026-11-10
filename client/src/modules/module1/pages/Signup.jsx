/**
 * @file Signup.jsx
 * @description Modern, responsive student registration page for PARAKH Adaptive Learning Platform.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerStudent } from '../api/authApi';

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
    branch: '',
    yearOfStudy: '',
  });

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function validate() {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Full Name
    if (!form.fullName.trim()) {
      errs.fullName = 'Full name is required';
    } else if (form.fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters';
    }

    // Email
    if (!form.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    // Password
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    // Confirm Password
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    // Year of study
    if (form.yearOfStudy) {
      const year = Number(form.yearOfStudy);
      if (isNaN(year) || year < 1 || year > 6) {
        errs.yearOfStudy = 'Year must be between 1 and 6';
      }
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
    setSuccessMessage('');

    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        college: form.college.trim() || undefined,
        branch: form.branch.trim() || undefined,
        yearOfStudy: form.yearOfStudy ? Number(form.yearOfStudy) : undefined,
      };

      const resp = await registerStudent(payload);

      if (resp.success) {
        setSuccessMessage('Registration successful! Redirecting to your dashboard…');
        setTimeout(() => {
          navigate('/module1/dashboard');
        }, 1200);
      } else {
        setGeneralError(resp.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'Registration failed. Please check your inputs.';
      setGeneralError(apiError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-2xl">

        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3 shadow-sm">
            <span>🎓</span> PARAKH Student Registration
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Student Account</h1>
          <p className="text-slate-500 text-sm mt-1">
            Join the adaptive assessment platform to evaluate your competencies
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">

          {/* Success Notification */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
              <span className="text-xl">🎉</span>
              <div>
                <p className="font-bold">{successMessage}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Setting up your profile…</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {generalError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start justify-between gap-2 animate-shake">
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

            {/* Row 1: Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="fullName">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Aarav Sharma"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.fullName
                      ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-400 text-rose-900'
                      : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 text-slate-900'
                  }`}
                />
                {errors.fullName && (
                  <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
                    <span>•</span> {errors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="email">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. aarav@college.edu"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.email
                      ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-400 text-rose-900'
                      : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 text-slate-900'
                  }`}
                />
                {errors.email && (
                  <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
                    <span>•</span> {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="password">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className={`w-full px-4 py-2.5 pr-12 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                      errors.password
                        ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-400 text-rose-900'
                        : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs font-semibold"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
                    <span>•</span> {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="confirmPassword">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className={`w-full px-4 py-2.5 pr-12 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                      errors.confirmPassword
                        ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-400 text-rose-900'
                        : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-indigo-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs font-semibold"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
                    <span>•</span> {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: College Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="college">
                College / University Name
              </label>
              <input
                id="college"
                name="college"
                type="text"
                value={form.college}
                onChange={handleChange}
                placeholder="e.g. National Institute of Technology"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm transition-all focus:outline-none"
              />
            </div>

            {/* Row 4: Branch & Year of Study */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="branch">
                  Branch / Department
                </label>
                <input
                  id="branch"
                  name="branch"
                  type="text"
                  value={form.branch}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm transition-all focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5" htmlFor="yearOfStudy">
                  Year of Study
                </label>
                <select
                  id="yearOfStudy"
                  name="yearOfStudy"
                  value={form.yearOfStudy}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm transition-all focus:outline-none"
                >
                  <option value="">Select current year (optional)</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
                {errors.yearOfStudy && (
                  <p className="text-rose-600 text-xs font-semibold mt-1 flex items-center gap-1">
                    <span>•</span> {errors.yearOfStudy}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-indigo-200 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Creating Account…</span>
                </>
              ) : (
                <span>Complete Registration & Go to Dashboard →</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">
              Already registered?
            </span>
          </div>

          {/* Navigation to Login */}
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          PARAKH Project · Ministry of Education Aligned · © 2026
        </p>
      </div>
    </div>
  );
}
