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

  // Bulletproof modal - using mix of inline styles and safe Tailwind
  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'rgba(10, 11, 20, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: '#fff',
            fontSize: '18px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚙️</span>
            Simulation Settings
          </h2>
          <button 
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              color: '#8a8f98',
              border: 'none',
              padding: '8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: '1'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#8a8f98';
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}>
          <PhysicsSettings {...physicsProps} />
        </div>
        
        {/* Footer */}
        <div style={{ 
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#00a8cc',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00d2ff'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00a8cc'}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
