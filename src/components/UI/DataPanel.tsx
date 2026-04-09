import { useState, useEffect, useCallback, useRef } from 'react';
import { pullJPLSnapshot, pullJPLArchive, type FetchStatus } from '../../services/jplFetchService';
import {
  saveSnapshot,
  saveArchive,
  listSnapshots,
  deleteSnapshot,
  setActiveSnapshotId,
  getActiveSnapshotId,
  formatEpochDate,
  timeAgo,
  type SnapshotRecord,
  type ArchiveRecord,
  type AnyRecord,
} from '../../services/snapshotStorage';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import type { SnapshotData } from '../../services/jplFetchService';

// SOLAR_SYSTEM_DATA already includes EXTENDED_BODIES via spread at end of solarSystem.ts
const ALL_BODY_NAMES = SOLAR_SYSTEM_DATA
  .filter(b => b.jplId)
  .map(b => b.name);

interface DataPanelProps {
  currentSnapshot: SnapshotData | null;
  onSnapshotLoaded: (snapshot: SnapshotData) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', color, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

function ProgressRow({ name, status }: { name: string; status: FetchStatus }) {
  const color =
    status === 'done'    ? '#34d399'
    : status === 'error'   ? '#f87171'
    : status === 'loading' ? 'rgba(255,255,255,0.8)'
    : 'rgba(255,255,255,0.2)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0',
      opacity: status === 'pending' ? 0.3 : 1, transition: 'opacity 0.2s',
    }}>
      <span style={{
        width: 12, fontSize: '11px', color, flexShrink: 0, textAlign: 'center',
        animation: status === 'loading' ? 'dataPulse 1s ease-in-out infinite' : 'none',
      }}>
        {status === 'done' ? '✓' : status === 'error' ? '✗' : '·'}
      </span>
      <span style={{ fontSize: '12px', color, flex: 1, fontFamily: 'monospace' }}>{name}</span>
      {status === 'loading' && (
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>fetching…</span>
      )}
    </div>
  );
}

// ─── Detail popover ───────────────────────────────────────────────────────────

function DetailsPopover({ rows, onClose }: { rows: [string, string][]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: 'absolute', right: 0, top: '100%', marginTop: '6px',
      background: 'rgba(18,18,22,0.98)', backdropFilter: 'blur(20px)',
      border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px',
      padding: '12px 14px', zIndex: 200, minWidth: '260px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
          <div style={{ fontSize: '12px', color: '#93c5fd', fontFamily: 'monospace', wordBreak: 'break-all' }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Current Snapshot Card ────────────────────────────────────────────────────

function CurrentSnapshotCard({ snapshot }: { snapshot: SnapshotData | null }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!snapshot) {
    return (
      <div style={{
        padding: '16px', borderRadius: '12px',
        background: 'rgba(30,58,138,0.1)', border: '1px solid rgba(59,130,246,0.2)',
        color: '#93c5fd', fontSize: '13px', lineHeight: 1.6,
      }}>
        <strong style={{ display: 'block', marginBottom: '4px' }}>No snapshot active</strong>
        Pull data from JPL Horizons below to initialize with accurate ephemeris data.
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px 18px', borderRadius: '12px',
      background: 'rgba(37,99,235,0.08)', border: '0.5px solid rgba(59,130,246,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '5px', letterSpacing: '-0.01em' }}>
            {formatEpochDate(snapshot.epoch.date)}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span>{Object.keys(snapshot.bodies).length} bodies</span>
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowDetails(v => !v)}
            style={{
              padding: '5px 10px', borderRadius: '8px', fontSize: '12px',
              background: showDetails ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
            }}
          >
            Details ···
          </button>
          {showDetails && (
            <DetailsPopover
              rows={[
                ['Julian Date', snapshot.epoch.jd.toFixed(4)],
                ['Unix ms', snapshot.epoch.unix_ms.toFixed(0)],
                ['Raw epoch', snapshot.epoch.date],
              ]}
              onClose={() => setShowDetails(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────

function HistoryRow({
  record, isActive, onLoad, onDelete,
}: {
  record: AnyRecord; isActive: boolean; onLoad: () => void; onDelete: () => void;
}) {
  const [deleteHover, setDeleteHover] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const isArchive = record.kind === 'archive';
  const ar = record as ArchiveRecord;
  const sr = record as SnapshotRecord;

  const detailRows: [string, string][] = isArchive
    ? [
        ['Type', 'Archive'],
        ['Start JD', ar.startEpoch.jd.toFixed(4)],
        ['End JD', ar.endEpoch.jd.toFixed(4)],
        ['Step', `${ar.stepHours}h`],
        ['Total entries', ar.entryCount.toLocaleString()],
        ['Bodies', String(ar.bodyCount)],
      ]
    : [
        ['Type', 'Snapshot'],
        ['Julian Date', sr.epoch.jd.toFixed(4)],
        ['Unix ms', sr.epoch.unix_ms.toFixed(0)],
        ['Raw epoch', sr.epoch.date],
      ];

  return (
    <div style={{
      padding: '12px 14px', borderRadius: '12px',
      background: isActive ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.03)',
      border: `0.5px solid ${isActive ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Kind badge + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', padding: '2px 6px',
              borderRadius: '4px', textTransform: 'uppercase', flexShrink: 0,
              background: isArchive ? 'rgba(251,146,60,0.15)' : 'rgba(96,165,250,0.15)',
              color: isArchive ? '#fb923c' : '#60a5fa',
            }}>
              {isArchive ? 'Archive' : 'Snapshot'}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isArchive ? formatEpochDate(ar.startEpoch.date) : formatEpochDate(sr.epoch.date)}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: 'flex', gap: '10px' }}>
            <span>{record.bodyCount} bodies</span>
            {isArchive && <span>{ar.entryCount.toLocaleString()} pts</span>}
            <span>·</span>
            <span>{timeAgo(record.createdAt)}</span>
          </div>
        </div>

        {isActive && (
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em',
            padding: '3px 9px', borderRadius: '999px',
            background: 'rgba(37,99,235,0.35)', color: '#93c5fd', flexShrink: 0,
          }}>ACTIVE</span>
        )}

        {/* Details popover */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowDetails(v => !v)}
            style={{
              padding: '4px 8px', borderRadius: '6px', fontSize: '11px',
              background: showDetails ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.45)', border: 'none', cursor: 'pointer',
            }}
          >···</button>
          {showDetails && (
            <DetailsPopover rows={detailRows} onClose={() => setShowDetails(false)} />
          )}
        </div>

        {/* Load — only snapshots can be "loaded" into simulation */}
        {!isActive && !isArchive && (
          <button
            onClick={onLoad}
            style={{
              padding: '5px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
              border: '0.5px solid rgba(255,255,255,0.12)', cursor: 'pointer', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            Load
          </button>
        )}

        <button
          onClick={onDelete}
          onMouseEnter={() => setDeleteHover(true)}
          onMouseLeave={() => setDeleteHover(false)}
          style={{
            width: 26, height: 26, borderRadius: '6px', fontSize: '14px',
            background: deleteHover ? 'rgba(239,68,68,0.2)' : 'transparent',
            color: deleteHover ? '#f87171' : 'rgba(255,255,255,0.2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: 'none', transition: 'all 0.15s',
          }}
        >×</button>
      </div>
    </div>
  );
}

// ─── Pull progress view ───────────────────────────────────────────────────────

function PullProgress({
  progress, totalBodies, label,
}: {
  progress: Record<string, FetchStatus>; totalBodies: number; label: string;
}) {
  const fetchedCount = Object.values(progress).filter(s => s === 'done' || s === 'error').length;
  const errorCount = Object.values(progress).filter(s => s === 'error').length;

  return (
    <div style={{
      padding: '14px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {errorCount > 0 && (
            <span style={{ fontSize: '11px', color: '#f87171' }}>{errorCount} failed</span>
          )}
          <span style={{ fontSize: '12px', color: '#4ade80', fontFamily: 'monospace', fontWeight: 600 }}>
            {fetchedCount} / {totalBodies}
          </span>
        </div>
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', marginBottom: '14px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          background: errorCount > 0
            ? 'linear-gradient(90deg, #4ade80, #f87171)'
            : 'linear-gradient(90deg, #4ade80, #22d3ee)',
          width: `${totalBodies > 0 ? (fetchedCount / totalBodies) * 100 : 0}%`,
          transition: 'width 0.25s ease',
        }} />
      </div>
      <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
        {ALL_BODY_NAMES.map(name => (
          <ProgressRow key={name} name={name} status={progress[name] ?? 'pending'} />
        ))}
      </div>
    </div>
  );
}

// ─── Main DataPanel ───────────────────────────────────────────────────────────

type PullMode = 'snapshot' | 'archive';

export function DataPanel({ currentSnapshot, onSnapshotLoaded }: DataPanelProps) {
  const [records, setRecords] = useState<AnyRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, FetchStatus>>({});
  const [pullMode, setPullMode] = useState<PullMode>('snapshot');

  const today = new Date().toISOString().split('T')[0];
  const [snapshotDate, setSnapshotDate] = useState(today);
  const [archiveStart, setArchiveStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [archiveEnd, setArchiveEnd] = useState(today);

  const refreshHistory = useCallback(async () => {
    const [list, id] = await Promise.all([listSnapshots(), getActiveSnapshotId()]);
    setRecords(list);
    setActiveId(id);
  }, []);

  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const initProgress = () => {
    const init: Record<string, FetchStatus> = {};
    ALL_BODY_NAMES.forEach(n => { init[n] = 'pending'; });
    setProgress(init);
  };

  const handlePullSnapshot = async () => {
    setPulling(true);
    setPullError(null);
    initProgress();
    try {
      const snapshot = await pullJPLSnapshot(
        (name, status) => setProgress(prev => ({ ...prev, [name]: status })),
        snapshotDate,
        3,
      );
      const record = await saveSnapshot(snapshot);
      await setActiveSnapshotId(record.id);
      await refreshHistory();
      onSnapshotLoaded(snapshot);
    } catch (err: any) {
      setPullError(err?.message ?? 'Unknown error');
    } finally {
      setPulling(false);
    }
  };

  const handlePullArchive = async () => {
    setPulling(true);
    setPullError(null);
    initProgress();
    try {
      const archive = await pullJPLArchive(
        (name, status) => setProgress(prev => ({ ...prev, [name]: status })),
        archiveStart,
        archiveEnd,
        1, // hourly
        3,
      );
      await saveArchive(archive);
      await refreshHistory();
    } catch (err: any) {
      setPullError(err?.message ?? 'Unknown error');
    } finally {
      setPulling(false);
    }
  };


  const handleLoad = async (record: AnyRecord) => {
    if (record.kind !== 'snapshot') return;
    await setActiveSnapshotId(record.id);
    setActiveId(record.id);
    onSnapshotLoaded(record as SnapshotRecord);
  };

  const handleDelete = async (id: string) => {
    await deleteSnapshot(id);
    if (activeId === id) {
      const remaining = records.filter(r => r.id !== id && r.kind === 'snapshot') as SnapshotRecord[];
      if (remaining.length > 0) {
        await setActiveSnapshotId(remaining[0].id);
        setActiveId(remaining[0].id);
      } else {
        setActiveId(null);
      }
    }
    await refreshHistory();
  };

  const totalBodies = ALL_BODY_NAMES.length;

  return (
    <div style={{ padding: '4px 0' }}>
      <style>{`
        @keyframes dataPulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>

      {/* ── Current Snapshot ──────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <SectionHeader label="Current Snapshot" color="#60a5fa" />
        <CurrentSnapshotCard snapshot={currentSnapshot} />
      </div>

      {/* ── Pull New Data ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <SectionHeader label="Pull New Data" color="#4ade80" />

        {/* Mode selector */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '18px',
          background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px',
        }}>
          {(['snapshot', 'archive'] as PullMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setPullMode(mode); setPullError(null); }}
              style={{
                flex: 1, padding: '7px', borderRadius: '7px', fontSize: '13px', fontWeight: 500,
                background: pullMode === mode ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: pullMode === mode ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {mode === 'snapshot' ? 'Snapshot' : 'Archive  (30-day hourly)'}
            </button>
          ))}
        </div>

        {!pulling ? (
          <>
            {pullMode === 'snapshot' ? (
              <>
                <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Epoch Date
                </label>
                <input
                  type="date" value={snapshotDate} max={today}
                  onChange={e => setSnapshotDate(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', marginBottom: '10px',
                    background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px',
                    colorScheme: 'dark', outline: 'none',
                  }}
                />
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', lineHeight: 1.6 }}>
                  Single pos+vel snapshot for all bodies. 3 parallel requests with retry — ~30–60s.
                </p>
                <button
                  onClick={handlePullSnapshot}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    background: '#fff', color: '#000', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Pull Snapshot
                </button>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  {[
                    { label: 'Start Date', value: archiveStart, set: setArchiveStart, max: archiveEnd },
                    { label: 'End Date', value: archiveEnd, set: setArchiveEnd, min: archiveStart, max: today },
                  ].map(({ label, value, set, min, max }) => (
                    <div key={label}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                        {label}
                      </label>
                      <input
                        type="date" value={value}
                        min={min} max={max}
                        onChange={e => set(e.target.value)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '13px',
                          colorScheme: 'dark', outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '14px', lineHeight: 1.6 }}>
                  Pulls hourly data for each body over the selected range. Useful for validating the physics engine against JPL reference trajectories.
                  Stored in history — does not change the active simulation epoch.
                </p>
                <button
                  onClick={handlePullArchive}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    background: 'rgba(251,146,60,0.15)', color: '#fdba74',
                    border: '0.5px solid rgba(251,146,60,0.3)',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Pull Archive
                </button>
              </>
            )}

            {pullError && (
              <div style={{
                marginTop: '12px', padding: '12px 14px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5', fontSize: '12px', lineHeight: 1.5,
              }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Pull failed</strong>
                {pullError}
                <button
                  onClick={pullMode === 'snapshot' ? handlePullSnapshot : handlePullArchive}
                  style={{
                    marginTop: '8px', padding: '5px 12px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
                    border: '0.5px solid rgba(239,68,68,0.3)', fontSize: '12px', cursor: 'pointer',
                  }}
                >Retry</button>
              </div>
            )}
          </>
        ) : (
          <PullProgress
            progress={progress}
            totalBodies={totalBodies}
            label={pullMode === 'snapshot' ? 'Fetching snapshot from JPL Horizons…' : 'Fetching archive from JPL Horizons…'}
          />
        )}
      </div>

      {/* ── History ───────────────────────────────────────────────── */}
      <div>
        <SectionHeader label="History" color="#fb923c" />
        {records.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: '0 0 0 14px' }}>
            No history yet — pull a snapshot to get started.
          </p>
        ) : (
          <div>
            {records.map(record => (
              <HistoryRow
                key={record.id}
                record={record}
                isActive={record.id === activeId}
                onLoad={() => handleLoad(record)}
                onDelete={() => handleDelete(record.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
