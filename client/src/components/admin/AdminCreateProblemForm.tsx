import React, { useState } from 'react';
import { Spinner } from '../shared/Spinner';
import { api } from '../../api';
import { Difficulty } from '../../types';

const EMPTY_PROBLEM = {
  title: '', slug: '', description: '',
  problem_type: 'coding' as 'coding' | 'design',
  difficulty: 'easy' as Difficulty,
  tags: '', constraints: '',
  time_limit_ms: 2000, memory_limit_mb: 256,
  is_published: true,
  examples: [{ input: '', output: '', explanation: '' }],
  hidden_cases: [{ input: '', output: '' }],
};

export function AdminCreateProblemForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_PROBLEM });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const setF = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const addExample = () => setF('examples', [...form.examples, { input: '', output: '', explanation: '' }]);
  const removeExample = (i: number) => setF('examples', form.examples.filter((_, idx) => idx !== i));
  const setExample = (i: number, k: string, v: string) =>
    setF('examples', form.examples.map((ex, idx) => idx === i ? { ...ex, [k]: v } : ex));

  const addCase = () => setF('hidden_cases', [...form.hidden_cases, { input: '', output: '' }]);
  const removeCase = (i: number) => setF('hidden_cases', form.hidden_cases.filter((_, idx) => idx !== i));
  const setCase = (i: number, k: string, v: string) =>
    setF('hidden_cases', form.hidden_cases.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || form.title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: form.description.trim(),
        problem_type: form.problem_type,
        difficulty: form.difficulty,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        constraints: form.constraints.split('\n').map(c => c.trim()).filter(Boolean),
        time_limit_ms: Number(form.time_limit_ms),
        memory_limit_mb: Number(form.memory_limit_mb),
        is_published: form.is_published,
        examples: form.examples.filter(e => e.input || e.output),
        hidden_cases: form.problem_type === 'coding'
          ? form.hidden_cases.filter(c => c.input || c.output)
          : [],
      };
      await api('/admin/problems', { method: 'POST', body: JSON.stringify(payload) });
      setOk(`✓ "${payload.title}" created!`);
      setForm({ ...EMPTY_PROBLEM });
      onCreated();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const inputCls = 'form-input';
  const labelCls = 'form-label';

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {err && <div className="form-error">{err}</div>}
      {ok  && <div style={{ color: 'var(--ac)', padding: '8px 12px', background: 'var(--ac-bg)', borderRadius: 8 }}>{ok}</div>}

      {/* Row 1: Title + Type */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
        <div className="form-group">
          <label className={labelCls}>Title *</label>
          <input className={inputCls} required value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Design a URL Shortener" />
        </div>
        <div className="form-group">
          <label className={labelCls}>Type *</label>
          <select className={inputCls} value={form.problem_type} onChange={e => setF('problem_type', e.target.value)}>
            <option value="coding">💻 Coding</option>
            <option value="design">🎨 Design</option>
          </select>
        </div>
      </div>

      {/* Row 2: Slug + Difficulty */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className={labelCls}>Slug (auto-generated if blank)</label>
          <input className={inputCls} value={form.slug} onChange={e => setF('slug', e.target.value)} placeholder="two-sum" />
        </div>
        <div className="form-group">
          <label className={labelCls}>Difficulty *</label>
          <select className={inputCls} value={form.difficulty} onChange={e => setF('difficulty', e.target.value as Difficulty)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className={labelCls}>Description *</label>
        <textarea className={inputCls} rows={5} required value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Describe the problem clearly..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
      </div>

      {/* Tags + Constraints */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className={labelCls}>Tags (comma-separated)</label>
          <input className={inputCls} value={form.tags} onChange={e => setF('tags', e.target.value)} placeholder="array, hash-map, hld" />
        </div>
        <div className="form-group">
          <label className={labelCls}>Constraints (one per line)</label>
          <textarea className={inputCls} rows={2} value={form.constraints} onChange={e => setF('constraints', e.target.value)} placeholder={"1 ≤ n ≤ 10⁵\n-10⁹ ≤ nums[i] ≤ 10⁹"} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      </div>

      {/* Time/Memory limits — only meaningful for coding */}
      {form.problem_type === 'coding' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className={labelCls}>Time Limit (ms)</label>
            <input className={inputCls} type="number" min={100} value={form.time_limit_ms} onChange={e => setF('time_limit_ms', e.target.value)} />
          </div>
          <div className="form-group">
            <label className={labelCls}>Memory Limit (MB)</label>
            <input className={inputCls} type="number" min={16} value={form.memory_limit_mb} onChange={e => setF('memory_limit_mb', e.target.value)} />
          </div>
        </div>
      )}

      {/* Examples */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className={labelCls} style={{ marginBottom: 0 }}>Examples</label>
          <button type="button" className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: '.8rem' }} onClick={addExample}>+ Add</button>
        </div>
        {form.examples.map((ex, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input className={inputCls} placeholder="Input" value={ex.input} onChange={e => setExample(i, 'input', e.target.value)} />
            <input className={inputCls} placeholder="Output" value={ex.output} onChange={e => setExample(i, 'output', e.target.value)} />
            <input className={inputCls} placeholder="Explanation (optional)" value={ex.explanation} onChange={e => setExample(i, 'explanation', e.target.value)} />
            <button type="button" className="btn btn-ghost" style={{ padding: '0 8px', color: 'var(--wa)' }} onClick={() => removeExample(i)} disabled={form.examples.length === 1}>✕</button>
          </div>
        ))}
      </div>

      {/* Hidden test cases — only for coding problems */}
      {form.problem_type === 'coding' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className={labelCls} style={{ marginBottom: 0 }}>Hidden Test Cases</label>
            <button type="button" className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: '.8rem' }} onClick={addCase}>+ Add</button>
          </div>
          {form.hidden_cases.map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 8 }}>
              <input className={inputCls} placeholder="Input" value={c.input} onChange={e => setCase(i, 'input', e.target.value)} />
              <input className={inputCls} placeholder="Expected Output" value={c.output} onChange={e => setCase(i, 'output', e.target.value)} />
              <button type="button" className="btn btn-ghost" style={{ padding: '0 8px', color: 'var(--wa)' }} onClick={() => removeCase(i)} disabled={form.hidden_cases.length === 1}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Published toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" id="pub" checked={form.is_published} onChange={e => setF('is_published', e.target.checked)} style={{ width: 16, height: 16 }} />
        <label htmlFor="pub" className={labelCls} style={{ marginBottom: 0, cursor: 'pointer' }}>Publish immediately</label>
      </div>

      <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start', minWidth: 140 }}>
        {busy ? <Spinner sz={14} /> : '+ Create Problem'}
      </button>
    </form>
  );
}
