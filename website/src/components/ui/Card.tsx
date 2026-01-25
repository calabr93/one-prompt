import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'highlighted' | 'feature';
  className?: string;
}

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  const classNames = [styles.card, styles[variant], className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
}
