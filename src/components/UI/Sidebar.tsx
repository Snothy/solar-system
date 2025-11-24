import type { ReactNode } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  children: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>OrbitEngine</h1>
      </div>
      
      <div className={styles.scrollContent}>
        {children}
      </div>
    </div>
  );
}
