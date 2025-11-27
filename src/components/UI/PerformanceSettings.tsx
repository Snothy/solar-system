import { useState } from 'react';
import type { ComputeMode, PerformanceMetrics } from '../../utils/PerformanceMonitor';
import './PerformanceSettings.css';

interface PerformanceSettingsProps {
  computeMode: ComputeMode;
  setComputeMode: (mode: ComputeMode) => void;
  metrics: PerformanceMetrics;
  workerAvailable: boolean;
  gpuAvailable: boolean;
}

export function PerformanceSettings({
  computeMode,
  setComputeMode,
  metrics,
  workerAvailable,
  gpuAvailable
}: PerformanceSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return '#00ff00';
    if (fps >= 30) return '#ffaa00';
    return '#ff0000';
  };

  const getModeStatus = (mode: string) => {
    if (mode === 'main') return '✓';
    if (mode === 'worker' && workerAvailable) return '✓';
    if (mode === 'gpu' && gpuAvailable) return '✓';
    return '✗';
  };

  return (
    <div className="performance-settings">
      <div className="performance-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="performance-title">
          <span className="icon">⚡</span>
          <span>Performance</span>
        </div>
        <div className="performance-quick-stats">
          <span className="fps" style={{ color: getFPSColor(metrics.fps) }}>
            {metrics.fps.toFixed(1)} FPS
          </span>
          <span className="mode-badge">{metrics.mode.toUpperCase()}</span>
        </div>
        <span className="expand-arrow">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="performance-content">
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-label">FPS:</span>
              <span className="metric-value" style={{ color: getFPSColor(metrics.fps) }}>
                {metrics.fps.toFixed(1)}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Frame Time:</span>
              <span className="metric-value">{metrics.avgFrameTime.toFixed(2)}ms</span>
            </div>
            <div className="metric">
              <span className="metric-label">Physics Time:</span>
              <span className="metric-value">{metrics.physicsTime.toFixed(2)}ms</span>
            </div>
            <div className="metric">
              <span className="metric-label">Render Time:</span>
              <span className="metric-value">{metrics.renderTime.toFixed(2)}ms</span>
            </div>
            <div className="metric">
              <span className="metric-label">Bodies:</span>
              <span className="metric-value">{metrics.bodyCount}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Physics %:</span>
              <span className="metric-value">
                {((metrics.physicsTime / metrics.avgFrameTime) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="mode-selector">
            <div className="selector-label">Compute Mode:</div>
            <div className="mode-buttons">
              <button
                className={`mode-button ${computeMode === 'auto' ? 'active' : ''}`}
                onClick={() => setComputeMode('auto')}
                title="Automatically select best mode based on body count"
              >
                Auto
              </button>
              <button
                className={`mode-button ${computeMode === 'main' ? 'active' : ''}`}
                onClick={() => setComputeMode('main')}
                title="Run physics on main thread (simple, but may block UI)"
              >
                <span className="mode-status">{getModeStatus('main')}</span> Main
              </button>
              <button
                className={`mode-button ${computeMode === 'worker' ? 'active' : ''}`}
                onClick={() => setComputeMode('worker')}
                disabled={!workerAvailable}
                title={workerAvailable ? "Run physics on worker thread (good for 50-500 bodies)" : "Web Worker not available"}
              >
                <span className="mode-status">{getModeStatus('worker')}</span> Worker
              </button>
              <button
                className={`mode-button ${computeMode === 'gpu' ? 'active' : ''}`}
                onClick={() => setComputeMode('gpu')}
                disabled={!gpuAvailable}
                title={gpuAvailable ? "Run physics on GPU (best for 500+ bodies)" : "WebGPU not available"}
              >
                <span className="mode-status">{getModeStatus('gpu')}</span> GPU
              </button>
            </div>
          </div>

          <div className="capabilities">
            <div className="capability">
              <span className={workerAvailable ? 'status available' : 'status unavailable'}>
                {workerAvailable ? '✓' : '✗'}
              </span>
              <span>Web Workers</span>
            </div>
            <div className="capability">
              <span className={gpuAvailable ? 'status available' : 'status unavailable'}>
                {gpuAvailable ? '✓' : '✗'}
              </span>
              <span>WebGPU</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
