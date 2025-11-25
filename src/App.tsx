import { useRef } from 'react';
import { Scene } from './components/Scene/Scene';
import { Sidebar } from './components/UI/Sidebar';
import { ScaleControls } from './components/UI/ScaleControls';
import { TimeControls } from './components/UI/TimeControls';
import { ObjectList } from './components/UI/ObjectList';
import { SelectionPanel } from './components/UI/SelectionPanel';
import { StatusBar } from './components/UI/StatusBar';
import { PropertyEditor } from './components/UI/PropertyEditor';
import { useSimulation } from './hooks/useSimulation';
import './index.css';

export function App() {
  const controlsRef = useRef<any>(null);

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
    isLoading
  } = useSimulation();

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
        focusedObject={focusedObject}
        orbitVisibility={orbitVisibility}
      />

      <Sidebar>
        <ScaleControls
          visualScale={visualScale}
          useVisualScale={useVisualScale}
          onVisualScaleChange={setVisualScale}
          onUseVisualScaleChange={setUseVisualScale}
        />

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

      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-500">
          <div className="flex flex-col items-center p-8 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
            <div className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Initializing OrbitEngine
            </div>
            <div className="text-sm text-gray-400 font-mono">
              Fetching ephemeris data from JPL Horizons...
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
