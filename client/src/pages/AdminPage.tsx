import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/layout/NavBar';
import { Spinner } from '../components/shared/Spinner';
import { DiffBadge } from '../components/shared/DiffBadge';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ReplayModal } from '../components/workspace/ReplayModal';
import { WhiteboardViewer } from '../components/workspace/WhiteboardViewer';
import { AdminCreateProblemForm } from '../components/admin/AdminCreateProblemForm';
import { api } from '../api';
import { fmtDate } from '../constants';
import { AdminPlatformStats, AdminUserItem, AdminProblem, SubResp } from '../types';

export function AdminPage() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [tab, setTab] = useState<'dash'|'users'|'probs'|'subs'|'create'>('dash');
  const [loading, setLoading] = useState(true);
  const [replayId, setReplayId] = useState<number | null>(null);
  const [viewingWbSub, setViewingWbSub] = useState<Record<string, unknown> | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [st, us, pr, su] = await Promise.all([
        api<AdminPlatformStats>('/admin/stats'),
        api<AdminUserItem[]>('/admin/users'),
        api<AdminProblem[]>('/admin/problems?include_unpublished=true'),
        api<any[]>('/admin/submissions?limit=100'),
      ]);
      setStats(st); setUsers(us); setProblems(pr); setSubs(su);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const toggleAdmin = async (id: number) => {
    try { await api(`/admin/users/${id}/toggle-admin`, { method: 'PUT' }); loadAll(); } catch(e:any) { alert(e.message); }
  };

  const deleteProblem = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This will also delete all its submissions.`)) return;
    try { await api(`/admin/problems/${id}`, { method: 'DELETE' }); loadAll(); } catch(e:any) { alert(e.message); }
  };

  const viewWbSub = async (id: number) => {
    try {
      const sub = await api<SubResp>(`/submissions/${id}`);
      if (sub.whiteboard_data) setViewingWbSub(sub.whiteboard_data);
      else alert('No whiteboard data for this submission.');
    } catch {}
  };

  if (loading) return <><NavBar /><div className="loading-center"><Spinner sz={24}/> Loading Admin...</div></>;

  return (
    <>
      <NavBar />
      {replayId && <ReplayModal subId={replayId} onClose={() => setReplayId(null)} />}
      {viewingWbSub && <WhiteboardViewer data={viewingWbSub} onClose={() => setViewingWbSub(null)} />}
      <div className="page" style={{maxWidth:1400}}>
        <div className="flex-center" style={{justifyContent:'space-between', marginBottom:20}}>
          <h1 className="page-title">Admin Dashboard</h1>
          <div className="res-tabs" style={{borderBottom:'none', background:'var(--surface)', borderRadius:8, padding:'4px 8px'}}>
            <div className={`res-tab${tab==='dash'?' on':''}`} onClick={()=>setTab('dash')}>Overview</div>
            <div className={`res-tab${tab==='probs'?' on':''}`} onClick={()=>setTab('probs')}>Problems ({problems.length})</div>
            <div className={`res-tab${tab==='create'?' on':''}`} onClick={()=>setTab('create')} style={{color:'var(--ac)'}}>+ Create Problem</div>
            <div className={`res-tab${tab==='users'?' on':''}`} onClick={()=>setTab('users')}>Users ({users.length})</div>
            <div className={`res-tab${tab==='subs'?' on':''}`} onClick={()=>setTab('subs')}>Global Submissions</div>
          </div>
        </div>

        {tab === 'dash' && stats && (
          <div className="stats-row">
            <div className="stat-card"><div className="stat-num">{stats.total_users}</div><div className="stat-lbl">Registered Users</div></div>
            <div className="stat-card"><div className="stat-num">{stats.total_problems}</div><div className="stat-lbl">Total Problems</div></div>
            <div className="stat-card"><div className="stat-num">{stats.total_submissions}</div><div className="stat-lbl">Submissions</div></div>
          </div>
        )}

        {tab === 'create' && (
          <div style={{background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', padding:28}}>
            <h2 style={{marginBottom:24, fontSize:'1.1rem', fontWeight:700}}>Create New Problem</h2>
            <AdminCreateProblemForm onCreated={() => { loadAll(); setTab('probs'); }} />
          </div>
        )}

        {tab === 'probs' && (
          <table className="lb-table">
            <thead><tr><th style={{width:50}}>ID</th><th>Title</th><th style={{width:80}}>Type</th><th style={{width:90}}>Difficulty</th><th>Tags</th><th style={{width:90}}>Published</th><th style={{width:100}}>Actions</th></tr></thead>
            <tbody>
              {problems.map(p => (
                <tr key={p.id}>
                  <td className="muted">{p.id}</td>
                  <td className="fw700"><Link to={`/problems/${p.id}`} style={{color:'var(--fg)'}}>{p.title}</Link></td>
                  <td><span className={`badge badge-type-${p.problem_type ?? 'coding'}`}>{p.problem_type === 'design' ? '🎨 Design' : '💻 Coding'}</span></td>
                  <td><DiffBadge difficulty={p.difficulty} /></td>
                  <td className="muted2" style={{fontSize:'.78rem'}}>{p.tags.join(', ')}</td>
                  <td>{p.is_published ? <span className="badge badge-accepted">Yes</span> : <span className="badge badge-compilation_error">No</span>}</td>
                  <td>
                    <button className="btn btn-ghost" style={{padding:'2px 8px', color:'var(--wa)', fontSize:'.8rem'}} onClick={() => deleteProblem(p.id, p.title)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'users' && (
          <table className="lb-table">
            <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Admin</th><th>Submissions</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="muted">{u.id}</td>
                  <td className="fw700">{u.username}</td>
                  <td className="muted2">{u.email}</td>
                  <td>{u.is_admin ? <span className="badge badge-accepted">YES</span> : <span className="badge badge-easy" style={{opacity:0.5}}>NO</span>}</td>
                  <td>{u.submission_count}</td>
                  <td className="muted">{fmtDate(u.created_at)}</td>
                  <td><button className="btn btn-ghost" style={{padding:'4px 8px'}} onClick={() => toggleAdmin(u.id)}>Toggle Admin</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'subs' && (
          <table className="sub-table">
            <thead><tr><th>ID</th><th>User</th><th>Problem</th><th>Status</th><th>Lang</th><th>Date</th><th>View</th></tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td className="muted">{s.id}</td>
                  <td className="fw700">{s.username}</td>
                  <td>{s.problem_title}</td>
                  <td><StatusBadge status={s.status}/></td>
                  <td className="muted mono">{s.language}</td>
                  <td className="muted">{fmtDate(s.created_at)}</td>
                  <td>
                    {s.language === 'design'
                      ? <button className="btn btn-ghost" style={{padding:'2px 8px'}} onClick={() => viewWbSub(s.id)}>🎨 View</button>
                      : <button className="btn btn-ghost" style={{padding:'2px 8px'}} onClick={() => setReplayId(s.id)}>▶ Play</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
