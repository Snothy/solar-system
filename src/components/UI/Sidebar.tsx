import type { ReactNode } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  children: ReactNode;
  showMinimap: boolean;
  onToggleMinimap: (show: boolean) => void;
}

export function Sidebar({ children, showMinimap, onToggleMinimap }: SidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h1 className={styles.title}>OrbitEngine</h1>
      </div>
      
      <div className={styles.scrollContent}>
        {children}
        
        <div style={{ marginTop: '20px', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px' }}>
            <input 
              type="checkbox" 
              checked={showMinimap} 
              onChange={(e) => onToggleMinimap(e.target.checked)}
              style={{ marginRight: '10px' }}
            />
            Show Minimap
          </label>
        </div>
      </div>
    </div>
  );
}
