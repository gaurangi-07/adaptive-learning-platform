/**
 * @file AIQuestionGeneratorPage.jsx
 * @description AI-Powered MCQ Generator for teachers and admins (Part 4).
 * Generates MCQs using either OpenAI API or local Mock AI provider.
 * Automatically validates output, checks for duplicates, and saves valid MCQs as PENDING.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import M3Layout from '../components/M3Layout';
import DifficultyBadge from '../components/DifficultyBadge';
import { QuestionService } from '../services/questionService';

const DEFAULT_SUBJECTS = ['Mathematics', 'Science', 'English', 'Computer Science'];
const COMMON_TOPICS = {
  Mathematics: ['Algebra', 'Geometry', 'Trigonometry', 'Arithmetic', 'Statistics'],
  Science: ['Physics', 'Chemistry', 'Biology'],
  English: ['Grammar', 'Vocabulary', 'Reading Comprehension'],
  'Computer Science': ['Algorithms', 'Data Structures', 'Databases', 'Networking']
};

export default function AIQuestionGeneratorPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    subject: 'Mathematics',
    topic: 'Algebra',
    difficulty: 'Medium',
    count: 3
  });

  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const availableTopics = COMMON_TOPICS[form.subject] || [];
  const activeTopic = customTopic.trim() || form.topic;

  async function handleGenerate(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await QuestionService.generateQuestions({
        subject: form.subject,
        topic: activeTopic,
        difficulty: form.difficulty,
        count: Number(form.count)
      });
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Failed to generate questions. Check server logs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <M3Layout
      title="AI Question Generator"
      subtitle="Generate curriculum-aligned MCQs with automated validation and duplicate checks"
    >
      <div className="max-w-4xl space-y-6">
        {/* Form Card */}
        <div className="card shadow-md">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Subject
                </label>
                <select
                  value={form.subject}
                  onChange={(e) => {
                    setForm({ ...form, subject: e.target.value, topic: COMMON_TOPICS[e.target.value]?.[0] || '' });
                    setCustomTopic('');
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {DEFAULT_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Topic
                </label>
                <div className="space-y-2">
                  <select
                    value={form.topic}
                    disabled={Boolean(customTopic)}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {availableTopics.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Or enter custom topic…"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setForm({ ...form, difficulty: diff })}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.difficulty === diff
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question count */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Number of Questions
                </label>
                <div className="flex gap-2">
                  {[1, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, count: n })}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.count === n
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                <strong>Generation Error:</strong> {error}
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generating Questions…
                </span>
              ) : (
                <span>⚡ Generate {form.count} Question(s) with AI</span>
              )}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-4">
            <div className="card bg-emerald-50 border-emerald-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-emerald-900 text-base">Generation Successful!</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {result.savedCount} question(s) saved with status <span className="font-bold">PENDING</span>.
                    Provider used: <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">{result.provider}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/module3/pending')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-emerald-700 transition-all"
                >
                  Review in Pending Queue →
                </button>
              </div>

              {result.duplicatesSkipped > 0 && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ⚠️ {result.duplicatesSkipped} exact duplicate(s) were automatically skipped.
                </p>
              )}
            </div>

            {/* Questions preview */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Generated MCQs Preview</h3>
              {result.questions.map((q, idx) => (
                <div key={q.id || idx} className="card border-slate-200">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <DifficultyBadge difficulty={q.difficulty} />
                      <span className="text-xs text-slate-400 font-medium">{q.topic}</span>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                      Pending Review
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-900 mb-3">{q.questionText}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt) => (
                      <div
                        key={opt.optionLabel}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          opt.isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="w-5 h-5 rounded bg-white/80 font-bold flex items-center justify-center shrink-0">
                          {opt.optionLabel}
                        </span>
                        <span>{opt.optionText}</span>
                        {opt.isCorrect && <span className="ml-auto text-emerald-600 font-bold">✓</span>}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Explanation:</span> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </M3Layout>
  );
}
