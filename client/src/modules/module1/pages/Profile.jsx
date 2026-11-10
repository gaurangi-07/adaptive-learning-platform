// src/modules/module1/pages/Profile.jsx
// -------------------------------------------------------------------
// Student profile view & edit – React + Tailwind CSS
// -------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProfile, updateProfile, fetchDashboard } from '../api/profileApi';
import { logout } from '../api/authApi';

export default function Profile() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({ fullName: '', college: '', branch: '', yearOfStudy: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
        setError('Session expired – please log in again');
        logout();
        navigate('/module1/login');
      }
    }
    load();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await updateProfile(form);
      if (res.success) {
        setMessage('Profile updated');
        setStudent(res.student);
      } else {
        setError(res.error || 'Update failed');
      }
    } catch (e) {
      setError('Server error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/module1/login');
  };

  if (!student) {
    return <div className="p-4">Loading profile…</div>;
  }

  return (
    <div className="max-w-lg mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>
      {error && <div className="bg-red-100 text-red-800 p-2 mb-2 rounded">{error}</div>}
      {message && <div className="bg-green-100 text-green-800 p-2 mb-2 rounded">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="fullName">Full Name</label>
          <input id="fullName" name="fullName" type="text" value={form.fullName} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="college">College</label>
          <input id="college" name="college" type="text" value={form.college} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="branch">Branch</label>
          <input id="branch" name="branch" type="text" value={form.branch} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="yearOfStudy">Year of Study</label>
          <input id="yearOfStudy" name="yearOfStudy" type="number" min="1" value={form.yearOfStudy} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">Save Changes</button>
      </form>
      <button onClick={handleLogout} className="mt-6 text-red-600 hover:underline">Logout</button>
    </div>
  );
}
