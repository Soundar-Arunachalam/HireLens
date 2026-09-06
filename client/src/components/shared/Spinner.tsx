import React from 'react';

export function Spinner({ sz = 14 }: { sz?: number }) {
  return <span className="spin" style={{ width: sz, height: sz, borderWidth: sz > 20 ? 3 : 2 }} />;
}
