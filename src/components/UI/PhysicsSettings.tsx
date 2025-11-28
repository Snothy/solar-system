

export type IntegratorMode = 'standard' | 'adaptive' | 'wisdom-holman' | 'saba4' | 'high-precision';

export interface PhysicsSettingsProps {
  enableTidalEvolution: boolean;
  enableAtmosphericDrag: boolean;
  enableYarkovsky: boolean;
  enablePrecession: boolean;
  enableNutation: boolean;
  useTDBTime: boolean;
  enableLightAberration: boolean;
  useLightTimeDelay: boolean;
  onToggleTidalEvolution: (enabled: boolean) => void;
  onToggleAtmosphericDrag: (enabled: boolean) => void;
  onToggleYarkovsky: (enabled: boolean) => void;
  onTogglePrecession: (enabled: boolean) => void;
  onToggleNutation: (enabled: boolean) => void;
  onToggleTDBTime: (enabled: boolean) => void;
  onToggleLightAberration: (enabled: boolean) => void;
  onToggleLightTimeDelay: (enabled: boolean) => void;
  enableRelativity: boolean;
  onToggleRelativity: (enabled: boolean) => void;
  
  // Integrator Mode
  integratorMode: IntegratorMode;
  onSetIntegratorMode: (mode: IntegratorMode) => void;
  adaptiveQuality: number;
  onSetAdaptiveQuality: (quality: number) => void;
  wisdomHolmanQuality: number;
  onSetWisdomHolmanQuality: (quality: number) => void;
  
  // New Props
  enableSolarMassLoss: boolean;
  onToggleSolarMassLoss: (enabled: boolean) => void;
  enableCollisions: boolean;
  onToggleCollisions: (enabled: boolean) => void;
  enablePRDrag: boolean;
  onTogglePRDrag: (enabled: boolean) => void;
  useEIH: boolean;
  onToggleEIH: (enabled: boolean) => void;
  enableYORP: boolean;
  onToggleYORP: (enabled: boolean) => void;
  enableCometForces: boolean;
  onToggleCometForces: (enabled: boolean) => void;
  useVisualScale: boolean;
  onToggleVisualScale: (enabled: boolean) => void;
  visualScale: number;
  onSetVisualScale: (scale: number) => void;
}

interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (c: boolean) => void;
  tag?: string;
  disabled?: boolean;
}

function ToggleItem({ 
  label, 
  description, 
  checked, 
  onChange, 
  tag,
  disabled = false
}: ToggleItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        textAlign: 'left',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ paddingTop: '4px', flexShrink: 0 }}>
        <div 
          style={{
            width: '36px',
            height: '20px',
            borderRadius: '9999px',
            position: 'relative',
            transition: 'background-color 0.2s',
            backgroundColor: checked ? '#2563eb' : '#374151'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '16px',
              height: '16px',
              backgroundColor: 'white',
              borderRadius: '50%',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s',
              transform: checked ? 'translateX(16px)' : 'translateX(0)'
            }} 
          />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 500, 
            transition: 'color 0.2s',
            color: checked ? 'white' : '#d1d5db'
          }}>
            {label}
          </span>
          {tag && (
            <span style={{
              fontSize: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              color: '#93c5fd',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontFamily: 'monospace',
              flexShrink: 0
            }}>
              {tag}
            </span>
          )}
        </div>
        <p style={{ 
          fontSize: '11px', 
          color: '#9ca3af', 
          marginTop: '4px', 
          lineHeight: '1.2' 
        }}>
          {description}
        </p>
      </div>
    </button>
  );
}

export function PhysicsSettings({
  enableTidalEvolution,
  enableAtmosphericDrag,
  enableYarkovsky,
  enablePrecession,
  enableNutation,
  useTDBTime,
  enableLightAberration,
  useLightTimeDelay,
  onToggleTidalEvolution,
  onToggleAtmosphericDrag,
  onToggleYarkovsky,
  onTogglePrecession,
  onToggleNutation,
  onToggleTDBTime,
  onToggleLightAberration,
  onToggleLightTimeDelay,
  enableRelativity,
  onToggleRelativity,
  
  integratorMode,
  onSetIntegratorMode,
  adaptiveQuality,
  onSetAdaptiveQuality,
  wisdomHolmanQuality,
  onSetWisdomHolmanQuality,
  
  // New Props
  enableSolarMassLoss,
  onToggleSolarMassLoss,
  enableCollisions,
  onToggleCollisions,
  enablePRDrag,
  onTogglePRDrag,
  useEIH,
  onToggleEIH,
  enableYORP,
  onToggleYORP,
  enableCometForces,
  onToggleCometForces,
  useVisualScale,
  onToggleVisualScale,
  visualScale,
  onSetVisualScale
}: PhysicsSettingsProps) {
  
  const sectionHeaderStyle = {
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    marginBottom: '12px',
    paddingLeft: '8px',
    paddingRight: '8px',
    letterSpacing: '0.05em',
    display: 'flex',
    alignItems: 'center'
  };

  const dotStyle = {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    marginRight: '8px'
  };

  return (
    <div style={{ padding: '16px 8px' }}>      
      {/* Active Physics Features */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ ...sectionHeaderStyle, color: '#60a5fa' }}>
          <span style={{ ...dotStyle, backgroundColor: '#22c55e' }}></span>
          Active Physics Features
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <ToggleItem
            label="General Relativity"
            description={enableRelativity 
              ? "Enabled: Uses Einstein-Infeld-Hoffmann equations. Corrects Mercury's perihelion precession." 
              : "Disabled: Uses standard Newtonian gravity. Mercury's orbit will drift incorrectly over time."}
            checked={enableRelativity}
            onChange={onToggleRelativity}
            tag="EIH"
          />
          {enableRelativity && (
            <div style={{ marginLeft: '20px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
              <ToggleItem
                label="High-Precision GR (EIH)"
                description={useEIH
                  ? "Enabled: Full Einstein-Infeld-Hoffmann equations. Maximum accuracy."
                  : "Disabled: PPN Approximation. Faster, sufficient for most bodies."}
                checked={useEIH}
                onChange={onToggleEIH}
                tag={useEIH ? "MAX ACCURACY" : "FAST"}
              />
            </div>
          )}
          <ToggleItem
            label="Tidal Evolution"
            description={enableTidalEvolution
              ? "Enabled: Simulates tidal forces. Moon recedes ~3.8cm/yr and Earth's rotation slows."
              : "Disabled: No tidal friction. Moon's orbit and Earth's day length remain constant."}
            checked={enableTidalEvolution}
            onChange={onToggleTidalEvolution}
          />
          <ToggleItem
            label="Atmospheric Drag"
            description={enableAtmosphericDrag
              ? "Enabled: Applies air resistance. Low-orbit satellites will decay and de-orbit."
              : "Disabled: No air resistance. Satellites maintain altitude indefinitely."}
            checked={enableAtmosphericDrag}
            onChange={onToggleAtmosphericDrag}
          />
          <ToggleItem
            label="Yarkovsky Effect"
            description={enableYarkovsky
              ? "Enabled: Thermal photon thrust affects asteroid orbits over millennia."
              : "Disabled: No thermal thrust. Asteroids follow purely gravitational paths."}
            checked={enableYarkovsky}
            onChange={onToggleYarkovsky}
          />
          <ToggleItem
            label="Poynting-Robertson Drag"
            description={enablePRDrag
              ? "Enabled: Relativistic drag causes dust to spiral into the Sun."
              : "Disabled: Dust only affected by radiation pressure push."}
            checked={enablePRDrag}
            onChange={onTogglePRDrag}
          />
          <ToggleItem
            label="YORP Effect"
            description={enableYORP
              ? "Enabled: Radiation pressure alters asteroid spin rates over time."
              : "Disabled: Spin rates remain constant (unless tidal forces apply)."}
            checked={enableYORP}
            onChange={onToggleYORP}
          />
          <ToggleItem
            label="Cometary Forces"
            description={enableCometForces
              ? "Enabled: Non-gravitational forces (outgassing) affect cometary orbits."
              : "Disabled: Comets follow purely gravitational trajectories."}
            checked={enableCometForces}
            onChange={onToggleCometForces}
          />
        </div>
      </div>

      {/* Visual/Time Settings */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ ...sectionHeaderStyle, color: '#c084fc' }}>
          <span style={{ ...dotStyle, backgroundColor: '#a855f7' }}></span>
          Time & Observation
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <ToggleItem
            label="Enhanced Visibility (Visual Scale)"
            description={useVisualScale
              ? "Enabled: Planets/Moons rendered larger for visibility (Not to scale)."
              : "Disabled: 1:1 True Scale. Objects appear as tiny dots."}
            checked={useVisualScale}
            onChange={onToggleVisualScale}
            tag={useVisualScale ? "VISIBLE" : "TRUE SCALE"}
          />
          {useVisualScale && (
            <div style={{ marginLeft: '20px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px', paddingTop: '8px', paddingBottom: '8px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                 <label style={{ fontSize: '11px', color: '#9ca3af' }}>Magnification</label>
                 <span style={{ fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}>{visualScale}x</span>
               </div>
               <input
                 type="range"
                 min="1"
                 max="5000"
                 value={visualScale}
                 onChange={(e) => onSetVisualScale(Number(e.target.value))}
                 style={{
                   width: '100%',
                   height: '4px',
                   background: 'rgba(255,255,255,0.1)',
                   borderRadius: '2px',
                   appearance: 'none',
                   outline: 'none',
                   cursor: 'pointer'
                 }}
               />
            </div>
          )}
          <ToggleItem
            label="Barycentric Dynamical Time (TDB)"
            description={useTDBTime
              ? "Enabled: Uses relativistic time scale (TDB) for high-precision JPL matching."
              : "Disabled: Uses UTC. Simpler, but may drift milliseconds from JPL data."}
            checked={useTDBTime}
            onChange={onToggleTDBTime}
          />
          <ToggleItem
            label="Light-Time Delay"
            description={useLightTimeDelay
              ? "Enabled: Objects appear where they were when light left them (realistic view)."
              : "Disabled: Objects appear at their instantaneous geometric position."}
            checked={useLightTimeDelay}
            onChange={onToggleLightTimeDelay}
          />
          <ToggleItem
            label="Light Aberration"
            description={enableLightAberration
              ? "Enabled: Shifts apparent position based on Earth's velocity (stellar aberration)."
              : "Disabled: No velocity-based shift. Geometric position only."}
            checked={enableLightAberration}
            onChange={onToggleLightAberration}
          />
        </div>
      </div>

      {/* Advanced / Planned Features (Now Enabled) */}
      <div>
        <div style={{ ...sectionHeaderStyle, color: '#fb923c' }}>
          <span style={{ ...dotStyle, backgroundColor: '#f97316' }}></span>
          Advanced Dynamics
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          {/* Integrator Mode Selector */}
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            borderRadius: '8px',
            marginBottom: '8px'
          }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#d1d5db', marginBottom: '8px' }}>
              Integrator Mode
            </label>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'standard', label: 'Standard' },
                { id: 'adaptive', label: 'Adaptive' },
                { id: 'wisdom-holman', label: 'Wisdom-Holman' },
                { id: 'saba4', label: 'SABA4', highlight: true, badge: 'STABLE' },
                { id: 'high-precision', label: 'High Precision', highlight: true, badge: 'ACCURATE' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onSetIntegratorMode(mode.id as IntegratorMode)}
                  style={{
                    flex: '1 0 auto',
                    padding: '6px 8px',
                    fontSize: '10px',
                    backgroundColor: integratorMode === mode.id 
                      ? '#2563eb' 
                      : (mode.highlight ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255,255,255,0.05)'),
                    color: integratorMode === mode.id 
                      ? 'white' 
                      : (mode.highlight ? '#60a5fa' : '#9ca3af'),
                    border: mode.highlight && integratorMode !== mode.id ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: integratorMode === mode.id || mode.highlight ? 600 : 400,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {mode.label}
                  {mode.badge && (
                    <span style={{
                      fontSize: '8px',
                      backgroundColor: integratorMode === mode.id ? 'rgba(255,255,255,0.2)' : 'rgba(37, 99, 235, 0.2)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      color: integratorMode === mode.id ? 'white' : '#60a5fa'
                    }}>
                      {mode.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.4', margin: 0 }}>
              {integratorMode === 'standard' && "Basic physics. Good for simple tests, but not accurate for real orbits."}
              {integratorMode === 'adaptive' && "Good stability for crashing planets, but slow for normal orbits."}
              {integratorMode === 'wisdom-holman' && "The standard for solar system sims. Fast and stable for planets."}
              {integratorMode === 'saba4' && (
                <span>
                  <strong style={{ color: '#60a5fa' }}>SABA4 (Symplectic Corrector)</strong>: 
                  Fast, extremely stable, and best for long-running simulations (millions of years). 
                  Preserves energy better than any other method.
                </span>
              )}
              {integratorMode === 'high-precision' && (
                <span>
                  <strong style={{ color: '#60a5fa' }}>DOP853 (Runge-Kutta 8)</strong>: 
                  NASA-grade accuracy. The most accurate mode available. 
                  Best for precise ephemeris generation and mission planning.
                </span>
              )}
            </p>
          </div>

          {integratorMode === 'adaptive' && (
            <div style={{ marginLeft: '20px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '8px 0' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                  Adaptive Quality (Max Substep)
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { l: 'Low', v: 0, d: '60s' },
                    { l: 'Med', v: 1, d: '30s' },
                    { l: 'High', v: 2, d: '10s' },
                    { l: 'Ultra', v: 3, d: '1s' }
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => onSetAdaptiveQuality(opt.v)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        fontSize: '10px',
                        backgroundColor: adaptiveQuality === opt.v ? '#2563eb' : 'rgba(255,255,255,0.05)',
                        color: adaptiveQuality === opt.v ? 'white' : '#9ca3af',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={`Max Substep: ${opt.d}`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {integratorMode === 'wisdom-holman' && (
            <div style={{ marginLeft: '20px', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '8px 0' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                  Wisdom-Holman Quality (Max Substep)
</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { l: 'Low', v: 0, d: '300s' },
                    { l: 'Med', v: 1, d: '180s' },
                    { l: 'High', v: 2, d: '100s' },
                    { l: 'Ultra', v: 3, d: '60s' }
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => onSetWisdomHolmanQuality(opt.v)}
                      style={{
                        flex: 1,
                        padding: '4px',
                        fontSize: '10px',
                        backgroundColor: wisdomHolmanQuality === opt.v ? '#2563eb' : 'rgba(255,255,255,0.05)',
                        color: wisdomHolmanQuality === opt.v ? 'white' : '#9ca3af',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      title={`Max Substep: ${opt.d}`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <ToggleItem
            label="Axial Precession"
            description={enablePrecession
              ? "Enabled: Earth's axis wobbles over 26,000 years. Coordinates shift over time."
              : "Disabled: Earth's axis remains fixed relative to background stars."}
            checked={enablePrecession}
            onChange={onTogglePrecession}
          />
          <ToggleItem
            label="Nutation"
            description={enableNutation
              ? "Enabled: Adds short-term (18.6yr) wobble to Earth's axis."
              : "Disabled: Smooth precession only, ignoring lunar node influence."}
            checked={enableNutation}
            onChange={onToggleNutation}
          />
          <ToggleItem
            label="Solar Mass Loss"
            description={enableSolarMassLoss
              ? "Enabled: Sun loses mass over time (nuclear fusion/wind). Orbits expand slightly."
              : "Disabled: Sun mass constant. Idealized Keplerian orbits."}
            checked={enableSolarMassLoss}
            onChange={onToggleSolarMassLoss}
          />
          <ToggleItem
            label="Collision Detection"
            description={enableCollisions
              ? "Enabled: Bodies interact/merge on contact."
              : "Disabled: Ghost mode. Bodies pass through each other."}
            checked={enableCollisions}
            onChange={onToggleCollisions}
          />
        </div>
      </div>
      
      <div style={{ 
        marginTop: '24px', 
        padding: '12px', 
        backgroundColor: 'rgba(30, 58, 138, 0.1)', 
        borderRadius: '4px', 
        border: '1px solid rgba(59, 130, 246, 0.2)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', color: '#93c5fd', fontSize: '11px', fontWeight: 500, marginBottom: '4px' }}>
          <span style={{ marginRight: '8px', fontSize: '14px' }}>ℹ️</span>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Simulation Accuracy</div>
            <p style={{ fontSize: '10px', color: 'rgba(96, 165, 250, 0.8)', lineHeight: '1.5', margin: 0 }}>
              This engine uses VSOP87/DE440 hybrid ephemerides with full N-body integration. 
              All active features use research-grade physics models validated against JPL data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
