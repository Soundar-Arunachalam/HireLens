import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeProvider';
import { NavBar } from '../components/layout/NavBar';
import { Spinner } from '../components/shared/Spinner';
import { DiffBadge } from '../components/shared/DiffBadge';
import { StatusBadge } from '../components/shared/StatusBadge';
import { WhiteboardWorkspace } from '../components/workspace/WhiteboardWorkspace';
import { api } from '../api';
import { LANGS } from '../constants';
import { Language, Problem, RunResp, EditorEvent } from '../types';

export function WorkspacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [lang, setLang] = useState<Language>('python');
  const [code, setCode] = useState('');
  
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResp | null>(null);
  const [resultTab, setResultTab] = useState(0);

  const evs = useRef<EditorEvent[]>([]);
  const startMs = useRef<number>(0);
  const activeLang = useRef<Language>(lang);

  // Layout sizing
  const [leftW, setLeftW] = useState(400);
  const [bottomH, setBottomH] = useState(250);
  const [isResizing, setIsResizing] = useState<'left'|'bottom'|null>(null);

  useEffect(() => {
    api<Problem>(`/problems/${id}`)
      .then(p => { setProblem(p); activeLang.current = lang; setCode(LANGS[lang].starter); startMs.current = performance.now(); evs.current = []; })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isResizing === 'left') setLeftW(Math.max(300, Math.min(e.clientX, window.innerWidth - 300)));
      if (isResizing === 'bottom') setBottomH(Math.max(100, Math.min(window.innerHeight - e.clientY, window.innerHeight - 200)));
    };
    const handleUp = () => setIsResizing(null);
    if (isResizing) { window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp); }
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [isResizing]);

  const onCodeChange = (v: string | undefined) => {
    if (v === undefined) return;
    setCode(v);
    if (!startMs.current) startMs.current = performance.now();
    const t = Math.round(performance.now() - startMs.current);
    const last = evs.current.length > 0 ? evs.current[evs.current.length - 1] : null;
    if (!last || v !== last.v || t - last.t > 1000) { evs.current.push({ t, v }); }
  };

  const switchLang = (l: Language) => {
    if (code !== LANGS[lang].starter && !confirm('Switching languages will reset your code. Continue?')) return;
    setLang(l); activeLang.current = l;
    setCode(LANGS[l].starter); startMs.current = performance.now(); evs.current = [];
  };

  const runCode = async () => {
    if (!user) return alert('Please log in to submit code');
    if (!problem) return;
    setRunning(true); setResult(null); setResultTab(0);
    try {
      const res = await api<RunResp>('/run', { method: 'POST', body: JSON.stringify({ problem_id: problem.id, language: lang, code, editor_events: evs.current }) });
      setResult(res);
      startMs.current = performance.now(); evs.current = [];
    } catch (e: any) { alert(e.message); } finally { setRunning(false); }
  };

  if (loading) return <><NavBar /><div className="loading-center"><Spinner sz={24}/> Loading workspace…</div></>;
  if (error || !problem) return <><NavBar /><div className="empty-state"><div className="empty-icon">⚠️</div><p>{error || 'Problem not found'}</p><Link to="/" className="btn btn-primary mt16">Back to Problems</Link></div></>;

  const isDesign = problem.problem_type === 'design';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <NavBar />
      <div className="workspace">
        <div className="ws-left" style={{ width: leftW }}>
          <div className="prob-desc">
            <div className="prob-header">
              <h1>{problem.id}. {problem.title}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <DiffBadge difficulty={problem.difficulty} />
                <span className={`badge badge-type-${problem.problem_type ?? 'coding'}`}>{isDesign ? '🎨 Design' : '💻 Coding'}</span>
              </div>
            </div>
            <div className="markdown-body" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '.95rem', color: 'var(--fg-muted)' }}>
              {problem.description}
            </div>
            
            {problem.examples && problem.examples.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 12 }}>Examples</h3>
                {problem.examples.map((ex, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '.9rem' }}>Example {i+1}:</div>
                    <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: '.85rem' }}>
                      <div style={{ color: 'var(--fg-muted)' }}>Input: <span style={{ color: 'var(--fg)' }}>{ex.input}</span></div>
                      <div style={{ color: 'var(--fg-muted)', marginTop: 4 }}>Output: <span style={{ color: 'var(--fg)' }}>{ex.output}</span></div>
                      {ex.explanation && <div style={{ color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'inherit' }}>Explanation: {ex.explanation}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="resizer-v" onMouseDown={() => setIsResizing('left')} />

        <div className="ws-right">
          {isDesign ? (
            <WhiteboardWorkspace problem={problem} />
          ) : (
            <>
              <div className="ws-editor">
                <div className="editor-header">
                  <select className="lang-select" value={lang} onChange={e => switchLang(e.target.value as Language)}>
                    {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => { if(confirm('Reset code to starter template?')) { setCode(LANGS[lang].starter); startMs.current = performance.now(); evs.current = []; }}}>↺ Reset</button>
                    <button className="btn btn-primary play-btn" onClick={runCode} disabled={running}>
                      {running ? <Spinner sz={14}/> : '▶ Run & Submit'}
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Editor
                    language={LANGS[lang].monaco} theme={resolvedTheme === 'light' ? 'light' : 'vs-dark'}
                    value={code} onChange={onCodeChange}
                    options={{ minimap: { enabled: false }, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, scrollBeyondLastLine: false, smoothScrolling: true, cursorBlinking: 'smooth' }}
                  />
                </div>
              </div>
              
              <div className="resizer-h" onMouseDown={() => setIsResizing('bottom')} />
              
              <div className="ws-console" style={{ height: bottomH }}>
                <div className="console-header">
                  <span style={{ fontWeight: 600 }}>Test Results</span>
                  {result && <StatusBadge status={result.status} />}
                </div>
                <div className="console-body">
                  {!result && !running && <div className="muted" style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Run your code to see results here.</div>}
                  {running && <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 12 }}><Spinner sz={20}/> <span>Evaluating your solution…</span></div>}
                  {result && (
                    <div style={{ display: 'flex', height: '100%' }}>
                      <div className="case-tabs">
                        {result.cases.map((c, i) => (
                          <div key={i} className={`case-tab ${resultTab === i ? 'on' : ''} ${c.passed ? 'pass' : 'fail'}`} onClick={() => setResultTab(i)}>
                            <span className="case-dot"/> Case {i+1}
                          </div>
                        ))}
                      </div>
                      <div className="case-content">
                        {result.cases[resultTab] ? (
                          (() => {
                            const c = result.cases[resultTab];
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div><div className="case-lbl">Input</div><div className="case-val">{c.stdin}</div></div>
                                <div><div className="case-lbl">Expected Output</div><div className="case-val">{c.expected_output}</div></div>
                                <div><div className="case-lbl">Your Output</div><div className={`case-val ${!c.passed && c.stdout !== c.expected_output ? 'fail' : ''}`}>{c.stdout || <span className="muted">{'<empty>'}</span>}</div></div>
                                {(c.stderr || c.compile_stderr) && <div><div className="case-lbl">Standard Error</div><div className="case-val err">{c.compile_stderr || c.stderr}</div></div>}
                                <div style={{ fontSize: '.85rem', color: 'var(--fg-muted)', display: 'flex', gap: 16 }}>
                                  <span>Runtime: <span className="fw700">{c.duration_ms.toFixed(0)} ms</span></span>
                                  <span>Exit code: <span className="fw700">{c.exit_code}</span></span>
                                </div>
                              </div>
                            );
                          })()
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
