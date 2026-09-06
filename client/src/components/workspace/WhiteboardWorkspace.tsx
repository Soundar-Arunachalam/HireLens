import React, { useRef, useState } from 'react';
import { SafeExcalidraw } from '../shared/SafeExcalidraw';
import { useTheme } from '../../contexts/ThemeProvider';
import { api } from '../../api';
import { Spinner } from '../shared/Spinner';
import { Problem } from '../../types';

export function WhiteboardWorkspace({ problem }: { problem: Problem }) {
  const { resolvedTheme } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  const excalidrawRef = useRef<any>(null);

  const submitDesign = async () => {
    if (!excalidrawRef.current) return;
    setSubmitting(true); setOk(''); setErr('');
    try {
      const elements = excalidrawRef.current.getSceneElements();
      const appState = excalidrawRef.current.getAppState();
      const payload = {
        problem_id: problem.id,
        language: 'design',
        code: '// Design submission',
        whiteboard_data: { elements, appState },
      };
      await api('/run', { method: 'POST', body: JSON.stringify(payload) });
      setOk('Design submitted successfully!');
    } catch (e: any) {
      setErr(e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 600 }}>Design Workspace</span>
          <span className="muted" style={{ marginLeft: 12, fontSize: '.85rem' }}>Draw your system architecture below.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {ok && <span style={{ color: 'var(--ac)', fontSize: '.85rem' }}>{ok}</span>}
          {err && <span style={{ color: 'var(--wa)', fontSize: '.85rem' }}>{err}</span>}
          <button className="btn btn-primary" onClick={submitDesign} disabled={submitting}>
            {submitting ? <Spinner sz={14} /> : 'Submit Design'}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <SafeExcalidraw
          excalidrawAPI={(api: any) => { excalidrawRef.current = api; }}
          theme={resolvedTheme}
        />
      </div>
    </div>
  );
}
