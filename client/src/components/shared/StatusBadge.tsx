import React from 'react';
import { Status } from '../../types';
import { STATUS_META } from '../../constants';

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as Status];
  return (
    <span className={`badge badge-${status}`}>
      {meta ? `${meta.icon} ${meta.label}` : status}
    </span>
  );
}
