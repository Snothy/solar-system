import { useRef, useState } from 'react';
import { Scene } from './components/Scene/Scene';
import { Sidebar } from './components/UI/Sidebar';
import { ScaleControls } from './components/UI/ScaleControls';
import { TimeControls } from './components/UI/TimeControls';
import { ObjectList } from './components/UI/ObjectList';
import { SelectionPanel } from './components/UI/SelectionPanel';
import { StatusBar } from './components/UI/StatusBar';
import { PropertyEditor } from './components/UI/PropertyEditor';
import { Minimap } from './components/UI/Minimap';
import { SetupScreen } from './components/UI/SetupScreen';
import { PhysicsSettings } from './components/UI/PhysicsSettings';
import { PerformanceSettings } from './components/UI/PerformanceSettings';
import { SearchPanel } from './components/UI/SearchPanel';
import { useSimulation } from './hooks/useSimulation';
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
    physicsCompute, // GPU/Worker compute interface
    addBody
  } = useSimulation(simulationData, simulationStartDate);

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
      >
        <ScaleControls
          visualScale={visualScale}
          useVisualScale={useVisualScale}
          onVisualScaleChange={setVisualScale}
          onUseVisualScaleChange={setUseVisualScale}
        />

        <PhysicsSettings
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
        />

        <PerformanceSettings
          computeMode={physicsCompute.computeMode}
          setComputeMode={physicsCompute.setComputeMode}
          metrics={physicsCompute.getPerformanceMetrics()}
          workerAvailable={physicsCompute.workerReady}
          gpuAvailable={physicsCompute.gpuReady}
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
    </>
  );
}

export default App;
