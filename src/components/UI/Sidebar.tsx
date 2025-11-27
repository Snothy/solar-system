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
        <div className="flex items-center justify-between">
          <h1 className={styles.title}>OrbitEngine</h1>
          <button 
            onClick={onOpenSettings}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400 hover:text-white group relative"
            title="Physics Settings"
          >
            <span className="text-xl block group-hover:rotate-90 transition-transform duration-500">⚙️</span>
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
