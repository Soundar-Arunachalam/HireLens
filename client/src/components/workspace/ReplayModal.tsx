import React, { useEffect, useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../contexts/ThemeProvider';
import { api } from '../../api';
import { LANGS } from '../../constants';
import { Spinner } from '../shared/Spinner';
import { SubResp, Language } from '../../types';

export function ReplayModal({ subId, onClose }: { subId: number; onClose: () => void }) {
  const { resolvedTheme } = useTheme();
  const [sub, setSub] = useState<SubResp | null>(null);
  const [err, setErr] = useState('');

  // Playback state
  const [displayIdx,    setDisplayIdx   ] = useState(0);
  const [displayMs,     setDisplayMs    ] = useState(0);
  const [playing,       setPlaying      ] = useState(false);
  const [speed,         setSpeed        ] = useState(1);

  const playingRef  = useRef(false);
  const speedRef    = useRef(1);
  const virtualMsRef = useRef(0);
  const wallStartRef = useRef(0);
  const rafRef      = useRef<number | null>(null);

  useEffect(() => {
    api<SubResp>(`/submissions/${subId}`)
      .then(s => setSub(s))
      .catch(e => setErr(e.message));
  }, [subId]);

  const evs = sub?.editor_events ?? [];
  const totalMs = evs.length > 0 ? evs[evs.length - 1].t : 0;

  const idxAtMs = useCallback((ms: number) => {
    if (evs.length === 0) return 0;
    let lo = 0, hi = evs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (evs[mid].t <= ms) lo = mid; else hi = mid - 1;
    }
    return lo;
  }, [evs]);

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

  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      if (e.code === 'ArrowLeft')  { pause(); virtualMsRef.current = Math.max(0, virtualMsRef.current - 5000); const i = idxAtMs(virtualMsRef.current); setDisplayIdx(i); setDisplayMs(virtualMsRef.current); }
      if (e.code === 'ArrowRight') { pause(); virtualMsRef.current = Math.min(totalMs, virtualMsRef.current + 5000); const i = idxAtMs(virtualMsRef.current); setDisplayIdx(i); setDisplayMs(virtualMsRef.current); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing, pause, play, idxAtMs, totalMs]);

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
        <div className="replay-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {playing && <span className="rec-dot" />}
            <h2>Replay — #{sub.id} <span className="muted" style={{ fontWeight: 400, fontSize: '.85rem' }}>({sub.language})</span></h2>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="replay-body">
          <div className="replay-editor">
            <Editor
              language={LANGS[sub.language as Language]?.monaco || 'python'}
              theme={resolvedTheme === 'light' ? 'light' : 'vs-dark'}
              value={currentCode}
              options={{ readOnly: true, minimap: { enabled: false }, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, scrollBeyondLastLine: false }}
            />
          </div>
          <div className="replay-controls">
            {evs.length === 0 ? (
              <div className="muted" style={{ padding: '12px 0' }}>No editor events were recorded for this submission.</div>
            ) : (
              <>
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
                  {evs.map((ev, i) => (
                    <div key={i} className="progress-tick" style={{ left: `${(ev.t / totalMs) * 100}%` }} />
                  ))}
                </div>
                <input
                  type="range" className="replay-slider-hidden"
                  min={0} max={totalMs} step={100}
                  value={Math.round(displayMs)}
                  onChange={scrub}
                />
                <div className="controls-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="ctrl-btn" title="Back 5s (←)" onClick={() => {
                      pause(); const newMs = Math.max(0, virtualMsRef.current - 5000);
                      virtualMsRef.current = newMs; setDisplayMs(newMs); setDisplayIdx(idxAtMs(newMs));
                    }}>⏮</button>
                    <button className="ctrl-btn play-btn" title="Play/Pause (Space)" onClick={() => playing ? pause() : play()}>
                      {playing ? '⏸' : '▶'}
                    </button>
                    <button className="ctrl-btn" title="Forward 5s (→)" onClick={() => {
                      pause(); const newMs = Math.min(totalMs, virtualMsRef.current + 5000);
                      virtualMsRef.current = newMs; setDisplayMs(newMs); setDisplayIdx(idxAtMs(newMs));
                    }}>⏭</button>
                    <button className="ctrl-btn" title="Restart" onClick={() => {
                      pause(); virtualMsRef.current = 0; setDisplayMs(0); setDisplayIdx(0);
                    }}>↩</button>
                    <span className="time-display mono">{formatMs(displayMs)} / {formatMs(totalMs)}</span>
                  </div>
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
