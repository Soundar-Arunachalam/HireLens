import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NavBar } from '../components/layout/NavBar';
import { Spinner } from '../components/shared/Spinner';
import { api } from '../api';
import { fmtDate } from '../constants';
import { UserStats } from '../types';

export function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<UserStats>('/users/me/stats').then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <div className="page">
        {loading ? <div className="loading-center"><Spinner sz={22}/> Loading profile…</div> : (
          <div className="profile-grid">
            <div>
              <div className="profile-card">
                <div className="p-avatar">{user?.username[0].toUpperCase()}</div>
                <div className="p-name">{user?.username} {user?.is_admin && <span className="badge badge-easy">ADMIN</span>}</div>
                <div className="p-email">{user?.email}</div>
                {user?.created_at && <div className="p-joined">Joined {fmtDate(user.created_at)}</div>}
              </div>
              {stats && (
                <div className="profile-card">
                  <p className="section-label mt8">Difficulty Breakdown</p>
                  <div className="diff-progress mt12">
                    {[{ key: 'easy', label: 'Easy', solved: stats.easy_solved }, { key: 'medium', label: 'Medium', solved: stats.medium_solved }, { key: 'hard', label: 'Hard', solved: stats.hard_solved }].map(({ key, label, solved }) => (
                      <div key={key} className="diff-row"><span className={`diff-label badge badge-${key}`}>{label}</span><div className="diff-track"><div className={`diff-fill ${key}`} style={{ width: stats.total_problems > 0 ? `${(solved / stats.total_problems) * 100}%` : '0%' }} /></div><span className="diff-count">{solved}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {stats && (
              <div>
                <div className="stats-row">
                  <div className="stat-card"><div className="stat-num">{stats.problems_solved}</div><div className="stat-lbl">Solved</div></div>
                  <div className="stat-card"><div className="stat-num">{stats.total_submissions}</div><div className="stat-lbl">Submissions</div></div>
                  <div className="stat-card"><div className="stat-num">{stats.acceptance_rate}%</div><div className="stat-lbl">Acceptance</div></div>
                </div>
                <div className="profile-card">
                  <p className="section-label">Overall Progress</p>
                  <div className="prog-center mt12">
                    <div className="prog-big"><div className="prog-big-num">{stats.problems_solved}</div><div className="prog-big-sub">/ {stats.total_problems} problems</div></div>
                    <div style={{ flex: 1 }}>
                      <div className="prog-header"><span>Progress</span><span>{stats.total_problems > 0 ? `${Math.round((stats.problems_solved / stats.total_problems) * 100)}%` : '0%'}</span></div>
                      <div className="prog-track"><div className="prog-fill" style={{ width: stats.total_problems > 0 ? `${(stats.problems_solved / stats.total_problems) * 100}%` : '0%' }} /></div>
                      <div className="mt12 muted" style={{ fontSize: '.8rem', lineHeight: 1.8 }}><div>✓ {stats.accepted_submissions} accepted submissions</div><div>✗ {stats.total_submissions - stats.accepted_submissions} wrong / other</div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
