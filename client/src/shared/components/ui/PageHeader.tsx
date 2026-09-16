import React from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, actions }) => (
  <div className={styles.header}>
    <div className={styles.titleWrap}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);
