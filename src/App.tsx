import { useRef, useState, useEffect } from 'react';
import { Scene } from './components/Scene/Scene';
import { Sidebar } from './components/UI/Sidebar';

import { TimeControls } from './components/UI/TimeControls';
import { ObjectList } from './components/UI/ObjectList';
import { SelectionPanel } from './components/UI/SelectionPanel';
import { StatusBar } from './components/UI/StatusBar';
import { PropertyEditor } from './components/UI/PropertyEditor';
import { Minimap } from './components/UI/Minimap';
import { SetupScreen } from './components/UI/SetupScreen';
import { SettingsModal } from './components/UI/SettingsModal';
import { PerformanceSettings } from './components/UI/PerformanceSettings';
import { SearchPanel } from './components/UI/SearchPanel';
import { useSimulation } from './hooks/useSimulation';
import type { PerformanceMetrics } from './utils/PerformanceMonitor';
import './index.css';

export function App() {
  const controlsRef = useRef<any>(null);
  const [simulationReady, setSimulationReady] = useState(false);
  const [simulationData, setSimulationData] = useState<any[] | null>(null);
  const [simulationStartDate, setSimulationStartDate] = useState<Date>(new Date());

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
    // New Toggles
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
    physicsCompute, // GPU/Worker compute interface
    addBody
  } = useSimulation(simulationData, simulationStartDate);

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
    }, 250); // Update 4 times per second

    return () => clearInterval(interval);
  }, [physicsCompute]);

  const handleObjectSelect = (index: number) => {
    setSelectedObject(visualBodies[index].body);
    setFocusedObject(visualBodies[index].body);
  };

  const handleFocusCamera = () => {
    if (selectedObject) {
      setFocusedObject(selectedObject);
    }
  };

  const handleUnfocusCamera = () => {
    setFocusedObject(null);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const [showMinimap, setShowMinimap] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const handleSimulationStart = (data: any[], date: Date) => {
    setSimulationData(data);
    setSimulationStartDate(date);
    setSimulationReady(true);
  };

  if (!simulationReady) {
    return <SetupScreen onSimulationStart={handleSimulationStart} />;
  }

  return (
    <>

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
      />

      <Sidebar
        showMinimap={showMinimap}
        onToggleMinimap={setShowMinimap}
        onOpenSettings={() => setShowSettings(true)}
      >


        <PerformanceSettings
          metrics={performanceMetrics}
        />

        <TimeControls
          timeStep={timeStep}
          isPaused={isPaused}
          onTimeStepChange={setTimeStep}
          onPauseToggle={handlePauseToggle}
        />

        <SearchPanel onAddBody={addBody} />

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

        <SelectionPanel
          selectedObject={selectedObject}
          onFocusCamera={handleFocusCamera}
          onUnfocusCamera={handleUnfocusCamera}
        />
      </Sidebar>

      <StatusBar currentDate={new Date(simTime)} timeStep={timeStep} />

      {selectedObject && (
        <PropertyEditor
          body={selectedObject}
          onUpdate={updateBody}
          onClose={() => {
            setSelectedObject(null);
            setFocusedObject(null);
          }}
        />
      )}

      {/* Removed old loading screen since SetupScreen handles it */}
      
      {showMinimap && (
        <Minimap 
          visualBodies={visualBodies} 
          focusedObject={focusedObject} 
          onFocus={(body) => {
            setSelectedObject(body);
            setFocusedObject(body);
          }}
        />
      )}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
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
        
        // New Props
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
            if (val && visualScale === 1) setVisualScale(1000); // Default to 1000x if enabling from 1x
            else if (!val) setVisualScale(1);
        }}
        visualScale={visualScale}
        onSetVisualScale={setVisualScale}
      />
    </>
  );
}

export default App;
