import type { ReactNode } from 'react';
import styles from './Badge.module.css';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'success';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
}
