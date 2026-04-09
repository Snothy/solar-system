/**
 * Accuracy report sidebar shown in the results view.
 * Click a body row to focus the 3D camera on it.
 */

import type { TestRun, TestBodySummary } from '../../services/testStorage';
import { formatEpochDate } from '../../services/snapshotStorage';

interface Props {
  testRun: TestRun;
  onBack: () => void;
  saved: boolean;
  onSave: () => void;
  saving: boolean;
  onBodyClick?: (name: string) => void;
  focusedBody?: string | null;
}

const INTEGRATOR_LABELS: Record<string, string> = {
  saba4: 'SABA4', adaptive: 'DOP853',
  'wisdom-holman': 'Wisdom-Holman', 'high-precision': 'High Precision', standard: 'Standard',
};

const QUALITY_LABELS: Record<number, string> = { 1: 'Low', 5: 'Medium', 10: 'High' };

export function TestResults({ testRun, onBack, saved, onSave, saving, onBodyClick, focusedBody }: Props) {
  const bodies = Object.entries(testRun.summary.bodies)
    .sort((a, b) => b[1].meanErrorKm - a[1].meanErrorKm);

  const mean = testRun.summary.overallMeanErrorKm;
  const max  = testRun.summary.overallMaxErrorKm;
  const cfg  = testRun.physicsConfig;

  return (
    <div style={{
      width: '300px', flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(12,12,18,0.7)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '10px' }}>
          Accuracy Report
        </div>

        {/* Date range */}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
          {formatEpochDate(testRun.startEpoch.date)} → {formatEpochDate(testRun.endEpoch.date)}
        </div>

        {/* Overall stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
          <StatBox label="Mean Error" value={fmtKm(mean)} color={errColor(mean, max)} />
          <StatBox label="Max Error" value={fmtKm(max)} color="#f87171" />
        </div>

        {/* Run config chips */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: cfg ? '10px' : '0' }}>
          <Chip color="#60a5fa">{INTEGRATOR_LABELS[testRun.integrator] ?? testRun.integrator}</Chip>
          <Chip>{QUALITY_LABELS[testRun.quality] ?? `Q${testRun.quality}`}</Chip>
          <Chip>{testRun.summary.frameCount} frames</Chip>
          {testRun.summary.crashed && <Chip color="#f87171">⚠ crashed</Chip>}
        </div>

        {/* Physics config */}
        {cfg && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Physics
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[
                ['Relativity', cfg.relativity],
                ['Harmonics', cfg.gravitationalHarmonics],
                ['Tidal', cfg.tidalForces],
                ['SRP', cfg.solarRadiationPressure],
                ['Yarkovsky', cfg.yarkovskyEffect],
                ['Atm Drag', cfg.atmosphericDrag],
              ].map(([label, on]) => (
                <span key={String(label)} style={{
                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 500,
                  background: on ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                  color: on ? '#4ade80' : 'rgba(255,255,255,0.25)',
                  border: `1px solid ${on ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  {String(label)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Click body to focus camera</span>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <LegendDot color="#4ade80" label="sim" />
          <LegendDot color="#fb923c" label="JPL" />
        </div>
      </div>

      {/* Per-body list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {bodies.map(([name, stats]) => (
          <BodyRow
            key={name}
            name={name}
            stats={stats}
            overallMax={max}
            onClick={() => onBodyClick?.(name)}
            isFocused={focusedBody === name}
          />
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {!saved ? (
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              background: '#fff', color: '#000', opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Results'}
          </button>
        ) : (
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#4ade80', padding: '6px 0' }}>
            ✓ Saved to history
          </div>
        )}
        <button
          onClick={onBack}
          style={{
            padding: '9px', borderRadius: '10px', fontSize: '13px',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
          }}
        >
          ← Back to Setup
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BodyRow({
  name, stats, overallMax, onClick, isFocused,
}: {
  name: string; stats: TestBodySummary; overallMax: number;
  onClick: () => void; isFocused: boolean;
}) {
  const color = errColor(stats.meanErrorKm, overallMax);
  const barWidth = overallMax > 0 ? Math.min(100, (stats.maxErrorKm / overallMax) * 100) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '9px 10px', borderRadius: '8px', marginBottom: '3px',
        background: isFocused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
        border: isFocused ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
        cursor: 'pointer', transition: 'background 0.12s',
      }}
      onMouseOver={e => { if (!isFocused) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseOut={e => { if (!isFocused) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>{name}</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color }}>{fmtKm(stats.meanErrorKm)}</span>
      </div>

      {/* Error bar */}
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', overflow: 'hidden', marginBottom: '5px' }}>
        <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: '1px' }} />
      </div>

      {/* Sub-stats */}
      <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
        <span>Max {fmtKm(stats.maxErrorKm)}</span>
        <span>Final {fmtKm(stats.finalErrorKm)}</span>
        <span>RMS {fmtKm(stats.rmsErrorKm)}</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{label}</div>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 500,
      background: 'rgba(255,255,255,0.06)', color: color ?? 'rgba(255,255,255,0.5)',
    }}>
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtKm(km: number): string {
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)}M km`;
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${km.toFixed(0)} km`;
}

function errColor(val: number, max: number): string {
  if (max === 0) return '#4ade80';
  const t = Math.min(1, val / max);
  if (t < 0.33) return '#4ade80';
  if (t < 0.66) return '#facc15';
  return '#f87171';
}
