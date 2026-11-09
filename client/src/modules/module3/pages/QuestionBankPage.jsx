/**
 * @file QuestionBankPage.jsx
 * @description Question Bank Management Page for teachers/admins (Part 7).
 * Features:
 *   - Search by text
 *   - Filter by subject, topic, difficulty, and approval status
 *   - Detail view
 *   - Edit question modal
 *   - Delete question with confirmation
 *   - Status change (Approve, Reject, Archive)
 */

import { useState, useEffect } from 'react';
import M3Layout from '../components/M3Layout';
import StatusBadge from '../components/StatusBadge';
import DifficultyBadge from '../components/DifficultyBadge';
import M3Spinner from '../components/M3Spinner';
import { QuestionService } from '../services/questionService';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Metadata dropdowns
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);

  // Selected for viewing/editing
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Load metadata
  useEffect(() => {
    QuestionService.getSubjects()
      .then((res) => setSubjects(res.data.subjects || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    QuestionService.getTopics(selectedSubject)
      .then((res) => setTopics(res.data.topics || []))
      .catch(() => {});
  }, [selectedSubject]);

  // Load questions
  async function loadQuestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await QuestionService.listQuestions({
        search: search || undefined,
        subject: selectedSubject || undefined,
        topic: selectedTopic || undefined,
        difficulty: selectedDifficulty || undefined,
        status: selectedStatus || undefined,
        page,
        limit: 10
      });
      setQuestions(res.data.questions || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalCount(res.data.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, [selectedSubject, selectedTopic, selectedDifficulty, selectedStatus, page]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    loadQuestions();
  }

  async function handleStatusChange(id, status, reason = null) {
    try {
      await QuestionService.changeStatus(id, { status, rejectionReason: reason });
      setShowRejectModal(null);
      setRejectionReason('');
      loadQuestions();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return;
    try {
      await QuestionService.deleteQuestion(id);
      loadQuestions();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      await QuestionService.updateQuestion(editingQuestion.id, {
        questionText: editingQuestion.questionText,
        explanation: editingQuestion.explanation,
        difficulty: Number(editingQuestion.difficulty),
        options: editingQuestion.options.map(o => ({
          optionLabel: o.optionLabel,
          optionText: o.optionText,
          isCorrect: o.optionLabel === editingQuestion.correctOption
        })),
        correctOption: editingQuestion.correctOption
      });
      setEditingQuestion(null);
      loadQuestions();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  }

  return (
    <M3Layout
      title="Question Bank"
      subtitle={`Browse, search, edit, and curate questions (${totalCount} total)`}
    >
      <div className="space-y-6 max-w-6xl">
        {/* Filters bar */}
        <div className="card space-y-4">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="🔍 Search question statement…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button type="submit" className="btn-primary text-xs px-5">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); loadQuestions(); }}
                className="btn-secondary text-xs px-3"
              >
                Clear
              </button>
            )}
          </form>

          {/* Filter dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <select
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setPage(1); }}
              className="p-2.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => { setSelectedTopic(e.target.value); setPage(1); }}
              className="p-2.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Topics</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => { setSelectedDifficulty(e.target.value); setPage(1); }}
              className="p-2.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Difficulties</option>
              <option value="1">Easy (1)</option>
              <option value="2">Medium (2)</option>
              <option value="3">Hard (3)</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="p-2.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Question List */}
        {loading ? (
          <M3Spinner message="Loading question bank…" />
        ) : error ? (
          <div className="card p-6 text-center text-rose-600 bg-rose-50 border-rose-200 text-sm">
            {error}
          </div>
        ) : questions.length === 0 ? (
          <div className="card p-12 text-center text-slate-400">
            <span className="text-4xl block mb-2">📭</span>
            <p className="font-bold text-slate-700">No questions found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={q.status} />
                    <DifficultyBadge difficulty={q.difficulty} />
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {q.subject}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {q.topic}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {q.id.slice(0, 8)}…
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(JSON.parse(JSON.stringify(q)))}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all"
                      title="Edit question"
                    >
                      ✏️ Edit
                    </button>
                    {q.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(q.id, 'APPROVED')}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                        title="Approve question"
                      >
                        ✓ Approve
                      </button>
                    )}
                    {q.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => setShowRejectModal(q.id)}
                        className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all"
                        title="Reject question"
                      >
                        ✗ Reject
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Delete permanently"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <p className="text-sm font-semibold text-slate-900 mb-3">{q.questionText}</p>

                {/* Options grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id || opt.optionLabel}
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
                      {opt.isCorrect && <span className="text-emerald-600 font-bold">✓</span>}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Explanation:</span> {q.explanation}
                  </div>
                )}

                {/* Rejection notice */}
                {q.status === 'REJECTED' && q.rejectionReason && (
                  <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    <span className="font-bold">Rejection reason:</span> {q.rejectionReason}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary px-3 py-1.5 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary px-3 py-1.5 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingQuestion && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base">Edit Question</h3>
                <span className="text-xs font-mono text-slate-400">ID: {editingQuestion.id}</span>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Question Statement</label>
                  <textarea
                    rows="3"
                    value={editingQuestion.questionText}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                    required
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: Number(e.target.value) })}
                    className="p-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value={1}>1 - Easy</option>
                    <option value={2}>2 - Medium</option>
                    <option value={3}>3 - Hard</option>
                  </select>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Options (Select radio for correct answer)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {editingQuestion.options.map((opt, idx) => (
                      <div key={opt.optionLabel} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Option {opt.optionLabel}</span>
                          <label className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold cursor-pointer">
                            <input
                              type="radio"
                              name="editCorrectOption"
                              checked={editingQuestion.correctOption === opt.optionLabel}
                              onChange={() => setEditingQuestion({ ...editingQuestion, correctOption: opt.optionLabel })}
                              className="accent-emerald-600"
                            />
                            Correct
                          </label>
                        </div>
                        <input
                          type="text"
                          value={opt.optionText}
                          onChange={(e) => {
                            const newOpts = [...editingQuestion.options];
                            newOpts[idx].optionText = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: newOpts });
                          }}
                          className="w-full p-2 rounded-lg border border-slate-200 text-xs bg-white"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Explanation</label>
                  <textarea
                    rows="2"
                    value={editingQuestion.explanation}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="btn-secondary px-4 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary px-5 py-2 text-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="font-bold text-slate-900 text-base">Reject Question</h3>
              <p className="text-xs text-slate-500">
                Please provide a reason why this question is being rejected. This will be stored in the question's review history.
              </p>
              <textarea
                rows="3"
                placeholder="e.g., Ambiguous question phrasing, incorrect answer key, duplicate..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(null)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionReason.trim()}
                  onClick={() => handleStatusChange(showRejectModal, 'REJECTED', rejectionReason)}
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
