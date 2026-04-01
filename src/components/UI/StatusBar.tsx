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
    <div style={{ 
      display: 'flex', alignItems: 'center', gap: '8px', 
      background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', 
      borderRadius: '8px', backdropFilter: 'blur(20px)'
    }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>
        {currentDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}{' '}
        {currentDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)' }} />
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
        {formatSpeed(timeStep)}
      </div>
    </div>
  );
}
