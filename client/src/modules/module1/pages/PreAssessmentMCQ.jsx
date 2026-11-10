// src/modules/module1/pages/PreAssessmentMCQ.jsx
// -------------------------------------------------
// MCQ interface for the pre‑assessment attempt.
// -------------------------------------------------

import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { finishPreAssessment } from '../api/assessmentApi';

export default function PreAssessmentMCQ() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const questions = location.state?.questions || [];
  const total = questions.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(() => {
    // Load saved answers from localStorage if present
    const saved = localStorage.getItem(`preassessment_${attemptId}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [timer, setTimer] = useState(15 * 60); // 15 minutes default
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Countdown timer (seconds)
  useEffect(() => {
    if (timer <= 0) return; // will trigger auto‑submit via effect below
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // Auto‑submit if timer expires
  useEffect(() => {
    if (timer === 0) {
      handleSubmit();
    }
  }, [timer]);

  // Persist answers on each change
  useEffect(() => {
    if (attemptId) {
      localStorage.setItem(`preassessment_${attemptId}`, JSON.stringify(answers));
    }
  }, [answers, attemptId]);

  const handleOptionSelect = (option) => {
    const q = questions[currentIdx];
    setAnswers({
      ...answers,
      [q.id]: { selectedOption: option, responseTimeSec: answers[q.id]?.responseTimeSec || 0 },
    });
  };

  const handleNext = () => {
    if (currentIdx < total - 1) setCurrentIdx(currentIdx + 1);
  };
  const handlePrev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const responseArray = questions.map((q) => {
      const ans = answers[q.id] || {};
      return {
        questionId: q.id,
        selectedOption: ans.selectedOption || null,
        responseTimeSec: ans.responseTimeSec || 0,
      };
    });
    try {
      const result = await finishPreAssessment(attemptId, responseArray);
      // clear saved answers
      localStorage.removeItem(`preassessment_${attemptId}`);
      navigate('/module1/dashboard', { state: { assessmentFinished: true } });
    } catch (e) {
      setError(e.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!questions.length) {
    return <div className="p-4">Loading assessment…</div>;
  }

  const currentQ = questions[currentIdx];
  const selected = answers[currentQ.id]?.selectedOption || '';

  // Simple minutes:seconds display
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <div>Question {currentIdx + 1} / {total}</div>
        <div className="font-mono text-lg">{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</div>
      </div>
      <h3 className="text-xl font-semibold mb-2">{currentQ.questionText}</h3>
      <ul className="space-y-2 mb-4">
        {currentQ.optionsJson.map((opt) => (
          <li key={opt.id}>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="option"
                value={opt.id}
                checked={selected === opt.id}
                onChange={() => handleOptionSelect(opt.id)}
                className="mr-2"
              />
              {opt.id}. {opt.text}
            </label>
          </li>
        ))}
      </ul>
      {error && <div className="bg-red-100 text-red-800 p-2 mb-2 rounded">{error}</div>}
      <div className="flex space-x-4 mb-4">
        <button onClick={handlePrev} disabled={currentIdx === 0} className="bg-gray-300 py-1 px-3 rounded">Previous</button>
        <button onClick={handleNext} disabled={currentIdx === total - 1} className="bg-gray-300 py-1 px-3 rounded">Next</button>
      </div>
      <div className="flex space-x-2">
        <button onClick={handleSubmit} disabled={submitting} className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
          {submitting ? 'Submitting…' : 'Submit Assessment'}
        </button>
      </div>
    </div>
  );
}
