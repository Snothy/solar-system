import { createPortal } from 'react-dom';
import { PhysicsSettings } from './PhysicsSettings';
import type { PhysicsSettingsProps } from './PhysicsSettings';

interface SettingsModalProps extends PhysicsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const { isOpen, onClose, ...physicsProps } = props;

  if (!isOpen) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div 
        className="apple-panel"
        style={{
          width: '600px', maxWidth: '90vw', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', pointerEvents: 'auto',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5)', border: '0.5px solid rgba(255,255,255,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 500, letterSpacing: '-0.02em' }}>
            Simulation Engine
          </h2>
          <button 
            onClick={onClose}
            style={{
              width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <PhysicsSettings {...physicsProps} />
        </div>
        
        {/* Footer */}
        <div style={{ 
          padding: '16px 24px', borderTop: '0.5px solid rgba(255, 255, 255, 0.05)',
          display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#fff', color: '#000', border: 'none',
              padding: '10px 24px', borderRadius: '12px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
