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
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const quadraticVal = val * val;
    onTimeStepChange(Math.floor(quadraticVal));
  };

  const setSpeed = (value: number) => {
    onTimeStepChange(value);
  };

  const isActive = (preset: number) => timeStep === preset;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
      {/* Play/Pause Button */}
      <button 
        onClick={onPauseToggle}
        style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: isPaused ? 'rgba(255,255,255,0.1)' : '#fff',
          color: isPaused ? '#fff' : '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isPaused ? 'none' : '0 2px 10px rgba(255,255,255,0.2)'
        }}
      >
        {isPaused ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        )}
      </button>

      {/* Main Scrubber */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          className="apple-scrubber"
          min="0"
          max="400"
          step="1"
          value={Math.sqrt(timeStep)}
          onChange={handleSliderChange}
        />
      </div>

      {/* Speed Presets (Segmented Control style) */}
      <div style={{
        display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', gap: '2px'
      }}>
        <SpeedBtn label="1X" active={isActive(SPEED_PRESETS.REALTIME)} onClick={() => setSpeed(SPEED_PRESETS.REALTIME)} />
        <SpeedBtn label="1H" active={isActive(SPEED_PRESETS.HOUR)} onClick={() => setSpeed(SPEED_PRESETS.HOUR)} />
        <SpeedBtn label="1D" active={isActive(SPEED_PRESETS.DAY)} onClick={() => setSpeed(SPEED_PRESETS.DAY)} />
        <SpeedBtn label="1W" active={isActive(SPEED_PRESETS.WEEK)} onClick={() => setSpeed(SPEED_PRESETS.WEEK)} />
      </div>
    </div>
  );
}

function SpeedBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 600,
        color: active ? '#000' : 'rgba(255,255,255,0.6)',
        background: active ? '#fff' : 'transparent',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
      }}
    >
      {label}
    </button>
  );
}
