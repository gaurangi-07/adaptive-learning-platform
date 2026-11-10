// src/modules/module1/pages/PreAssessmentIntro.jsx
// -------------------------------------------------
// Instruction page – shows assessment meta data and starts attempt.
// -------------------------------------------------

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startPreAssessment } from '../api/assessmentApi';

export default function PreAssessmentIntro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // For demo we hard‑code meta info – in a real app it could be fetched from config.
  const meta = {
    title: 'Pre‑Assessment',
    questionCount: 10,
    topics: ['DBMS', 'DSA', 'OS'],
    durationMinutes: 15,
    instructions: [
      'Read each question carefully.',
      'Select the best answer.',
      'You can navigate back and forth.',
      'The assessment will be auto‑submitted when time expires.',
    ],
  };

  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await startPreAssessment(meta.questionCount);
      // Navigate to MCQ page, passing attempt data via state
      navigate(`/module1/pre-assessment/${data.attemptId}`, { state: { questions: data.questions, attemptId: data.attemptId } });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to start assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">{meta.title}</h2>
      <p className="mb-2"><strong>Number of questions:</strong> {meta.questionCount}</p>
      <p className="mb-2"><strong>Topics covered:</strong> {meta.topics.join(', ')}</p>
      <p className="mb-2"><strong>Total duration:</strong> {meta.durationMinutes} minutes</p>
      <h3 className="text-xl font-semibold mt-4 mb-2">Instructions</h3>
      <ul className="list-disc list-inside mb-4">
        {meta.instructions.map((ins, i) => (
          <li key={i}>{ins}</li>
        ))}
      </ul>
      {error && <div className="bg-red-100 text-red-800 p-2 mb-2 rounded">{error}</div>}
      <button
        onClick={handleStart}
        disabled={loading}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        {loading ? 'Starting…' : 'Start Assessment'}
      </button>
    </div>
  );
}
