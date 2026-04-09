/**
 * Timeline scrubber for the integration test results view.
 * Shows playback controls, a date label, a draggable scrubber, and an
 * error graph strip above the track (one pixel column per frame).
 */

import { useEffect, useRef, useCallback } from 'react';
import type { TestRun } from '../../services/testStorage';

interface Props {
  testRun: TestRun;
  frameIdx: number;
  isPlaying: boolean;
  framesPerSec: number;
  onSeek: (idx: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (fps: number) => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
}

const SPEED_OPTIONS = [
  { fps: 1,  label: '1×' },
  { fps: 4,  label: '4×' },
  { fps: 12, label: '12×' },
  { fps: 30, label: '30×' },
];

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function TestTimeline({
  testRun,
  frameIdx,
  isPlaying,
  framesPerSec,
  onSeek,
  onPlayPause,
  onSpeedChange,
  onJumpStart,
  onJumpEnd,
}: Props) {
  const totalFrames = testRun.frames.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  const currentFrame = testRun.frames[frameIdx];
  const epochMs = currentFrame?.epochMs ?? testRun.startEpoch.unix_ms;

  // ── Draw error graph ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || totalFrames === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Compute per-frame max error
    const maxOverall = testRun.summary.overallMaxErrorKm || 1;
    const frameErrors = testRun.frames.map(f =>
      Math.max(...Object.values(f.bodies).map(b => b.errorKm), 0)
    );

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < totalFrames; i++) {
      const x = Math.floor((i / totalFrames) * W);
      const nextX = Math.floor(((i + 1) / totalFrames) * W);
      const t = Math.min(1, frameErrors[i] / maxOverall);

      // color green → yellow → red
      let r, g, b;
      if (t < 0.5) {
        r = Math.round(74 + (250 - 74) * (t * 2));
        g = Math.round(222 + (204 - 222) * (t * 2));
        b = Math.round(128 + (21 - 128) * (t * 2));
      } else {
        r = Math.round(250 + (248 - 250) * ((t - 0.5) * 2));
        g = Math.round(204 + (113 - 204) * ((t - 0.5) * 2));
        b = Math.round(21 + (113 - 21) * ((t - 0.5) * 2));
      }

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, 0, Math.max(1, nextX - x), H);
    }

    // Dim the whole strip slightly
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
  }, [testRun, totalFrames]);

  // ── Scrubber interaction ────────────────────────────────────────
  const seekFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    const track = trackRef.current;
    if (!track || totalFrames === 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Math.round(ratio * (totalFrames - 1)));
  }, [totalFrames, onSeek]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    seekFromEvent(e);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging.current) seekFromEvent(e); };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [seekFromEvent]);

  const thumbPct = totalFrames > 1 ? (frameIdx / (totalFrames - 1)) * 100 : 0;

  return (
    <div className="apple-panel" style={{
      position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
      width: '640px', maxWidth: '90vw', padding: '14px 24px 18px',
      borderRadius: '24px', zIndex: 100,
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', justifyContent: 'center' }}>

        {/* Jump to start */}
        <ControlBtn onClick={onJumpStart} title="Jump to start">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="2" height="12" rx="1" />
            <path d="M13 1L4 7l9 6V1z" />
          </svg>
        </ControlBtn>

        {/* Play/Pause */}
        <ControlBtn onClick={onPlayPause} style={{ width: '40px', height: '40px' }}>
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="4" height="12" rx="1.5" />
              <rect x="9" y="1" width="4" height="12" rx="1.5" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M2 1l11 6-11 6V1z" />
            </svg>
          )}
        </ControlBtn>

        {/* Jump to end */}
        <ControlBtn onClick={onJumpEnd} title="Jump to end">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="12" y="1" width="2" height="12" rx="1" />
            <path d="M1 1l9 6-9 6V1z" />
          </svg>
        </ControlBtn>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Date */}
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: '-0.01em' }}>
          {fmtDate(epochMs)}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Speed */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {SPEED_OPTIONS.map(opt => (
            <button
              key={opt.fps}
              onClick={() => onSpeedChange(opt.fps)}
              style={{
                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                background: framesPerSec === opt.fps ? 'rgba(255,255,255,0.18)' : 'transparent',
                color: framesPerSec === opt.fps ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error graph strip */}
      <canvas
        ref={canvasRef}
        width={640}
        height={16}
        style={{
          width: '100%', height: '14px', borderRadius: '4px',
          display: 'block', pointerEvents: 'none',
          background: 'rgba(255,255,255,0.04)',
        }}
      />

      {/* Scrubber track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative', height: '20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        {/* Track */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '3px', borderRadius: '2px',
          background: 'rgba(255,255,255,0.12)',
        }}>
          <div style={{
            height: '100%', width: `${thumbPct}%`, borderRadius: '2px',
            background: 'rgba(255,255,255,0.6)',
          }} />
        </div>

        {/* Thumb */}
        <div style={{
          position: 'absolute', left: `${thumbPct}%`, transform: 'translateX(-50%)',
          width: '14px', height: '14px', borderRadius: '50%',
          background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.5)',
          transition: isDragging.current ? 'none' : 'left 0.08s',
        }} />
      </div>

      {/* Start / end labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-6px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(testRun.startEpoch.unix_ms)}</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{fmtDate(testRun.endEpoch.unix_ms)}</span>
      </div>
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function ControlBtn({
  onClick,
  children,
  title,
  style,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'rgba(255,255,255,0.8)', transition: 'background 0.15s', flexShrink: 0,
        ...style,
      }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
      onMouseOut={e => e.currentTarget.style.background = (style?.background as string) ?? 'rgba(255,255,255,0.06)'}
    >
      {children}
    </button>
  );
}
