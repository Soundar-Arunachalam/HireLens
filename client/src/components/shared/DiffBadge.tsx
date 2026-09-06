import React from 'react';

export function DiffBadge({ difficulty }: { difficulty: string }) {
  return <span className={`badge badge-${difficulty}`}>{difficulty}</span>;
}
