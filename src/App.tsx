import { useRef, useState, useEffect } from 'react';
import { Scene } from './components/Scene/Scene';
import { TimeControls } from './components/UI/TimeControls';
import { ObjectList } from './components/UI/ObjectList';
import { StatusBar } from './components/UI/StatusBar';
import { PropertyEditor } from './components/UI/PropertyEditor';
import { SettingsModal } from './components/UI/SettingsModal';
import { IntegrationTestView } from './components/IntegrationTest/IntegrationTestView';
import { useSimulation } from './hooks/useSimulation';
import importedBodiesData from './data/bodies.json';
import baselineSnapshot from './data/jplSnapshot.json';
import { getLatestSnapshot } from './services/snapshotStorage';
import type { SnapshotData } from './services/jplFetchService';
import type { PerformanceMetrics } from './utils/PerformanceMonitor';
import './index.css';

export type ViewMode = 'realistic' | 'simplistic' | 'test';

/** Merge JPL positions/velocities from a snapshot onto the bodies array. */
function mergeBodiesWithSnapshot(bodies: any[], snapshot: SnapshotData): any[] {
  return bodies.map(body => {
    const snap = (snapshot.bodies as any)[body.name];
    return snap ? { ...body, pos: snap.pos, vel: snap.vel } : body;
  });
}

export function App() {
  const controlsRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('realistic');

  // Active snapshot — start with baseline, replace with IDB version if newer
  const [activeSnapshot, setActiveSnapshot] = useState<SnapshotData>(baselineSnapshot as unknown as SnapshotData);
  const [mergedBodies, setMergedBodies] = useState<any[]>(
    mergeBodiesWithSnapshot(importedBodiesData as any[], baselineSnapshot as unknown as SnapshotData)
  );

  // On mount: check IndexedDB for a more recent snapshot
  useEffect(() => {
    getLatestSnapshot().then(record => {
      if (record) {
        setActiveSnapshot(record);
        setMergedBodies(mergeBodiesWithSnapshot(importedBodiesData as any[], record));
      }
    }).catch(() => {/* no IDB data yet, use baseline */});
  }, []);

  const startDate = new Date(activeSnapshot.epoch.unix_ms);

  const {
    bodies,
    visualBodies,
    particles,
    simTime,
    timeStep,
    isPaused,
    visualScale,
    useVisualScale,
    selectedObject,
    focusedObject,
    setTimeStep,
    setIsPaused,
    setVisualScale,
    setUseVisualScale,
    setSelectedObject,
    setFocusedObject,
    removeParticle,
    updatePhysics,
    updateBody,
    orbitVisibility,
    toggleOrbitVisibility,
    setAllOrbitVisibility,
    setObserverPosition,
    useLightTimeDelay,
    setUseLightTimeDelay,
    enableTidalEvolution,
    enableAtmosphericDrag,
    enableYarkovsky,
    enablePrecession,
    enableNutation,
    useTDBTime,
    enableLightAberration,
    setEnableTidalEvolution,
    setEnableAtmosphericDrag,
    setEnableYarkovsky,
    setEnablePrecession,
    setEnableNutation,
    setUseTDBTime,
    setEnableLightAberration,
    enableRelativity,
    setEnableRelativity,
    integratorMode,
    setIntegratorMode,
    adaptiveQuality,
    setAdaptiveQuality,
    wisdomHolmanQuality,
    setWisdomHolmanQuality,
    sabaQuality,
    setSabaQuality,
    highPrecisionQuality,
    setHighPrecisionQuality,
    enableSolarMassLoss,
    setEnableSolarMassLoss,
    enableCollisions,
    setEnableCollisions,
    enablePRDrag,
    setEnablePRDrag,
    useEIH,
    setUseEIH,
    enableYORP,
    setEnableYORP,
    enableCometForces,
    setEnableCometForces,
    enableGravitationalHarmonics,
    setEnableGravitationalHarmonics,
    enableSolarRadiationPressure,
    setEnableSolarRadiationPressure,
    physicsCompute,
    reinitialize,
  } = useSimulation(mergedBodies, startDate);

  // Poll performance metrics periodically
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    physicsTime: 0,
    renderTime: 0,
    bodyCount: 0,
    mode: 'main',
    avgFrameTime: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(physicsCompute.getPerformanceMetrics());
    }, 250);
    return () => clearInterval(interval);
  }, [physicsCompute]);

  const handleObjectSelect = (index: number) => {
    setSelectedObject(visualBodies[index].body);
    setFocusedObject(visualBodies[index].body);
  };

  const handleFocusCamera = () => {
    if (selectedObject) setFocusedObject(selectedObject);
  };

  const handleUnfocusCamera = () => {
    setFocusedObject(null);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handlePauseToggle = () => setIsPaused(!isPaused);

  // When DataPanel loads a new snapshot, reinitialize the simulation
  const handleSnapshotLoaded = (snapshot: SnapshotData) => {
    setActiveSnapshot(snapshot);
    const newBodies = mergeBodiesWithSnapshot(importedBodiesData as any[], snapshot);
    setMergedBodies(newBodies);
    reinitialize(newBodies, new Date(snapshot.epoch.unix_ms));
  };

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000', position: 'relative' }}>

      {/* ── Integration Test View ── */}
      {viewMode === 'test' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
          {/* Top nav overlay so the segmented control stays visible */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 32px', zIndex: 110,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px', pointerEvents: 'auto' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', WebkitFontSmoothing: 'antialiased' }}>
                OrbitEngine
              </h1>
              <div className="apple-panel" style={{ display: 'flex', padding: '4px', borderRadius: '12px', gap: '4px', border: 'none', background: 'rgba(255,255,255,0.05)' }}>
                {(['realistic', 'simplistic', 'test'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                      background: viewMode === mode ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: viewMode === mode ? '#fff' : 'rgba(255,255,255,0.5)',
                      boxShadow: viewMode === mode ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ pointerEvents: 'auto' }}>
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s', padding: '8px'
                }}
                onMouseOver={e => e.currentTarget.style.color = '#fff'}
                onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
          </div>

          {/* Test view content, pushed below nav */}
          <div style={{ position: 'absolute', inset: 0, paddingTop: '64px' }}>
            <IntegrationTestView
              integratorMode={integratorMode}
              quality={
                integratorMode === 'saba4' ? sabaQuality :
                integratorMode === 'wisdom-holman' ? wisdomHolmanQuality :
                integratorMode === 'high-precision' ? highPrecisionQuality :
                adaptiveQuality
              }
              enableRelativity={enableRelativity}
              enableTidalEvolution={enableTidalEvolution}
              enableAtmosphericDrag={enableAtmosphericDrag}
              enableYarkovsky={enableYarkovsky}
              enableGravitationalHarmonics={enableGravitationalHarmonics}
              enableSolarRadiationPressure={enableSolarRadiationPressure}
              visualScale={visualScale}
              useVisualScale={useVisualScale}
              onOpenSettings={() => setShowSettings(true)}
            />
          </div>
        </div>
      )}

      {viewMode !== 'test' && (
      <Scene
        visualBodies={visualBodies}
        particles={particles}
        visualScale={visualScale}
        useVisualScale={useVisualScale}
        onObjectSelect={handleObjectSelect}
        onParticleComplete={removeParticle}
        controlsRef={controlsRef}
        updatePhysics={updatePhysics}
        setObserverPosition={setObserverPosition}
        focusedObject={focusedObject}
        orbitVisibility={orbitVisibility}
        simTime={simTime}
        viewMode={viewMode as 'realistic' | 'simplistic'}
      />
      )}

      {viewMode !== 'test' && <div className="ui-layer">

        {/* TOP NAVIGATION BAR */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 32px', zIndex: 100,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none'
        }}>
          {/* Logo / Title Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', pointerEvents: 'auto' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', WebkitFontSmoothing: 'antialiased' }}>
              OrbitEngine
            </h1>

            {/* View Mode Segmented Control */}
            <div className="apple-panel" style={{
              display: 'flex', padding: '4px', borderRadius: '12px', gap: '4px',
              border: 'none', background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <button
                onClick={() => setViewMode('realistic')}
                style={{
                  padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  background: viewMode === 'realistic' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: viewMode === 'realistic' ? '#fff' : 'rgba(255,255,255,0.5)',
                  boxShadow: viewMode === 'realistic' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                Realistic
              </button>
              <button
                onClick={() => setViewMode('simplistic')}
                style={{
                  padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  background: viewMode === 'simplistic' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: viewMode === 'simplistic' ? '#fff' : 'rgba(255,255,255,0.5)',
                  boxShadow: viewMode === 'simplistic' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                Simplistic
              </button>
              <button
                onClick={() => setViewMode('test')}
                style={{
                  padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  background: (viewMode as string) === 'test' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  color: (viewMode as string) === 'test' ? '#fff' : 'rgba(255,255,255,0.5)',
                  boxShadow: (viewMode as string) === 'test' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                Validation
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', pointerEvents: 'auto' }}>
            <StatusBar currentDate={new Date(simTime)} timeStep={timeStep} />
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)', transition: 'color 0.2s', padding: '8px'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#fff'}
              onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>

        {/* TINY METRICS (Bottom Left) */}
        <div style={{
          position: 'absolute', bottom: '16px', left: '20px', pointerEvents: 'auto',
          fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.05em'
        }}>
          {performanceMetrics.fps} FPS • {(performanceMetrics.avgFrameTime).toFixed(1)}ms
        </div>

        {/* BOTTOM BAR (Timeline Scrubber) */}
        <div className="apple-panel" style={{
          position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          width: '500px', maxWidth: '90vw', padding: '12px 24px', zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: '8px', borderRadius: '24px'
        }}>
          <TimeControls
            timeStep={timeStep}
            isPaused={isPaused}
            onTimeStepChange={setTimeStep}
            onPauseToggle={handlePauseToggle}
          />
        </div>

        {/* LEFT PANEL */}
        <div className="apple-panel" style={{
          position: 'absolute', top: '80px', left: '24px', width: '300px',
          maxHeight: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column', padding: '0', zIndex: 90,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            <ObjectList
              bodies={bodies}
              selectedObject={selectedObject}
              onSelect={(body) => {
                setSelectedObject(body);
                setFocusedObject(body);
              }}
              orbitVisibility={orbitVisibility}
              onToggleOrbit={toggleOrbitVisibility}
              onToggleAllOrbits={setAllOrbitVisibility}
            />
          </div>
        </div>

        {/* RIGHT PANELS */}
        {selectedObject && (
          <PropertyEditor
            body={selectedObject}
            onUpdate={updateBody}
            onClose={() => {
              setSelectedObject(null);
              setFocusedObject(null);
            }}
            onFocusCamera={handleFocusCamera}
            onUnfocusCamera={handleUnfocusCamera}
          />
        )}

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          currentSnapshot={activeSnapshot}
          onSnapshotLoaded={handleSnapshotLoaded}
          enableTidalEvolution={enableTidalEvolution}
          enableAtmosphericDrag={enableAtmosphericDrag}
          enableYarkovsky={enableYarkovsky}
          enablePrecession={enablePrecession}
          enableNutation={enableNutation}
          useTDBTime={useTDBTime}
          enableLightAberration={enableLightAberration}
          useLightTimeDelay={useLightTimeDelay}
          onToggleTidalEvolution={setEnableTidalEvolution}
          onToggleAtmosphericDrag={setEnableAtmosphericDrag}
          onToggleYarkovsky={setEnableYarkovsky}
          onTogglePrecession={setEnablePrecession}
          onToggleNutation={setEnableNutation}
          onToggleTDBTime={setUseTDBTime}
          onToggleLightAberration={setEnableLightAberration}
          onToggleLightTimeDelay={setUseLightTimeDelay}
          enableRelativity={enableRelativity}
          onToggleRelativity={setEnableRelativity}
          integratorMode={integratorMode}
          onSetIntegratorMode={setIntegratorMode}
          adaptiveQuality={adaptiveQuality}
          onSetAdaptiveQuality={setAdaptiveQuality}
          wisdomHolmanQuality={wisdomHolmanQuality}
          onSetWisdomHolmanQuality={setWisdomHolmanQuality}
          sabaQuality={sabaQuality}
          onSetSabaQuality={setSabaQuality}
          highPrecisionQuality={highPrecisionQuality}
          onSetHighPrecisionQuality={setHighPrecisionQuality}
          enableSolarMassLoss={enableSolarMassLoss}
          onToggleSolarMassLoss={setEnableSolarMassLoss}
          enableCollisions={enableCollisions}
          onToggleCollisions={setEnableCollisions}
          enablePRDrag={enablePRDrag}
          onTogglePRDrag={setEnablePRDrag}
          useEIH={useEIH}
          onToggleEIH={setUseEIH}
          enableYORP={enableYORP}
          onToggleYORP={setEnableYORP}
          enableCometForces={enableCometForces}
          onToggleCometForces={setEnableCometForces}
          enableGravitationalHarmonics={enableGravitationalHarmonics}
          onToggleGravitationalHarmonics={setEnableGravitationalHarmonics}
          enableSolarRadiationPressure={enableSolarRadiationPressure}
          onToggleSolarRadiationPressure={setEnableSolarRadiationPressure}
          useVisualScale={useVisualScale}
          onToggleVisualScale={(val) => {
            setUseVisualScale(val);
            if (val && visualScale === 1) setVisualScale(1000);
            else if (!val) setVisualScale(1);
          }}
          visualScale={visualScale}
          onSetVisualScale={setVisualScale}
        />
      </div>}

      {/* Settings modal accessible from test mode too */}
      {viewMode === 'test' && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          currentSnapshot={activeSnapshot}
          onSnapshotLoaded={handleSnapshotLoaded}
          enableTidalEvolution={enableTidalEvolution}
          enableAtmosphericDrag={enableAtmosphericDrag}
          enableYarkovsky={enableYarkovsky}
          enablePrecession={enablePrecession}
          enableNutation={enableNutation}
          useTDBTime={useTDBTime}
          enableLightAberration={enableLightAberration}
          useLightTimeDelay={useLightTimeDelay}
          onToggleTidalEvolution={setEnableTidalEvolution}
          onToggleAtmosphericDrag={setEnableAtmosphericDrag}
          onToggleYarkovsky={setEnableYarkovsky}
          onTogglePrecession={setEnablePrecession}
          onToggleNutation={setEnableNutation}
          onToggleTDBTime={setUseTDBTime}
          onToggleLightAberration={setEnableLightAberration}
          onToggleLightTimeDelay={setUseLightTimeDelay}
          enableRelativity={enableRelativity}
          onToggleRelativity={setEnableRelativity}
          integratorMode={integratorMode}
          onSetIntegratorMode={setIntegratorMode}
          adaptiveQuality={adaptiveQuality}
          onSetAdaptiveQuality={setAdaptiveQuality}
          wisdomHolmanQuality={wisdomHolmanQuality}
          onSetWisdomHolmanQuality={setWisdomHolmanQuality}
          sabaQuality={sabaQuality}
          onSetSabaQuality={setSabaQuality}
          highPrecisionQuality={highPrecisionQuality}
          onSetHighPrecisionQuality={setHighPrecisionQuality}
          enableSolarMassLoss={enableSolarMassLoss}
          onToggleSolarMassLoss={setEnableSolarMassLoss}
          enableCollisions={enableCollisions}
          onToggleCollisions={setEnableCollisions}
          enablePRDrag={enablePRDrag}
          onTogglePRDrag={setEnablePRDrag}
          useEIH={useEIH}
          onToggleEIH={setUseEIH}
          enableYORP={enableYORP}
          onToggleYORP={setEnableYORP}
          enableCometForces={enableCometForces}
          onToggleCometForces={setEnableCometForces}
          enableGravitationalHarmonics={enableGravitationalHarmonics}
          onToggleGravitationalHarmonics={setEnableGravitationalHarmonics}
          enableSolarRadiationPressure={enableSolarRadiationPressure}
          onToggleSolarRadiationPressure={setEnableSolarRadiationPressure}
          useVisualScale={useVisualScale}
          onToggleVisualScale={(val) => {
            setUseVisualScale(val);
            if (val && visualScale === 1) setVisualScale(1000);
            else if (!val) setVisualScale(1);
          }}
          visualScale={visualScale}
          onSetVisualScale={setVisualScale}
        />
      )}
    </div>
  );
}

export default App;
