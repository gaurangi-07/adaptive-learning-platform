/**
 * @file PendingReviewsPage.jsx
 * @description Dedicated Teacher Review & Approval queue for newly generated MCQs (Part 8).
 * All newly generated questions land here in PENDING status.
 * Teachers can:
 *   - Review question text and options
 *   - Approve (makes it immediately available to Person 2's adaptive engine)
 *   - Reject (with mandatory rejection reason, prevented from entering assessments)
 *   - Edit inline before approving
 */

import { useState, useEffect } from 'react';
import M3Layout from '../components/M3Layout';
import DifficultyBadge from '../components/DifficultyBadge';
import M3Spinner from '../components/M3Spinner';
import { QuestionService } from '../services/questionService';

export default function PendingReviewsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rejection modal
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      const res = await QuestionService.listQuestions({ status: 'PENDING', limit: 50 });
      setQuestions(res.data.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  async function handleApprove(id) {
    try {
      await QuestionService.changeStatus(id, { status: 'APPROVED' });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    }
  }

  async function handleReject(id) {
    if (!rejectionReason.trim()) return;
    try {
      await QuestionService.changeStatus(id, { status: 'REJECTED', rejectionReason });
      setRejectingId(null);
      setRejectionReason('');
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    }
  }

  function startEdit(q) {
    setEditingId(q.id);
    setEditForm({
      questionText: q.questionText,
      explanation: q.explanation,
      correctOption: q.correctOption,
      options: q.options.map((o) => ({
        optionLabel: o.optionLabel,
        optionText: o.optionText,
        isCorrect: o.isCorrect
      }))
    });
  }

  async function saveEdit(id) {
    try {
      await QuestionService.updateQuestion(id, editForm);
      setEditingId(null);
      loadPending();
    } catch (err) {
      alert(`Failed to save edits: ${err.message}`);
    }
  }

  return (
    <M3Layout
      title="Pending Question Review Queue"
      subtitle="Review, edit, and approve AI-generated questions before they enter live student assessments"
    >
      <div className="max-w-5xl space-y-6">
        {loading ? (
          <M3Spinner message="Loading pending questions…" />
        ) : error ? (
          <div className="card p-6 bg-rose-50 border-rose-200 text-rose-700 text-sm">
            {error}
          </div>
        ) : questions.length === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <span className="text-4xl block mb-2">🎉</span>
            <p className="font-bold text-slate-700">All caught up!</p>
            <p className="text-xs mt-1">There are no pending questions waiting for review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {questions.length} Question(s) Pending Review
              </span>
            </div>

            {questions.map((q) => {
              const isEditing = editingId === q.id;

              return (
                <div key={q.id} className="card border-amber-200 bg-white shadow-sm space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      <DifficultyBadge difficulty={q.difficulty} />
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {q.subject}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{q.topic}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        Source: {q.source}
                      </span>
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(q)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(q.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                        >
                          ✗ Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(q.id)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-lg transition-all"
                        >
                          ✓ Approve for Assessments
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Body: Editing or Normal */}
                  {isEditing ? (
                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Question Text
                        </label>
                        <textarea
                          rows="2"
                          value={editForm.questionText}
                          onChange={(e) => setEditForm({ ...editForm, questionText: e.target.value })}
                          className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                        />
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {editForm.options.map((opt, i) => (
                          <div key={opt.optionLabel} className="space-y-1">
                            <label className="text-xs font-bold text-slate-600">
                              Option {opt.optionLabel} {opt.isCorrect && '★ Correct'}
                            </label>
                            <input
                              type="text"
                              value={opt.optionText}
                              onChange={(e) => {
                                const newOpts = [...editForm.options];
                                newOpts[i].optionText = e.target.value;
                                setEditForm({ ...editForm, options: newOpts });
                              }}
                              className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Explanation */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Explanation
                        </label>
                        <textarea
                          rows="2"
                          value={editForm.explanation}
                          onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                          className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(q.id)}
                          className="btn-primary px-4 py-1.5 text-xs"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900">{q.questionText}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt) => (
                          <div
                            key={opt.optionLabel}
                            className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                              opt.isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="w-5 h-5 rounded bg-white/80 font-bold flex items-center justify-center shrink-0">
                              {opt.optionLabel}
                            </span>
                            <span className="flex-1">{opt.optionText}</span>
                            {opt.isCorrect && (
                              <span className="text-emerald-600 font-bold text-xs">✓ Correct</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">Explanation:</span> {q.explanation}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rejection Modal */}
        {rejectingId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="font-bold text-slate-900 text-base">Reject Question</h3>
              <p className="text-xs text-slate-500">
                Please provide a reason. Rejected questions are permanently kept out of student assessments.
              </p>
              <textarea
                rows="3"
                placeholder="e.g., Factual error, poor distractors, out of syllabus…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim()}
                  onClick={() => handleReject(rejectingId)}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </M3Layout>
  );
}
