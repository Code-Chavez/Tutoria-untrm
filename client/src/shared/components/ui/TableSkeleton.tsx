import React from 'react';
import styles from './TableSkeleton.module.css';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, columns = 5 }) => (
  <div className={styles.wrap} aria-hidden="true">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className={styles.row}>
        {Array.from({ length: columns }).map((_, c) => (
          <span key={c} className={styles.cell} style={{ width: `${60 + ((r + c) % 4) * 10}%` }} />
        ))}
      </div>
    ))}
  </div>
);
