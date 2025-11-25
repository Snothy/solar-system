import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Lights } from './Lights';
import { CelestialBody } from './CelestialBody';
import { OrbitalTrail } from './OrbitalTrail';
import { ParticleExplosion } from './ParticleExplosion';
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
  focusedObjectPrevPos: React.MutableRefObject<THREE.Vector3>;
  orbitVisibility: Record<string, boolean>;
}

// Component that calls updatePhysics on every frame
function PhysicsUpdater({ updatePhysics }: { updatePhysics: () => void }) {
  useFrame(() => {
    updatePhysics();
  });
  return null;
}

// Component that handles camera following focused object
function CameraFollower({
  focusedObject,
  focusedObjectPrevPos,
  visualBodies,
  visualScale,
  useVisualScale,
  controlsRef
}: {
  focusedObject: PhysicsBody | null;
  focusedObjectPrevPos: React.MutableRefObject<THREE.Vector3>;
  visualBodies: VisualBody[];
  visualScale: number;
  useVisualScale: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  
  useCameraFocus(
    focusedObject,
    focusedObjectPrevPos,
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
  focusedObject,
  focusedObjectPrevPos,
  orbitVisibility
}: SceneProps) {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 4000, 6000], fov: 50, near: 1e-6, far: 1000000 }}
        gl={{ 
          logarithmicDepthBuffer: true,
          outputColorSpace: THREE.SRGBColorSpace 
        }}
      >
        <color attach="background" args={['#000005']} />
        
        <Lights />
        
        <OrbitControls 
          ref={controlsRef}
          enableDamping 
          dampingFactor={0.05} 
          minDistance={1e-5}
          maxDistance={200000}
          enablePan
        />
        
        {/* Physics update loop */}
        <PhysicsUpdater updatePhysics={updatePhysics} />
        
        {/* Camera follow system */}
        <CameraFollower
          focusedObject={focusedObject}
          focusedObjectPrevPos={focusedObjectPrevPos}
          visualBodies={visualBodies}
          visualScale={visualScale}
          useVisualScale={useVisualScale}
          controlsRef={controlsRef}
        />
        
        {/* Render all celestial bodies */}
        {visualBodies.map((vb, index) => {
          const data = SOLAR_SYSTEM_DATA.find(d => d.name === vb.body.name);
          if (!data) return null;
          
          return (
            <group key={vb.body.name}>
              <Suspense fallback={null}>
                <CelestialBody
                  data={data}
                  visualBody={vb}
                  visualScale={visualScale}
                  useVisualScale={useVisualScale}
                  onClick={() => onObjectSelect(index)}
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
