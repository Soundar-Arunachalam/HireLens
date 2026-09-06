import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NavBar } from '../components/layout/NavBar';
import { Spinner } from '../components/shared/Spinner';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ReplayModal } from '../components/workspace/ReplayModal';
import { api } from '../api';
import { fmtDate } from '../constants';
import { SubItem } from '../types';

export function SubmissionsPage() {
  const nav = useNavigate();
  const [subs, setSubs] = useState<SubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayId, setReplayId] = useState<number | null>(null);

  useEffect(() => {
    api<SubItem[]>('/submissions').then(setSubs).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      {replayId && <ReplayModal subId={replayId} onClose={() => setReplayId(null)} />}
      <div className="page">
        <h1 className="page-title">My Submissions</h1>
        <p className="page-subtitle">Complete history of all your submissions.</p>
        {loading ? <div className="loading-center"><Spinner sz={22}/> Loading…</div> : subs.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>No submissions yet.</p><Link to="/" className="btn btn-primary mt16">Browse Problems</Link></div>
        ) : (
          <table className="sub-table">
            <thead><tr><th>#</th><th>Problem</th><th>Status</th><th>Language</th><th>Runtime</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} onClick={() => nav(`/problems/${s.problem_id}`)}>
                  <td className="muted">{s.id}</td>
                  <td><Link to={`/problems/${s.problem_id}`} className="fw700" onClick={e => e.stopPropagation()}>Problem #{s.problem_id}</Link></td>
                  <td><StatusBadge status={s.status}/></td>
                  <td className="muted mono">{s.language}</td>
                  <td className="muted">{s.runtime_ms != null ? `${s.runtime_ms.toFixed(0)} ms` : '—'}</td>
                  <td className="muted">{fmtDate(s.created_at)}</td>
                  <td><button className="btn btn-ghost" style={{padding:'3px 8px'}} onClick={e => { e.stopPropagation(); setReplayId(s.id); }}>▶ Replay</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
