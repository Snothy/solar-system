import styles from './ScaleControls.module.css';

interface ScaleControlsProps {
  visualScale: number;
  useVisualScale: boolean;
  onVisualScaleChange: (value: number) => void;
  onUseVisualScaleChange: (value: boolean) => void;
}

export function ScaleControls({
  visualScale,
  useVisualScale,
  onVisualScaleChange,
  onUseVisualScaleChange
}: ScaleControlsProps) {
  return (
    <div className={styles.controlGroup}>
      <div className={styles.toggleWrapper}>
        <span className={styles.toggleLabel}>Scale Planets</span>
        <input
          type="checkbox"
          className={styles.toggleSwitch}
          checked={useVisualScale}
          onChange={(e) => onUseVisualScaleChange(e.target.checked)}
        />
      </div>
      
      <label className={styles.label}>
        <span>Magnification</span>
        <span className={styles.value}>{visualScale}x</span>
      </label>
      
      <input
        type="range"
        className={styles.slider}
        min="1"
        max="5000"
        value={visualScale}
        onChange={(e) => onVisualScaleChange(Number(e.target.value))}
      />
    </div>
  );
}
