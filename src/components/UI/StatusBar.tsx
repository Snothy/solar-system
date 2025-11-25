import styles from './StatusBar.module.css';

interface StatusBarProps {
  currentDate: Date;
  timeStep: number;
}

export function StatusBar({ currentDate, timeStep }: StatusBarProps) {
  const formatSpeed = (val: number) => {
    if (val === 0) return "Real-time";
    if (val < 60) return `${val} sec/s`;
    if (val < 3600) return `${(val / 60).toFixed(1)} min/s`;
    if (val < 86400) return `${(val / 3600).toFixed(1)} hr/s`;
    if (val < 604800) return `${(val / 86400).toFixed(1)} day/s`;
    return `${(val / 604800).toFixed(1)} wk/s`;
  };

  return (
    <div className={styles.statusBar}>
      <div className={styles.dateDisplay}>{currentDate.toLocaleString()}</div>
      <div className={styles.speedDisplay}>{formatSpeed(timeStep)}</div>
    </div>
  );
}
