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
    setUseLightTimeDelay
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

        <div className="p-4 border-b border-white/10">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
            Physics
          </h3>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={useLightTimeDelay}
              onChange={(e) => setUseLightTimeDelay(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span>Light Time Delay</span>
          </label>
        </div>

        <TimeControls
          timeStep={timeStep}
          isPaused={isPaused}
          onTimeStepChange={setTimeStep}
          onPauseToggle={handlePauseToggle}
        />

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
