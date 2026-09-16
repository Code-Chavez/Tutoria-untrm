import React from 'react';
import styles from './Pagination.module.css';
import { ChevronLeftIcon, ChevronRightIcon } from '@shared/components/icons';

interface PaginationProps {
  page: number; // 1-based
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageSize, total, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={styles.wrap}>
      <span className={styles.count}>
        Mostrando <b>{from}</b>–<b>{to}</b> de <b>{total}</b> registros
      </span>
      <div className={styles.controls}>
        <button
          className={styles.arrow}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon size={16} />
        </button>
        <span className={styles.pageInfo}>
          Página {page} de {totalPages}
        </span>
        <button
          className={styles.arrow}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  );
};
