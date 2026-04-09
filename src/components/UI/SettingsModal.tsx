import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PhysicsSettings } from './PhysicsSettings';
import type { PhysicsSettingsProps } from './PhysicsSettings';
import { DataPanel } from './DataPanel';
import { BodiesPanel } from './BodiesPanel';
import type { SnapshotData } from '../../services/jplFetchService';

interface SettingsModalProps extends PhysicsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentSnapshot: SnapshotData | null;
  onSnapshotLoaded: (snapshot: SnapshotData) => void;
}

type Tab = 'Physics' | 'Data' | 'Bodies';

const NAV_ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: 'Physics', label: 'Simulation', icon: '⚙' },
  { key: 'Data',    label: 'Data',       icon: '◈' },
  { key: 'Bodies',  label: 'Bodies',     icon: '◉' },
];

export function SettingsModal(props: SettingsModalProps) {
  const { isOpen, onClose, currentSnapshot, onSnapshotLoaded, ...physicsProps } = props;
  const [activeTab, setActiveTab] = useState<Tab>('Physics');

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(24px)',
        display: 'flex', alignItems: 'stretch',
      }}
      onClick={onClose}
    >
      {/* Centered container */}
      <div
        style={{
          display: 'flex', width: '100%', height: '100%',
          maxWidth: '1100px', margin: '0 auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sidebar ── */}
        <div style={{
          width: '220px', flexShrink: 0,
          background: 'rgba(255,255,255,0.02)',
          borderRight: '0.5px solid rgba(255,255,255,0.06)',
          padding: '32px 12px 24px',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Logo */}
          <div style={{ padding: '0 8px 28px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: '2px' }}>
              OrbitEngine
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em' }}>
              Settings
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1 }}>
            {NAV_ITEMS.map(({ key, label, icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '10px', marginBottom: '2px',
                    background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '14px', fontWeight: isActive ? 500 : 400,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  }}
                >
                  <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                    {icon}
                  </span>
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Bottom: version / data source note */}
          <div style={{ padding: '0 8px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
            Data: JPL Horizons<br />
            DE440 ephemeris
          </div>
        </div>

        {/* ── Content area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Content header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '28px 48px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexShrink: 0,
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#fff', letterSpacing: '-0.025em' }}>
                {activeTab === 'Physics' ? 'Simulation Engine' : activeTab === 'Data' ? 'Data Manager' : 'Bodies Browser'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                {activeTab === 'Physics'
                  ? 'Integrator settings, force models, and numerical precision'
                  : activeTab === 'Data'
                  ? 'Pull and manage JPL Horizons ephemeris snapshots'
                  : 'All simulated bodies and their physical parameters'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px 48px' }}>
            {activeTab === 'Physics' && <PhysicsSettings {...physicsProps} />}
            {activeTab === 'Data' && (
              <DataPanel currentSnapshot={currentSnapshot} onSnapshotLoaded={onSnapshotLoaded} />
            )}
            {activeTab === 'Bodies' && <BodiesPanel />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
