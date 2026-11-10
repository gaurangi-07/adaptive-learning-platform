/**
 * @file Profile.jsx
 * @description Student profile view & edit page for PARAKH Adaptive Learning Platform.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchProfile, updateProfile } from '../api/profileApi';
import { logout } from '../api/authApi';

export default function Profile() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({ fullName: '', college: '', branch: '', yearOfStudy: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchProfile();
        if (data.success) {
          setStudent(data.student);
          setForm({
            fullName: data.student.fullName || '',
            college: data.student.college || '',
            branch: data.student.branch || '',
            yearOfStudy: data.student.yearOfStudy || ''
          });
        } else {
          setError('Failed to load profile');
        }
      } catch (e) {
        setError('Session expired. Please log in again.');
        logout();
        navigate('/');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
    if (message) setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        college: form.college.trim() || undefined,
        branch: form.branch.trim() || undefined,
        yearOfStudy: form.yearOfStudy ? Number(form.yearOfStudy) : undefined
      };
      const res = await updateProfile(payload);
      if (res.success) {
        setMessage('Profile details updated successfully!');
        setStudent(res.student);
      } else {
        setError(res.error || 'Update failed');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Server error occurred while updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/module1/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800"
          >
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 font-black text-2xl flex items-center justify-center shadow-sm">
              {student?.fullName?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{student?.fullName || 'Student Profile'}</h1>
              <p className="text-xs text-slate-400 font-mono">{student?.email}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={form.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm transition-all focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1" htmlFor="college">
                College / University
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1" htmlFor="branch">
                  Branch / Major
                </label>
                <input
                  id="branch"
                  name="branch"
                  type="text"
                  value={form.branch}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm transition-all focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1" htmlFor="yearOfStudy">
                  Year of Study
                </label>
                <select
                  id="yearOfStudy"
                  name="yearOfStudy"
                  value={form.yearOfStudy}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm transition-all focus:outline-none"
                >
                  <option value="">Select year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-indigo-200 mt-2"
            >
              {saving ? 'Saving Changes…' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
