// src/modules/module1/pages/Login.jsx
// -------------------------------------------------------------------
// Student login page – React + Tailwind CSS
// -------------------------------------------------------------------

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginStudent } from '../api/authApi';
import { fetchDashboard } from '../api/profileApi';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const resp = await loginStudent(form);
      if (resp.success) {
        // after login, fetch dashboard to ensure token works, then go to dashboard
        await fetchDashboard();
        navigate('/module1/dashboard');
      } else {
        setError(resp.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Server error');
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h2 className="text-2xl font-bold text-center mb-6">Student Login</h2>
      {error && <div className="bg-red-100 text-red-800 p-2 mb-4 rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-9 text-sm text-gray-600"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Log In
        </button>
        <p className="text-center text-sm mt-2">
          No account?{' '}
          <span className="text-blue-600 cursor-pointer" onClick={() => navigate('/module1/signup')}>
            Sign up
          </span>
        </p>
      </form>
    </div>
  );
}
