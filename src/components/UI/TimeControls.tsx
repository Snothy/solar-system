import styles from './TimeControls.module.css';
import { SPEED_PRESETS } from '../../utils/constants';

interface TimeControlsProps {
  timeStep: number;
  isPaused: boolean;
  onTimeStepChange: (value: number) => void;
  onPauseToggle: () => void;
}

export function TimeControls({
  timeStep,
  isPaused,
  onTimeStepChange,
  onPauseToggle
}: TimeControlsProps) {
  const formatSpeed = (val: number) => {
    if (val === 0) return "Realtime";
    if (val < 60) return `${val} sec/s`;
    if (val < 3600) return `${(val / 60).toFixed(1)} min/s`;
    if (val < 86400) return `${(val / 3600).toFixed(1)} hr/s`;
    if (val < 604800) return `${(val / 86400).toFixed(1)} day/s`;
    return `${(val / 604800).toFixed(1)} wk/s`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const quadraticVal = val * val;
    onTimeStepChange(Math.floor(quadraticVal));
  };

  const setSpeed = (value: number) => {
    onTimeStepChange(value);
  };

  return (
    <>
      <div className={styles.sectionTitle}>Simulation Time</div>
      <div className={styles.controlGroup}>
        <label className={styles.label}>
          <span>Speed</span>
          <span className={styles.value}>{formatSpeed(timeStep)}</span>
        </label>
        
        <input
          type="range"
          className={styles.slider}
          min="0"
          max="400"
          step="1"
          value={Math.sqrt(timeStep)}
          onChange={handleSliderChange}
        />
        
        <div className={styles.btnGrid}>
          <button onClick={() => setSpeed(SPEED_PRESETS.REALTIME)}>Real</button>
          <button onClick={() => setSpeed(SPEED_PRESETS.HOUR)}>Hour</button>
          <button onClick={() => setSpeed(SPEED_PRESETS.DAY)}>Day</button>
          <button onClick={() => setSpeed(SPEED_PRESETS.WEEK)}>Week</button>
        </div>
        
        <button 
          className={`${styles.primaryBtn} ${isPaused ? styles.active : ''}`}
          onClick={onPauseToggle}
        >
          {isPaused ? 'Resume Simulation' : 'Pause Simulation'}
        </button>
      </div>
    </>
  );
}
