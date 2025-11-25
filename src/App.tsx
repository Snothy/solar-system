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
    focusedObjectPrevPos,
    setTimeStep,
    setIsPaused,
    setVisualScale,
    setUseVisualScale,
    setSelectedObject,
    setFocusedObject,
    removeParticle,
    updatePhysics,
    updateBody,
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
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2 text-blue-400">Initializing Solar System...</div>
            <div className="text-sm text-gray-400">Fetching real-time data from NASA JPL Horizons</div>
          </div>
        </div>
      )}
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
        focusedObjectPrevPos={focusedObjectPrevPos}
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
            handleFocusCamera();
          }}
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
    </>
  );
}

export default App;
