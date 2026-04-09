/**
 * Integration Test View — state machine: setup | running | results
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTestRunner } from '../../hooks/useTestRunner';
import { saveTestRun } from '../../services/testStorage';
import { TestSetup } from './TestSetup';
import { TestResults } from './TestResults';
import { TestScene } from './TestScene';
import { TestTimeline } from './TestTimeline';
import type { ArchiveRecord } from '../../services/snapshotStorage';
import type { TestRun } from '../../services/testStorage';

interface Props {
  integratorMode: string;
  quality: number;
  enableRelativity: boolean;
  enableTidalEvolution: boolean;
  enableAtmosphericDrag: boolean;
  enableYarkovsky: boolean;
  enableGravitationalHarmonics: boolean;
  enableSolarRadiationPressure: boolean;
  visualScale: number;
  useVisualScale: boolean;
  onOpenSettings: () => void;
}

type ViewState =
  | { kind: 'setup' }
  | { kind: 'results'; testRun: TestRun; saved: boolean };

function fmtKm(km: number): string {
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)}M km`;
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${km.toFixed(0)} km`;
}

export function IntegrationTestView({
  integratorMode,
  quality,
  enableRelativity,
  enableTidalEvolution,
  enableAtmosphericDrag,
  enableYarkovsky,
  enableGravitationalHarmonics,
  enableSolarRadiationPressure,
  visualScale,
  useVisualScale,
  onOpenSettings,
}: Props) {
  const { state: runnerState, run, cancel } = useTestRunner();
  const [viewState, setViewState] = useState<ViewState>({ kind: 'setup' });

  // Timeline / playback state
  const [frameIdx, setFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [framesPerSec, setFramesPerSec] = useState(4);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [saving, setSaving] = useState(false);

  // Focus state for 3D scene
  const [focusedBody, setFocusedBody] = useState<string | null>(null);

  // When runner finishes, switch to results
  useEffect(() => {
    if (runnerState.kind === 'done') {
      setFrameIdx(0);
      setIsPlaying(false);
      setViewState({ kind: 'results', testRun: runnerState.testRun, saved: false });
    }
  }, [runnerState]);

  // Playback interval
  useEffect(() => {
    if (playRef.current) { clearInterval(playRef.current); playRef.current = null; }
    if (!isPlaying || viewState.kind !== 'results') return;
    const total = viewState.testRun.frames.length;
    playRef.current = setInterval(() => {
      setFrameIdx(prev => {
        if (prev >= total - 1) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, 1000 / framesPerSec);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, framesPerSec, viewState]);

  const handleRun = useCallback((archive: ArchiveRecord) => {
    run(archive, integratorMode as any, quality, {
      relativity: enableRelativity,
      gravitationalHarmonics: enableGravitationalHarmonics,
      tidalForces: enableTidalEvolution,
      solarRadiationPressure: enableSolarRadiationPressure,
      yarkovskyEffect: enableYarkovsky,
      atmosphericDrag: enableAtmosphericDrag,
    });
  }, [run, integratorMode, quality, enableRelativity, enableGravitationalHarmonics, enableTidalEvolution, enableSolarRadiationPressure, enableYarkovsky, enableAtmosphericDrag]);

  const handleReplay = useCallback((testRun: TestRun) => {
    setFrameIdx(0);
    setIsPlaying(false);
    setViewState({ kind: 'results', testRun, saved: true });
  }, []);

  const handleSave = useCallback(async () => {
    if (viewState.kind !== 'results' || saving) return;
    setSaving(true);
    try {
      await saveTestRun(viewState.testRun);
      setViewState(s => s.kind === 'results' ? { ...s, saved: true } : s);
    } finally {
      setSaving(false);
    }
  }, [viewState, saving]);

  const handleBack = () => {
    setIsPlaying(false);
    setFocusedBody(null);
    setViewState({ kind: 'setup' });
  };

  const activeSettings = {
    integratorMode,
    quality,
    enableRelativity,
    enableTidalEvolution,
    enableAtmosphericDrag,
    enableYarkovsky,
    enableGravitationalHarmonics,
    enableSolarRadiationPressure,
  };

  // ── Running state ────────────────────────────────────────────────────────────
  if (runnerState.kind === 'running') {
    const pct = runnerState.totalDays > 0
      ? Math.min(100, (runnerState.currentDay / runnerState.totalDays) * 100)
      : 0;

    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#000',
      }}>
        <div className="apple-panel" style={{
          width: '480px', padding: '40px', borderRadius: '24px',
          display: 'flex', flexDirection: 'column', gap: '28px',
        }}>
          {/* Title */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Integration Test
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#fff' }}>
              Running…
            </h2>
          </div>

          {/* Day progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                Day <span style={{ color: '#fff', fontWeight: 600 }}>{runnerState.currentDay.toFixed(1)}</span>
                {' '}/ {runnerState.totalDays.toFixed(1)}
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{pct.toFixed(0)}%</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, borderRadius: '3px',
                background: 'linear-gradient(90deg, #4ade80, #22d3ee)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Live body errors */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px',
            maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
          }}>
            {Object.entries(runnerState.liveErrors)
              .sort(([, a], [, b]) => b - a)
              .map(([name, errKm]) => {
                const color = errKm < 100 ? '#4ade80' : errKm < 1000 ? '#facc15' : '#f87171';
                return (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{name}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color, fontFamily: 'monospace' }}>
                      {fmtKm(errKm)}
                    </span>
                  </div>
                );
              })}
            {Object.keys(runnerState.liveErrors).length === 0 && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '8px 0' }}>
                Starting…
              </div>
            )}
          </div>

          {/* Cancel */}
          <button
            onClick={cancel}
            style={{
              padding: '12px', borderRadius: '12px', fontSize: '13px',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (runnerState.kind === 'error') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div className="apple-panel" style={{ width: '400px', padding: '32px', borderRadius: '20px', textAlign: 'center', gap: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '32px' }}>⚠</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#f87171' }}>Test Failed</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{runnerState.message}</div>
          <button onClick={handleBack} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px' }}>
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  // ── Setup state ──────────────────────────────────────────────────────────────
  if (viewState.kind === 'setup') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#000' }}>
        <TestSetup
          onRun={handleRun}
          onReplay={handleReplay}
          onOpenSettings={onOpenSettings}
          activeSettings={activeSettings}
        />
      </div>
    );
  }

  // ── Results state ────────────────────────────────────────────────────────────
  const { testRun, saved } = viewState;

  return (
    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Accuracy sidebar */}
        <TestResults
          testRun={testRun}
          onBack={handleBack}
          saved={saved}
          onSave={handleSave}
          saving={saving}
          onBodyClick={setFocusedBody}
          focusedBody={focusedBody}
        />

        {/* 3D scene */}
        <div style={{ flex: 1, position: 'relative' }}>
          <TestScene
            frames={testRun.frames}
            frameIdx={frameIdx}
            trailLength={48}
            onBodyClick={setFocusedBody}
            focusedBody={focusedBody}
            visualScale={visualScale}
            useVisualScale={useVisualScale}
          />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', height: '0' }}>
        <TestTimeline
          testRun={testRun}
          frameIdx={frameIdx}
          isPlaying={isPlaying}
          framesPerSec={framesPerSec}
          onSeek={setFrameIdx}
          onPlayPause={() => setIsPlaying(p => !p)}
          onSpeedChange={setFramesPerSec}
          onJumpStart={() => { setIsPlaying(false); setFrameIdx(0); }}
          onJumpEnd={() => { setIsPlaying(false); setFrameIdx(testRun.frames.length - 1); }}
        />
      </div>
    </div>
  );
}
