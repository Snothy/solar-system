import { useState, memo } from 'react';
import type { PerformanceMetrics } from '../../utils/PerformanceMonitor';
import './PerformanceSettings.css';

interface PerformanceSettingsProps {
  metrics: PerformanceMetrics;
}

export const PerformanceSettings = memo(function PerformanceSettings({
  metrics
}: PerformanceSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="performance-settings">
      <div className="performance-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>Performance</span>
        <span className="fps-display">{Math.round(metrics.fps)} FPS</span>
      </div>

      {isExpanded && (
        <div className="performance-content">
          <div className="metric-row">
            <span className="metric-label">FPS:</span>
            <span className="metric-value">{metrics.fps.toFixed(1)}</span>
          </div>

          <div className="metric-row">
            <span className="metric-label">Physics Time:</span>
            <span className="metric-value">{metrics.physicsTime.toFixed(2)} ms</span>
          </div>

          <div className="metric-row">
            <span className="metric-label">Render Time:</span>
            <span className="metric-value">{metrics.renderTime.toFixed(2)} ms</span>
          </div>

          <div className="metric-row">
            <span className="metric-label">Body Count:</span>
            <span className="metric-value">{metrics.bodyCount}</span>
          </div>
        </div>
      )}
    </div>
  );
});
