import type { ReactNode } from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  children: ReactNode;
  showMinimap: boolean;
  onToggleMinimap: (show: boolean) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ children, showMinimap, onToggleMinimap, onOpenSettings }: SidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h1 className={styles.title}>OrbitEngine</h1>
          <button 
            onClick={onOpenSettings}
            title="Physics Settings"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: '#fff',
              outline: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1, filter: 'grayscale(100%) brightness(1.5)' }}>⚙️</span>
          </button>
        </div>
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
