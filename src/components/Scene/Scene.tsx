import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Lights } from './Lights';
import { CelestialBody } from './CelestialBody';
import { OrbitalTrail } from './OrbitalTrail';
import { ParticleExplosion } from './ParticleExplosion';
import { Stars } from './Stars';
import type { VisualBody, Particle, PhysicsBody } from '../../types';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import { useCameraFocus } from '../../hooks/useCameraFocus';

interface SceneProps {
  visualBodies: VisualBody[];
  particles: Particle[];
  visualScale: number;
  useVisualScale: boolean;
  onObjectSelect: (index: number) => void;
  onParticleComplete: (index: number) => void;
  controlsRef: React.MutableRefObject<any>;
  updatePhysics: () => void;
  focusedObject: PhysicsBody | null;
  orbitVisibility: Record<string, boolean>;
  setObserverPosition: (x: number, y: number, z: number) => void;
  simTime: number;
}

// Component that calls updatePhysics on every frame
function PhysicsUpdater({ 
  updatePhysics, 
  setObserverPosition 
}: { 
  updatePhysics: () => void;
  setObserverPosition: (x: number, y: number, z: number) => void;
}) {
  const { camera } = useThree();
  
  useFrame(() => {
    setObserverPosition(camera.position.x, camera.position.y, camera.position.z);
    updatePhysics();
  });
  return null;
}

// Component that handles camera following focused object
function CameraFollower({
  focusedObject,
  visualBodies,
  visualScale,
  useVisualScale,
  controlsRef
}: {
  focusedObject: PhysicsBody | null;
  visualBodies: VisualBody[];
  visualScale: number;
  useVisualScale: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  
  useCameraFocus(
    focusedObject,
    visualBodies,
    visualScale,
    useVisualScale,
    controlsRef,
    cameraRef
  );
  
  return null;
}

export function Scene({
  visualBodies,
  particles,
  visualScale,
  useVisualScale,
  onObjectSelect,
  onParticleComplete,
  controlsRef,
  updatePhysics,
  setObserverPosition,
  focusedObject,
  orbitVisibility
}: SceneProps) {
  // Find Sun for lighting reference
  const sun = visualBodies.find(vb => vb.body.name === 'Sun');
  const sunPosition = sun ? sun.mesh.position : new THREE.Vector3(0, 0, 0);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        shadows
        camera={{ position: [0, 20000, 10000], fov: 50, near: 1e-6, far: 1000000, layers: undefined }} 
        onCreated={({ camera }) => {
          camera.layers.enable(1); // Enable Layer 1 so we can see focused objects
        }}
        gl={{ 
          logarithmicDepthBuffer: true,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color attach="background" args={['#000005']} />
        
        <Suspense fallback={null}>
          <Stars />
        </Suspense>

        <Lights 
          visualBodies={visualBodies}
          focusedObject={focusedObject}
          visualScale={visualScale}
        />
        
        <OrbitControls 
          ref={controlsRef}
          makeDefault
          enableDamping 
          dampingFactor={0.05} 
          minDistance={1e-5}
          maxDistance={200000}
          enablePan
        />
        
        {/* Physics update loop */}
        <PhysicsUpdater 
          updatePhysics={updatePhysics} 
          setObserverPosition={setObserverPosition}
        />
        
        {/* Camera follow system */}
        <CameraFollower
          focusedObject={focusedObject}
          visualBodies={visualBodies}
          visualScale={visualScale}
          useVisualScale={useVisualScale}
          controlsRef={controlsRef}
        />
        
        {/* Render all celestial bodies */}
        {visualBodies.map((vb, index) => {
          const staticData = SOLAR_SYSTEM_DATA.find(d => d.name === vb.body.name);
          if (!staticData) return null;
          
          // Use the texture from the visual body (which comes from SetupScreen) 
          // instead of the static data
          const data = {
            ...staticData,
            texture: vb.textureUrl || staticData.texture
          };
          
          // Determine if this body should be in the "High Quality" layer (Layer 1)
          let layer = 0;
          if (data.type === 'star') {
            layer = 1; // Stars exist in both effectively, but we put them in 1 to interact with SpotLight
          } else if (focusedObject) {
            const isFocused = vb.body.name === focusedObject.name;
            const isChildOfFocused = vb.body.parentName === focusedObject.name;
            const isParentOfFocused = focusedObject.parentName === vb.body.name;
            
            if (isFocused || isChildOfFocused || isParentOfFocused) {
              layer = 1;
            }
          }

          // Find parent visual body if it exists
          const parentVisualBody = vb.body.parentName 
            ? visualBodies.find(p => p.body.name === vb.body.parentName)
            : undefined;

          return (
            <group key={vb.body.name}>
              <Suspense fallback={null}>
                <CelestialBody
                  data={data}
                  visualBody={vb}
                  parentVisualBody={parentVisualBody}
                  visualScale={visualScale}
                  useVisualScale={useVisualScale}
                  onClick={() => onObjectSelect(index)}
                  layer={layer}
                  sunPosition={sunPosition}
                />
              </Suspense>
              
              <OrbitalTrail 
                key={`trail-${vb.body.name}`} 
                trail={vb.trail} 
                visible={orbitVisibility[vb.body.name] !== false} // Default to true if undefined
              />
            </group>
          );
        })}
        
        {/* Render particle explosions */}
        {particles.map((particle, index) => (
          <ParticleExplosion
            key={index}
            position={particle.mesh.position.clone()}
            onComplete={() => onParticleComplete(index)}
          />
        ))}
      </Canvas>
    </div>
  );
}
