import React from 'react';
import { SafeExcalidraw } from '../shared/SafeExcalidraw';
import { useTheme } from '../../contexts/ThemeProvider';

export function WhiteboardViewer({ data, onClose }: { data: any; onClose: () => void }) {
  const { resolvedTheme } = useTheme();
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="replay-modal" onClick={e => e.stopPropagation()} style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="replay-header">
          <h2>Whiteboard Submission</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <SafeExcalidraw
            initialData={data}
            viewModeEnabled={true}
            zenModeEnabled={true}
            theme={resolvedTheme}
          />
        </div>
      </div>
    </div>
  );
}
