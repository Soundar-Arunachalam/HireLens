import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState, useRef
} from 'react';
import {
  Link, Navigate, NavLink, Route, Routes,
  useNavigate, useParams,
} from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './contexts/ThemeProvider';
// Use any for Excalidraw API ref since type paths differ between package versions
import './styles.css';

// SafeExcalidraw wrapper prevents "Canvas exceeds max size" by ensuring 
// the container has valid DOM dimensions before mounting the canvas
function SafeExcalidraw(props: any) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setReady(true);
          observer.disconnect();
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      {ready ? <Excalidraw {...props} /> : <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center'}}><Spinner sz={30}/></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type Language = 'python' | 'javascript' | 'cpp' | 'java';
type ProblemType = 'coding' | 'design';
type Difficulty = 'easy' | 'medium' | 'hard';
type Status =
  | 'accepted' | 'wrong_answer' | 'time_limit_exceeded'
  | 'runtime_error' | 'compilation_error' | 'submitted';

interface User { id: number; username: string; email: string; is_active: boolean; is_admin: boolean; created_at: string; }
interface ProblemExample { input: string; output: string; explanation?: string | null; }
interface Problem {
  id: number; title: string; slug: string; description: string;
  problem_type: ProblemType; difficulty: Difficulty; tags: string[];
  examples: ProblemExample[]; constraints: string[];
  time_limit_ms: number; memory_limit_mb: number;
  is_published: boolean; created_at: string; updated_at: string;
}
interface AdminProblem extends Problem { hidden_cases: { input: string; output: string }[]; }
interface EditorEvent { t: number; v: string; }
interface CaseResult {
  case_index: number; stdin: string; expected_output: string;
  stdout: string; stderr: string; compile_stderr?: string;
  exit_code: number | null; timed_out: boolean;
  compilation_failed: boolean; passed: boolean; duration_ms: number;
}
interface RunResp  { status: Status; summary: string; cases: CaseResult[]; }
interface SubResp  {
  id: number; problem_id: number; user_id: number; language: string;
  code: string; status: string; summary: string; runtime_ms: number | null;
  cases: CaseResult[]; editor_events: EditorEvent[];
  whiteboard_data?: Record<string, unknown> | null;
  created_at: string;
}
interface SubItem  { id: number; problem_id: number; language: string; status: string; runtime_ms: number | null; created_at: string; }
interface UserStats {
  total_problems: number; problems_solved: number;
  easy_solved: number; medium_solved: number; hard_solved: number;
  total_submissions: number; accepted_submissions: number; acceptance_rate: number;
}
interface LeaderboardEntry {
  rank: number; user_id: number; username: string; problems_solved: number;
  easy_solved: number; medium_solved: number; hard_solved: number;
  total_submissions: number; accepted_submissions: number;
  acceptance_rate: number; avg_runtime_ms: number | null;
}
interface AdminPlatformStats {
  total_users: number; total_problems: number; total_submissions: number;
  accepted_submissions: number; languages_used: Record<string, number>;
}
interface AdminUserItem {
  id: number; username: string; email: string; is_active: boolean;
  is_admin: boolean; created_at: string; submission_count: number;
}

interface AuthCtx { user: User | null; token: string | null; login(t:string,u:User):void; logout():void; isAuth:boolean; }

// ═══════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════

const API = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const tok = localStorage.getItem('ce_token');
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string,string> ?? {}) };
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = 'Request failed';
    try { const err = await res.json(); detail = err.detail || detail; } catch (e) {}
    throw new Error(detail);
  }
  return res.status === 204 ? (null as any) : res.json();
}

// ═══════════════════════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthCtx>(null!);
const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ce_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => { localStorage.removeItem('ce_token'); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((t: string, u: User) => {
    localStorage.setItem('ce_token', t);
    setToken(t); setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ce_token');
    setToken(null); setUser(null);
  }, []);

  if (loading) return null; // block rendering until auth loads

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const STATUS_META: Record<Status, { icon: string; label: string }> = {
  accepted:            { icon: '✓',  label: 'Accepted' },
  wrong_answer:        { icon: '✗',  label: 'Wrong Answer' },
  time_limit_exceeded: { icon: '⏱', label: 'Time Limit Exceeded' },
  runtime_error:       { icon: '💥', label: 'Runtime Error' },
  compilation_error:   { icon: '⚠', label: 'Compilation Error' },
  submitted:           { icon: '📐', label: 'Submitted' },
};

const LANGS: Record<Language, { label: string; monaco: string; starter: string }> = {
  python: {
    label: '🐍 Python 3',
    monaco: 'python',
    starter: `import sys\n\ndef solve():\n    data = sys.stdin.read().split()\n    # write your solution here\n    pass\n\nprint(solve())\n`,
  },
  javascript: {
    label: '⚡ JavaScript',
    monaco: 'javascript',
    starter: `const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\n\nfunction solve() {\n  // write your solution here\n}\n\nconsole.log(solve());\n`,
  },
  cpp: {
    label: '⚙️ C++ (GCC)',
    monaco: 'cpp',
    starter: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    // write your solution here\n    return 0;\n}\n`,
  },
  java: {
    label: '☕ Java',
    monaco: 'java',
    starter: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // write your solution here\n    }\n}\n`,
  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SMALL SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function Spinner({ sz = 14 }: { sz?: number }) {
  return <span className="spin" style={{ width: sz, height: sz, borderWidth: sz > 20 ? 3 : 2 }} />;
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as Status];
  return (
    <span className={`badge badge-${status}`}>
      {meta ? `${meta.icon} ${meta.label}` : status}
    </span>
  );
}

function DiffBadge({ difficulty }: { difficulty: string }) {
  return <span className={`badge badge-${difficulty}`}>{difficulty}</span>;
}

// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// NAVBAR & THEME
// ═══════════════════════════════════════════════════════════════════════

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <button className={`btn-icon ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light Theme">
        <Sun size={18} />
      </button>
      <button className={`btn-icon ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')} title="System Default">
        <Monitor size={18} />
      </button>
      <button className={`btn-icon ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark Theme">
        <Moon size={18} />
      </button>
    </div>
  );
}

function NavBar() {
  const { user, logout, isAuth } = useAuth();
  const nav = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">HL</span>
        HireLens
      </Link>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Problems</NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Leaderboard</NavLink>
        {isAuth && (
          <NavLink to="/submissions" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Submissions</NavLink>
        )}
        {user?.is_admin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} style={{ color: 'var(--wa)' }}>Admin</NavLink>
        )}
      </div>

      <div className="navbar-right">
        <ThemeToggle />
        {isAuth ? (
          <>
            <NavLink to="/profile" title={user?.username}>
              <div className="avatar">{user?.username[0].toUpperCase()}</div>
            </NavLink>
            <button className="btn btn-ghost" onClick={() => { logout(); nav('/'); }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn btn-ghost">Log in</Link>
            <Link to="/register" className="btn btn-primary">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUTH PAGES
// ═══════════════════════════════════════════════════════════════════════
// ... omitted for brevity in thought, but copying original with exact content ...
function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [err,  setErr ] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body = new URLSearchParams({ username: form.username, password: form.password });
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail ?? 'Login failed'); }
      const data = await res.json() as { access_token: string; user: User };
      login(data.access_token, data.user);
      nav('/');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <><NavBar /><div className="auth-page"><div className="auth-card">
      <h1>Welcome back</h1><p>Sign in to submit solutions and track your progress.</p>
      <form onSubmit={submit}>
        <div className="form-group"><label className="form-label">Username</label><input className="form-input" type="text" required value={form.username} onChange={e=>setForm({...form,username:e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary form-submit" type="submit" disabled={busy}>{busy ? <Spinner sz={14}/> : 'Sign in'}</button>
      </form>
      <div className="auth-footer">Don't have an account? <Link to="/register">Sign up</Link></div>
    </div></div></>
  );
}

function RegisterPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [err,  setErr ] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const data = await api<{ access_token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      login(data.access_token, data.user); nav('/');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <><NavBar /><div className="auth-page"><div className="auth-card">
      <h1>Create account</h1><p>Join your classmates and start practising competitive programming.</p>
      <form onSubmit={submit}>
        <div className="form-group"><label className="form-label">Username</label><input className="form-input" type="text" minLength={3} required value={form.username} onChange={e=>setForm({...form,username:e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
        <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" minLength={6} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
        {err && <div className="form-error">{err}</div>}
        <button className="btn btn-primary form-submit" type="submit" disabled={busy}>{busy ? <Spinner sz={14}/> : 'Create account'}</button>
      </form>
      <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
    </div></div></>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PROBLEM LIST PAGE
// ═══════════════════════════════════════════════════════════════════════

function ProblemListPage() {
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

// ═══════════════════════════════════════════════════════════════════════
// LEADERBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════

function LeaderboardPage() {
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

// ═══════════════════════════════════════════════════════════════════════
// REPLAY MODAL
// ═══════════════════════════════════════════════════════════════════════

function ReplayModal({ subId, onClose }: { subId: number; onClose: () => void }) {
  const { resolvedTheme } = useTheme();
  const [sub, setSub] = useState<SubResp | null>(null);
  const [err, setErr] = useState('');

  // Playback state — stored in refs to avoid stale closures in rAF
  const [displayIdx,    setDisplayIdx   ] = useState(0);
  const [displayMs,     setDisplayMs    ] = useState(0);
  const [playing,       setPlaying      ] = useState(false);
  const [speed,         setSpeed        ] = useState(1);

  const playingRef  = useRef(false);
  const speedRef    = useRef(1);
  const virtualMsRef = useRef(0);  // virtual playhead position in ms
  const wallStartRef = useRef(0);  // real wall-clock time when we last resumed
  const rafRef      = useRef<number | null>(null);

  useEffect(() => {
    api<SubResp>(`/submissions/${subId}`)
      .then(s => setSub(s))
      .catch(e => setErr(e.message));
  }, [subId]);

  const evs = sub?.editor_events ?? [];
  const totalMs = evs.length > 0 ? evs[evs.length - 1].t : 0;

  // Find the event index whose timestamp <= virtualMs
  const idxAtMs = useCallback((ms: number) => {
    if (evs.length === 0) return 0;
    let lo = 0, hi = evs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (evs[mid].t <= ms) lo = mid; else hi = mid - 1;
    }
    return lo;
  }, [evs]);

  // rAF loop — runs every frame while playing
  const tick = useCallback(() => {
    if (!playingRef.current) return;
    const now = performance.now();
    const elapsed = (now - wallStartRef.current) * speedRef.current;
    const newMs = Math.min(virtualMsRef.current + elapsed, totalMs);
    wallStartRef.current = now;
    virtualMsRef.current = newMs;

    const newIdx = idxAtMs(newMs);
    setDisplayIdx(newIdx);
    setDisplayMs(newMs);

    if (newMs >= totalMs) {
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [idxAtMs, totalMs]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const play = useCallback(() => {
    if (evs.length === 0) return;
    // Restart from beginning if at end
    if (virtualMsRef.current >= totalMs) {
      virtualMsRef.current = 0;
      setDisplayIdx(0);
      setDisplayMs(0);
    }
    playingRef.current = true;
    speedRef.current = speed;
    wallStartRef.current = performance.now();
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [evs.length, totalMs, speed, tick]);

  // Keep speedRef in sync
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      if (e.code === 'ArrowLeft')  { pause(); virtualMsRef.current = Math.max(0, virtualMsRef.current - 5000); const i = idxAtMs(virtualMsRef.current); setDisplayIdx(i); setDisplayMs(virtualMsRef.current); }
      if (e.code === 'ArrowRight') { pause(); virtualMsRef.current = Math.min(totalMs, virtualMsRef.current + 5000); const i = idxAtMs(virtualMsRef.current); setDisplayIdx(i); setDisplayMs(virtualMsRef.current); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing, pause, play, idxAtMs, totalMs]);

  // Cleanup on unmount
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  };

  const scrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    pause();
    const newMs = Number(e.target.value);
    virtualMsRef.current = newMs;
    setDisplayMs(newMs);
    setDisplayIdx(idxAtMs(newMs));
  };

  if (err) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="replay-modal" onClick={e => e.stopPropagation()}>
        <div className="replay-header"><h2>Error</h2><button className="btn-close" onClick={onClose}>×</button></div>
        <div className="replay-body" style={{padding:20, color:'var(--wa)'}}>{err}</div>
      </div>
    </div>
  );
  if (!sub) return <div className="modal-overlay" style={{display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner sz={36}/></div>;

  const currentCode = evs.length > 0 ? evs[displayIdx].v : sub.code;
  const progressPct = totalMs > 0 ? (displayMs / totalMs) * 100 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="replay-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="replay-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {playing && <span className="rec-dot" />}
            <h2>Replay — #{sub.id} <span className="muted" style={{ fontWeight: 400, fontSize: '.85rem' }}>({sub.language})</span></h2>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* Editor */}
        <div className="replay-body">
          <div className="replay-editor">
            <Editor
              language={LANGS[sub.language as Language]?.monaco || 'python'}
              theme={resolvedTheme === 'light' ? 'light' : 'vs-dark'}
              value={currentCode}
              options={{ readOnly: true, minimap: { enabled: false }, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, scrollBeyondLastLine: false }}
            />
          </div>

          {/* Controls */}
          <div className="replay-controls">
            {evs.length === 0 ? (
              <div className="muted" style={{ padding: '12px 0' }}>No editor events were recorded for this submission.</div>
            ) : (
              <>
                {/* Progress bar (clickable) */}
                <div className="progress-track" onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  const newMs = Math.round(pct * totalMs);
                  pause();
                  virtualMsRef.current = newMs;
                  setDisplayMs(newMs);
                  setDisplayIdx(idxAtMs(newMs));
                }}>
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                  <div className="progress-thumb" style={{ left: `${progressPct}%` }} />
                  {/* Event tick marks */}
                  {evs.map((ev, i) => (
                    <div key={i} className="progress-tick" style={{ left: `${(ev.t / totalMs) * 100}%` }} />
                  ))}
                </div>

                {/* Slider (hidden — drives scrubbing accessible alt) */}
                <input
                  type="range" className="replay-slider-hidden"
                  min={0} max={totalMs} step={100}
                  value={Math.round(displayMs)}
                  onChange={scrub}
                />

                {/* Controls row */}
                <div className="controls-row">
                  {/* Playback buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Skip back 5s */}
                    <button className="ctrl-btn" title="Back 5s (←)" onClick={() => {
                      pause(); const newMs = Math.max(0, virtualMsRef.current - 5000);
                      virtualMsRef.current = newMs; setDisplayMs(newMs); setDisplayIdx(idxAtMs(newMs));
                    }}>⏮</button>

                    {/* Play / Pause */}
                    <button className="ctrl-btn play-btn" title="Play/Pause (Space)" onClick={() => playing ? pause() : play()}>
                      {playing ? '⏸' : '▶'}
                    </button>

                    {/* Skip forward 5s */}
                    <button className="ctrl-btn" title="Forward 5s (→)" onClick={() => {
                      pause(); const newMs = Math.min(totalMs, virtualMsRef.current + 5000);
                      virtualMsRef.current = newMs; setDisplayMs(newMs); setDisplayIdx(idxAtMs(newMs));
                    }}>⏭</button>

                    {/* Restart */}
                    <button className="ctrl-btn" title="Restart" onClick={() => {
                      pause(); virtualMsRef.current = 0; setDisplayMs(0); setDisplayIdx(0);
                    }}>↩</button>

                    {/* Time */}
                    <span className="time-display mono">{formatMs(displayMs)} / {formatMs(totalMs)}</span>
                  </div>

                  {/* Speed + event count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="muted" style={{ fontSize: '.75rem' }}>Speed:</span>
                    {[0.5, 1, 2, 4, 8].map(s => (
                      <button key={s} className={`speed-btn${speed === s ? ' active' : ''}`}
                        onClick={() => { setSpeed(s); speedRef.current = s; }}>
                        {s}×
                      </button>
                    ))}
                    <span className="muted" style={{ fontSize: '.72rem', marginLeft: 8 }}>{evs.length} snapshots</span>
                  </div>
                </div>

                <div className="muted" style={{ fontSize: '.7rem', marginTop: 4 }}>
                  Tip: <kbd>Space</kbd> play/pause · <kbd>←</kbd><kbd>→</kbd> skip 5s · click progress bar to seek
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// WHITEBOARD WORKSPACE (Excalidraw)
// ═══════════════════════════════════════════════════════════════════════

interface WhiteboardWorkspaceProps {
  problem: Problem;
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
  result: { kind: 'sub'; data: SubResp } | null;
  recentSubs: SubItem[];
  onViewSub: (id: number) => void;
}

function WhiteboardWorkspace({ problem, onSubmit, submitting, result, recentSubs, onViewSub }: WhiteboardWorkspaceProps) {
  const { resolvedTheme } = useTheme();
  const excalidrawRef = useRef<any>(null);

  const handleSubmit = async () => {
    if (!excalidrawRef.current) return;
    const api = excalidrawRef.current;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();
    onSubmit({ elements, appState, files });
  };

  return (
    <div className="workspace">
      {/* Left: problem description */}
      <div className="prob-pane">
        <div>
          <div className="prob-pane-meta">
            <DiffBadge difficulty={problem.difficulty} />
            <span className="badge badge-type-design" style={{ marginLeft: 8 }}>🎨 Design</span>
          </div>
          <h1>{problem.title}</h1>
          <div className="tag-cloud mt8">{problem.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
        </div>
        <div><p className="prob-desc" style={{ whiteSpace: 'pre-wrap' }}>{problem.description}</p></div>

        {/* Recent submissions */}
        {recentSubs.length > 0 && (
          <div className="recent-subs">
            <p className="section-label">Your Submissions</p>
            {recentSubs.slice(0, 5).map(s => (
              <div key={s.id} className="recent-sub-row" onClick={() => onViewSub(s.id)}>
                <StatusBadge status={s.status} />
                <span className="muted" style={{ fontSize: '.75rem', marginLeft: 8 }}>{fmtDate(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Submit result feedback */}
        {result?.kind === 'sub' && (
          <div className={`verdict-banner ${result.data.status}`} style={{ marginTop: 16 }}>
            <div className="verdict-title"><StatusBadge status={result.data.status} /></div>
            <div className="muted" style={{ fontSize: '.85rem', marginTop: 4 }}>{result.data.summary}</div>
          </div>
        )}
      </div>

      {/* Right: Excalidraw whiteboard */}
      <div className="editor-pane" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div className="editor-topbar" style={{ flexShrink: 0, height: 44 }}>
          <span style={{ fontWeight: 600, color: 'var(--fg)' }}>Design Whiteboard</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Spinner sz={14} /> : 'Submit Design'}
            </button>
          </div>
        </div>
        <div style={{ height: 'calc(100vh - 56px - 44px)', width: '100%', position: 'relative' }}>
          <SafeExcalidraw
            excalidrawAPI={(api: any) => { excalidrawRef.current = api; }}
            theme={resolvedTheme}
            UIOptions={{
              canvasActions: { export: { saveFileToDisk: true } },
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WHITEBOARD SUBMISSION VIEWER (read-only)
// ═══════════════════════════════════════════════════════════════════════

function WhiteboardViewer({ data, onClose }: { data: Record<string, unknown>; onClose: () => void }) {
  const { resolvedTheme } = useTheme();
  
  // Strip appState width/height if present, to prevent overriding the viewer's dimensions
  const safeAppState = useMemo(() => {
    const rawState = (data.appState as any) || {};
    const { width, height, scrollX, scrollY, offsetLeft, offsetTop, collaborators, ...rest } = rawState;
    return { ...rest, viewModeEnabled: true, collaborators: new Map() };
  }, [data.appState]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="replay-modal" onClick={e => e.stopPropagation()} style={{ width: '90vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="replay-header" style={{ flexShrink: 0, height: 57 }}>
          <h2>Design Submission</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div style={{ height: 'calc(90vh - 57px)', width: '100%', position: 'relative' }}>
          <SafeExcalidraw
            initialData={{ 
              elements: ((data.elements as any[]) || []), 
              appState: safeAppState,
              scrollToContent: false 
            }}
            theme={resolvedTheme}
            viewModeEnabled
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WORKSPACE PAGE
// ═══════════════════════════════════════════════════════════════════════

type ResultPane = { kind: 'run'; data: RunResp } | { kind: 'sub'; data: SubResp } | null;


function WorkspacePage() {
  const { resolvedTheme } = useTheme();
  const { id } = useParams<{ id: string }>();
  const { isAuth } = useAuth();
  const nav = useNavigate();

  const [problem,    setProblem   ] = useState<Problem | null>(null);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState<string | null>(null);
  const [lang,       setLang      ] = useState<Language>('python');
  const [code,       setCode      ] = useState(LANGS.python.starter);
  const [running,    setRunning   ] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult    ] = useState<ResultPane>(null);
  const [activeCase, setActiveCase] = useState(0);
  const [recentSubs, setRecentSubs] = useState<SubItem[]>([]);
  const [resTab,     setResTab    ] = useState<'cases'|'recent'>('cases');
  const [viewingWbSub, setViewingWbSub] = useState<Record<string, unknown> | null>(null);

  // Editor events capture
  const startTime = useRef<number>(Date.now());
  const eventsRef = useRef<EditorEvent[]>([]);
  const lastCode = useRef(code);

  useEffect(() => {
    if (!id) { nav('/'); return; }
    setLoading(true);
    api<Problem>(`/problems/${id}`)
      .then(p => { setProblem(p); startTime.current = Date.now(); eventsRef.current = []; })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, nav]);

  useEffect(() => {
    if (!id || !isAuth) return;
    api<SubItem[]>(`/problems/${id}/submissions`).then(setRecentSubs).catch(() => {});
  }, [id, isAuth]);

  // Periodic 2-second snapshot
  useEffect(() => {
    const t = setInterval(() => {
      if (code !== lastCode.current) {
        eventsRef.current.push({ t: Date.now() - startTime.current, v: code });
        lastCode.current = code;
      }
    }, 2000);
    return () => clearInterval(t);
  }, [code]);

  const changeLang = (l: Language) => {
    setLang(l);
    const starter = LANGS[l].starter;
    setCode(starter); setResult(null);
    lastCode.current = starter;
    eventsRef.current.push({ t: Date.now() - startTime.current, v: starter });
  };

  const onEditorPaste = () => {
    // force immediate snapshot on paste (handled slightly delayed via onChange)
    setTimeout(() => {
      if (code !== lastCode.current) {
        eventsRef.current.push({ t: Date.now() - startTime.current, v: code });
        lastCode.current = code;
      }
    }, 100);
  };

  const handleRun = async () => {
    if (!problem || running) return;
    setRunning(true); setResult(null); setActiveCase(0);
    try {
      const r = await api<RunResp>(`/problems/${problem.id}/run`, { method: 'POST', body: JSON.stringify({ code, language: lang }) });
      setResult({ kind: 'run', data: r }); setResTab('cases');
    } catch {} finally { setRunning(false); }
  };

  const handleSubmit = async () => {
    if (!problem || submitting) return;
    if (!isAuth) { nav('/login'); return; }
    setSubmitting(true); setResult(null); setActiveCase(0);
    try {
      // final snapshot
      if (code !== lastCode.current) { eventsRef.current.push({ t: Date.now() - startTime.current, v: code }); }
      
      const r = await api<SubResp>(`/problems/${problem.id}/submit`, {
        method: 'POST', body: JSON.stringify({ code, language: lang, editor_events: eventsRef.current }),
      });
      setResult({ kind: 'sub', data: r }); setResTab('cases');
      api<SubItem[]>(`/problems/${problem.id}/submissions`).then(setRecentSubs).catch(() => {});
    } catch {} finally { setSubmitting(false); }
  };

  const handleWhiteboardSubmit = async (data: Record<string, unknown>) => {
    if (!problem || submitting) return;
    if (!isAuth) { nav('/login'); return; }
    setSubmitting(true); setResult(null);
    try {
      const r = await api<SubResp>(`/problems/${problem.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ code: '', language: 'design', editor_events: [], whiteboard_data: data }),
      });
      setResult({ kind: 'sub', data: r });
      api<SubItem[]>(`/problems/${problem.id}/submissions`).then(setRecentSubs).catch(() => {});
    } catch {} finally { setSubmitting(false); }
  };

  const handleViewSub = async (subId: number) => {
    try {
      const sub = await api<SubResp>(`/submissions/${subId}`);
      if (sub.whiteboard_data) setViewingWbSub(sub.whiteboard_data);
    } catch {}
  };

  const cases   = result?.data.cases ?? [];
  const verdict = result?.data.status as Status | undefined;

  if (loading) return <><NavBar /><div className="loading-center"><Spinner sz={28}/> Loading problem…</div></>;
  if (error || !problem) return <><NavBar /><div className="empty-state"><div className="empty-icon">❌</div><p>{error ?? 'Not found'}</p><Link to="/" className="btn btn-ghost mt16">← Back</Link></div></>;

  // Design problem — render whiteboard
  if (problem.problem_type === 'design') {
    return (
      <>
        <NavBar />
        <WhiteboardWorkspace
          problem={problem}
          onSubmit={handleWhiteboardSubmit}
          submitting={submitting}
          result={result?.kind === 'sub' ? result : null}
          recentSubs={recentSubs}
          onViewSub={handleViewSub}
        />
        {viewingWbSub && <WhiteboardViewer data={viewingWbSub} onClose={() => setViewingWbSub(null)} />}
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="workspace">
        <div className="prob-pane">
          <div>
            <div className="prob-pane-meta"><DiffBadge difficulty={problem.difficulty} /><div className="limits-row"><span className="limit-chip">⏱ {problem.time_limit_ms} ms</span><span className="limit-chip">💾 {problem.memory_limit_mb} MB</span></div></div>
            <h1>{problem.title}</h1>
            <div className="tag-cloud mt8">{problem.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
          </div>
          <div><p className="prob-desc" style={{whiteSpace:'pre-wrap'}}>{problem.description}</p></div>
          <div>
            <p className="section-label">Examples</p>
            {problem.examples.map((ex, i) => (
              <div key={i} className="example-card">
                <div className="ex-row"><span className="ex-lbl">Input:</span><span className="ex-val">{ex.input}</span></div>
                <div className="ex-row"><span className="ex-lbl">Output:</span><span className="ex-val">{ex.output}</span></div>
                {ex.explanation && <div className="ex-row"><span className="ex-lbl">Explain:</span><span className="ex-val muted2">{ex.explanation}</span></div>}
              </div>
            ))}
          </div>
          {problem.constraints.length > 0 && <div><p className="section-label">Constraints</p><div className="constraints">{problem.constraints.map((c, i) => <div key={i} className="constraint">{c}</div>)}</div></div>}
        </div>
        <div className="editor-pane">
          <div className="editor-toolbar">
            <select className="lang-select" value={lang} onChange={e => changeLang(e.target.value as Language)}>
              {(Object.entries(LANGS) as [Language, typeof LANGS[Language]][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="tb-spacer" />
            <button className="btn-run" onClick={handleRun} disabled={running || submitting}>{running ? <><Spinner sz={12}/> Running…</> : '▶ Run'}</button>
            <button className="btn-submit" onClick={handleSubmit} disabled={running || submitting} title={!isAuth ? 'Log in to submit' : undefined}>{submitting ? <><Spinner sz={12}/> Submitting…</> : 'Submit'}</button>
          </div>
          <div className="monaco-wrap" onPaste={onEditorPaste}>
            <Editor height="100%" language={LANGS[lang].monaco} theme={resolvedTheme === 'light' ? 'light' : 'vs-dark'} value={code} onChange={v => setCode(v ?? '')} options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace", scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4 }} />
          </div>
          <div className="result-panel">
            <div className="res-tabs">
              <div className={`res-tab${resTab==='cases' ? ' on':''}`} onClick={() => setResTab('cases')}>Test Cases</div>
              {isAuth && <div className={`res-tab${resTab==='recent' ? ' on':''}`} onClick={() => setResTab('recent')}>Recent {recentSubs.length > 0 ? `(${recentSubs.length})` : ''}</div>}
            </div>
            <div className="res-body">
              {resTab === 'cases' ? (
                <>
                  {verdict && <div className={`verdict ${verdict}`}><span>{STATUS_META[verdict].icon}</span><span>{STATUS_META[verdict].label}</span><span className="v-summary">— {result?.data.summary}</span></div>}
                  {!result && !running && !submitting && <p className="no-result">Click <strong>Run</strong> to test against the first example, or <strong>Submit</strong> to judge all cases.</p>}
                  {(running || submitting) && <div className="flex-center gap8 muted"><Spinner sz={14}/> {submitting ? 'Running all cases…' : 'Running example…'}</div>}
                  {cases.length > 0 && (
                    <>
                      <div className="case-tabs">
                        {cases.map((c, i) => <button key={i} className={`case-tab${activeCase===i?' active':''}${verdict ? (c.passed?' pass':' fail') : ''}`} onClick={() => setActiveCase(i)}>{verdict ? (c.passed ? '✓' : '✗') : ''} Case {i + 1}</button>)}
                      </div>
                      {cases[activeCase] && (() => {
                        const c = cases[activeCase]; const out = c.compilation_failed ? c.compile_stderr : c.stdout;
                        return (
                          <div className="case-grid">
                            <div className="case-field"><div className="cf-label">Input</div><div className="cf-value">{c.stdin || '(empty)'}</div></div>
                            <div className="case-field"><div className="cf-label">Expected</div><div className="cf-value">{c.expected_output}</div></div>
                            <div className="case-field"><div className="cf-label">Your Output</div><div className={`cf-value${c.passed ? ' pass' : verdict ? ' fail' : ''}`}>{out || '(no output)'}</div></div>
                            {c.stderr && <div className="case-field"><div className="cf-label">Stderr</div><div className="cf-value fail">{c.stderr}</div></div>}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              ) : (
                recentSubs.length === 0 ? <p className="no-result">No submissions yet.</p> : (
                  <table className="sub-table" style={{ fontSize: '.78rem' }}>
                    <thead><tr><th>Status</th><th>Lang</th><th>Runtime</th><th>Date</th></tr></thead>
                    <tbody>
                      {recentSubs.map(s => (
                        <tr key={s.id}><td><StatusBadge status={s.status}/></td><td className="muted mono">{s.language}</td><td className="muted">{s.runtime_ms != null ? `${s.runtime_ms.toFixed(0)} ms` : '—'}</td><td className="muted">{fmtDate(s.created_at)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUBMISSIONS PAGE
// ═══════════════════════════════════════════════════════════════════════

function SubmissionsPage() {
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

// ═══════════════════════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════════════════════

function ProfilePage() {
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

// ═══════════════════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════
// ADMIN — CREATE PROBLEM FORM
// ═══════════════════════════════════════════════════════════════════════

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

function AdminCreateProblemForm({ onCreated }: { onCreated: () => void }) {
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

function AdminPage() {
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


// ═══════════════════════════════════════════════════════════════════════
// PROTECTED ROUTE
// ═══════════════════════════════════════════════════════════════════════

function Guard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user && !user.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ═══════════════════════════════════════════════════════════════════════
// APP ROUTER
// ═══════════════════════════════════════════════════════════════════════

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"             element={<ProblemListPage />} />
        <Route path="/leaderboard"  element={<LeaderboardPage />} />
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/register"     element={<RegisterPage />} />
        <Route path="/problems/:id" element={<WorkspacePage />} />
        <Route path="/submissions"  element={<Guard><SubmissionsPage /></Guard>} />
        <Route path="/profile"      element={<Guard><ProfilePage /></Guard>} />
        <Route path="/admin"        element={<Guard adminOnly><AdminPage /></Guard>} />
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
