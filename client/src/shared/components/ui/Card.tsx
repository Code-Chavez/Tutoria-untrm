import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ padded = false, children, className = '', ...rest }) => (
  <div className={`${styles.card} ${padded ? styles.padded : ''} ${className}`} {...rest}>
    {children}
  </div>
);

interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, actions, icon }) => (
  <div className={styles.header}>
    <div className={styles.headingWrap}>
      {icon && <span className={styles.headIcon}>{icon}</span>}
      <div>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.desc}>{description}</p>}
      </div>
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <div className={`${styles.body} ${className}`} {...rest}>
    {children}
  </div>
);
