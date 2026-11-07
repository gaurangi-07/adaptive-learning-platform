/**
 * @file HistoryPage.jsx
 * @description Shows the full question-by-question history of a completed assessment.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdaptiveService } from '../services/adaptiveService';
import DifficultyBadge from '../components/DifficultyBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HistoryPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    AdaptiveService.getHistory(attemptId)
      .then((res) => { setHistory(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [attemptId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner message="Loading history…" size="lg" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary text-sm px-4 py-2">
            ← Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Question History</h1>
            <p className="text-xs text-slate-500">Attempt: {attemptId?.slice(0, 8)}…</p>
          </div>
        </div>

        {error && <p className="text-rose-600 text-sm mb-4">{error}</p>}

        {history?.responses?.length > 0 ? (
          <div className="space-y-4">
            {history.responses.map((r) => (
              <div key={r.order} className={`card border-l-4 ${r.isCorrect ? 'border-l-emerald-400' : r.isTimedOut ? 'border-l-amber-400' : 'border-l-rose-400'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-400">Q{r.order}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DifficultyBadge difficulty={r.difficulty} />
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{r.topic}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.isCorrect ? 'bg-emerald-100 text-emerald-700' : r.isTimedOut ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {r.isTimedOut ? 'Timed Out' : r.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-800 font-medium mb-3">{r.questionText}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {r.options?.map((opt) => (
                    <div key={opt.id} className={`text-xs px-3 py-2 rounded-lg border ${
                      opt.id === r.correctOption ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' :
                      opt.id === r.selectedOption && opt.id !== r.correctOption ? 'bg-rose-50 border-rose-300 text-rose-700' :
                      'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <span className="font-bold mr-1">{opt.id}.</span> {opt.text}
                    </div>
                  ))}
                </div>
                {r.explanation && (
                  <p className="text-xs text-slate-600 italic border-t border-slate-100 pt-2">
                    💡 {r.explanation}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">Response time: {r.responseTimeSec}s</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-10">No responses found.</p>
        )}
      </div>
    </div>
  );
}

