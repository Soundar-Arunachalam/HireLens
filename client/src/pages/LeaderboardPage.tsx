import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NavBar } from '../components/layout/NavBar';
import { Spinner } from '../components/shared/Spinner';
import { api } from '../api';
import { LeaderboardEntry } from '../types';

export function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<LeaderboardEntry[]>('/leaderboard').then(setBoard).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <div className="page">
        <h1 className="page-title">Global Leaderboard</h1>
        <p className="page-subtitle">Top problem solvers ranked by distinct accepted problems.</p>
        
        {loading ? <div className="loading-center"><Spinner sz={22}/> Loading leaderboard…</div> : (
          <>
            {board.length >= 3 && (
              <div className="podium-container">
                <div className="podium-item rank-2">
                  <div className="podium-avatar">{board[1].username[0].toUpperCase()}</div>
                  <div className="podium-bar">2</div>
                  <div className="podium-name mt8">{board[1].username}</div>
                  <div className="podium-score">{board[1].problems_solved} solved</div>
                </div>
                <div className="podium-item rank-1">
                  <div className="podium-avatar">{board[0].username[0].toUpperCase()}</div>
                  <div className="podium-bar">1</div>
                  <div className="podium-name mt8">{board[0].username}</div>
                  <div className="podium-score">{board[0].problems_solved} solved</div>
                </div>
                <div className="podium-item rank-3">
                  <div className="podium-avatar">{board[2].username[0].toUpperCase()}</div>
                  <div className="podium-bar">3</div>
                  <div className="podium-name mt8">{board[2].username}</div>
                  <div className="podium-score">{board[2].problems_solved} solved</div>
                </div>
              </div>
            )}
            
            <table className="lb-table mt16">
              <thead><tr><th style={{width:60}}>Rank</th><th>User</th><th>Solved</th><th>Easy</th><th>Medium</th><th>Hard</th><th>Avg Runtime</th><th>Acceptance</th></tr></thead>
              <tbody>
                {board.map(b => (
                  <tr key={b.user_id} className={user?.id === b.user_id ? 'me' : ''}>
                    <td>
                      {b.rank <= 3 ? <span className={`rank-badge r${b.rank}`}>{b.rank}</span> : <span className="muted fw700" style={{paddingLeft:10}}>{b.rank}</span>}
                    </td>
                    <td className="fw700">{b.username} {user?.id === b.user_id && <span className="muted2" style={{fontSize:'.75rem'}}>(You)</span>}</td>
                    <td className="fw700 color-accent">{b.problems_solved}</td>
                    <td className="muted">{b.easy_solved}</td>
                    <td className="muted">{b.medium_solved}</td>
                    <td className="muted">{b.hard_solved}</td>
                    <td className="muted mono">{b.avg_runtime_ms ? `${b.avg_runtime_ms.toFixed(0)} ms` : '—'}</td>
                    <td className="muted">{b.acceptance_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
