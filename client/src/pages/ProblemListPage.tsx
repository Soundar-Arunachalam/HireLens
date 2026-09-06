import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NavBar } from '../components/layout/NavBar';
import { Spinner } from '../components/shared/Spinner';
import { DiffBadge } from '../components/shared/DiffBadge';
import { api } from '../api';
import { Problem, SubItem } from '../types';

export function ProblemListPage() {
  const { isAuth } = useAuth();
  const nav = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading,  setLoading ] = useState(true);
  const [error,    setError   ] = useState<string | null>(null);
  const [search,   setSearch  ] = useState('');
  const [diff,     setDiff    ] = useState<string>('all');
  const [activeTag,setActiveTag] = useState<string | null>(null);
  const [solvedIds,setSolvedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true); setError(null);
    const p = new URLSearchParams();
    if (diff !== 'all') p.set('difficulty', diff);
    if (search.trim()) p.set('q', search.trim());
    if (activeTag)     p.set('tag', activeTag);
    api<Problem[]>(`/problems?${p}`)
      .then(setProblems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [diff, search, activeTag]);

  useEffect(() => {
    if (!isAuth) { setSolvedIds(new Set()); return; }
    api<SubItem[]>('/submissions')
      .then(subs => setSolvedIds(new Set(subs.filter(s => s.status === 'accepted').map(s => s.problem_id))))
      .catch(() => {});
  }, [isAuth]);

  const allTags = useMemo(() => {
    const s = new Set<string>(); problems.forEach(p => p.tags.forEach(t => s.add(t))); return Array.from(s).sort();
  }, [problems]);

  const DIFFS = [{ key: 'all', label: 'All' }, { key: 'easy', label: 'Easy' }, { key: 'medium', label: 'Medium' }, { key: 'hard', label: 'Hard' }];

  return (
    <>
      <NavBar />
      <div className="page">
        <div className="list-controls">
          <input className="search-input" type="text" placeholder="Search problems…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="filter-pills">
            {DIFFS.map(d => (
              <button key={d.key} className={`pill ${d.key}${diff === d.key ? ' on' : ''}`} onClick={() => setDiff(d.key)}>{d.label}</button>
            ))}
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="tag-cloud">
            {allTags.map(t => (
              <button key={t} className={`tag${activeTag === t ? ' on' : ''}`} onClick={() => setActiveTag(at => at === t ? null : t)}>{t}</button>
            ))}
          </div>
        )}
        {loading ? <div className="loading-center"><Spinner sz={22}/> Loading problems…</div> : error ? (
          <div className="empty-state"><div className="empty-icon">⚠️</div><p>{error}</p></div>
        ) : problems.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔍</div><p>No problems match your filters.</p></div>
        ) : (
          <table className="prob-table">
            <thead><tr><th style={{ width: 50 }}>#</th><th>Title</th><th>Tags</th><th style={{ width: 80 }}>Type</th><th style={{ width: 100 }}>Difficulty</th></tr></thead>
            <tbody>
              {problems.map(p => (
                <tr key={p.id} onClick={() => nav(`/problems/${p.id}`)}>
                  <td className="row-num">{p.id}</td>
                  <td><span className="row-title">{solvedIds.has(p.id) && <span className="solved-mark">✓</span>}{p.title}</span></td>
                  <td>
                    <div className="tag-cloud" style={{ margin: 0 }}>
                      {p.tags.slice(0, 4).map(t => (
                        <button key={t} className={`tag${activeTag === t ? ' on' : ''}`} onClick={e => { e.stopPropagation(); setActiveTag(at => at === t ? null : t); }}>{t}</button>
                      ))}
                    </div>
                  </td>
                  <td><span className={`badge badge-type-${p.problem_type ?? 'coding'}`}>{p.problem_type === 'design' ? '🎨 Design' : '💻 Coding'}</span></td>
                  <td><DiffBadge difficulty={p.difficulty} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
