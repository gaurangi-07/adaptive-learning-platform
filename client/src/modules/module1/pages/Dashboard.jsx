// src/modules/module1/pages/Dashboard.jsx
// -------------------------------------------------------------------
// Student dashboard – shows welcome, assessment status, baseline, and navigation.
// -------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../api/profileApi';
import { logout } from '../api/authApi';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetchDashboard();
        if (resp.success) {
          setData(resp.data);
        } else {
          setError('Failed to load dashboard');
        }
      } catch (e) {
        setError('Session expired – please log in again');
        logout();
        navigate('/module1/login');
      }
    }
    load();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/module1/login');
  };

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }
  if (!data) {
    return <div className="p-4">Loading dashboard…</div>;
  }

  const { studentName, assessmentStatus, baseline } = data;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Welcome, {studentName}</h2>
      <p className="mb-2"><strong>Assessment status:</strong> {assessmentStatus}</p>
      {baseline ? (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Baseline Results</h3>
          <p><strong>Overall accuracy:</strong> {baseline.overallAccuracy.toFixed(1)}%</p>
          <p><strong>Total questions:</strong> {baseline.totalQuestions}</p>
          <p><strong>Correct answers:</strong> {baseline.correctAnswers}</p>
          <h4 className="mt-2 font-medium">Topic proficiency</h4>
          <ul className="list-disc list-inside">
            {Object.entries(baseline.topicProficiency).map(([topic, score]) => (
              <li key={topic}>{topic}: {(score * 100).toFixed(0)}%</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4">No baseline data yet. Start your pre‑assessment.</p>
      )}
      <div className="mt-6 space-x-4">
        <button onClick={() => navigate('/module1/profile')} className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700">
          View / Edit Profile
        </button>
        <button onClick={handleLogout} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">
          Logout
        </button>
      </div>
    </div>
  );
}
