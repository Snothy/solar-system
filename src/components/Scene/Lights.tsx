import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualBody, PhysicsBody } from '../../types';


interface LightsProps {
  visualBodies: VisualBody[];
  focusedObject: PhysicsBody | null;
  visualScale: number;
}

export function Lights({ visualBodies, focusedObject, visualScale }: LightsProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  // Find all stars (light sources)
  const stars = useMemo(() => {
    return visualBodies.filter(vb => vb.type === 'star');
  }, [visualBodies]);

  // Update light target and shadow box every frame
  useFrame(() => {
    if (focusedObject && lightRef.current) {
      const focusedVisual = visualBodies.find(vb => vb.body.name === focusedObject.name);
      
      if (focusedVisual) {
        // 1. Update Target
        targetRef.current.position.copy(focusedVisual.mesh.position);
        targetRef.current.updateMatrixWorld();
        lightRef.current.target = targetRef.current;

        // 2. Calculate Shadow Box Size (Orthographic)
        // We need a box that covers the focused object and its moons.
        const systemRadius = Math.max(
          focusedVisual.baseRadius * (visualScale > 1 ? visualScale : 1) * 15,
          0.05 // Minimum 0.05 units
        );

        // Update shadow camera bounds to tightly fit the system
        const camera = lightRef.current.shadow.camera;
        camera.left = -systemRadius;
        camera.right = systemRadius;
        camera.top = systemRadius;
        camera.bottom = -systemRadius;
        
        // 3. Dynamic Depth Range
        const distance = focusedVisual.mesh.position.length();
        // Directional light position is relative to the star.
        // If the star is at 0,0,0, and we put the light at 0,0,0, the "distance" to target is just length().
        // However, for DirectionalLight, the "position" defines the light vector direction.
        // We want the light to come FROM the star TO the planet.
        // Since the light is in a group at the star's position, setting light position to 0,0,0 works.
        // BUT, the shadow camera needs to be positioned correctly.
        // Actually, it's better to position the directional light closer to the object 
        // along the vector from star to object to maximize precision, 
        // but keeping it at the star is simpler if we manage near/far.
        
        camera.near = Math.max(0.1, distance - systemRadius * 5);
        camera.far = distance + systemRadius * 5;
        
        camera.updateProjectionMatrix();
      }
    }
  });

  return (
    <>
      <primitive object={targetRef.current} />
      
      {/* Ambient Light - very dim for space */}
      <ambientLight intensity={0.08} />
      
      {stars.map(star => (
        <group key={star.body.name} position={star.mesh.position}>
          {/* 1. Global Fill Light (Point) - Layer 0 Only (Non-focused objects) */}
          <pointLight 
            intensity={25000} // Physically accurate intensity for 1 AU distance with decay=2
            distance={0} 
            decay={2} // Inverse Square Law
            layers={0} 
          />

          {/* 2. Smart Focused Light (Directional) - Layer 1 Only (Focused objects) */}
          {focusedObject && (
            <directionalLight
              ref={lightRef}
              intensity={3.0} // Sun is bright!
              castShadow
              shadow-mapSize-width={4096} 
              shadow-mapSize-height={4096}
              shadow-bias={-0.0001} 
              shadow-normalBias={0.002}
              layers={1}
            />
          )}
        </group>
      ))}
    </>
  );
}
