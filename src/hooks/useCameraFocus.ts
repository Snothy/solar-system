import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualBody } from '../types';

export function useCameraFocus(
  focusedObject: any,
  visualBodies: VisualBody[],
  visualScale: number,
  useVisualScale: boolean,
  controlsRef: React.RefObject<any>,
  cameraRef: React.RefObject<THREE.Camera>
) {
  // We need to track if we've just started focusing to perform the initial zoom
  const isFocusingRef = useRef(false);
  const lastFocusedObjectRef = useRef<any>(null);
  const prevTargetPosRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    if (!focusedObject || !controlsRef.current || !cameraRef.current) {
      isFocusingRef.current = false;
      lastFocusedObjectRef.current = null;
      prevTargetPosRef.current = null;
      return;
    }

    const vb = visualBodies.find(v => v.body === focusedObject);
    if (!vb) return;

    const currentPos = vb.mesh.position.clone();

    // Check if we just switched to this object
    if (lastFocusedObjectRef.current !== focusedObject) {
      isFocusingRef.current = true;
      lastFocusedObjectRef.current = focusedObject;
      
      // Initial zoom-in logic
      const radius = vb.baseRadius * (useVisualScale ? visualScale : 1);
      
      // Target distance multiplier
      const targetDist = radius * 4.0;
      
      // Enforce a consistent "Solar System Plane" view (45 degrees up, from the South)
      // This ensures the camera is always oriented correctly relative to the ecliptic.
      // Offset: (0, height, distance)
      // We use a fixed direction vector (0, 0.5, 1) normalized
      const viewDir = new THREE.Vector3(0, 0.6, 1).normalize();
      const newPos = currentPos.clone().add(viewDir.multiplyScalar(targetDist));
      
      cameraRef.current.position.copy(newPos);
      cameraRef.current.up.set(0, 1, 0); // Ensure camera is upright
      // cameraRef.current.lookAt(currentPos); // OrbitControls handles this. Calling it manually breaks the internal state.
      
      // Reset controls target to the object
      controlsRef.current.target.copy(currentPos);
      controlsRef.current.update(); // CRITICAL: Sync controls with new camera position
    } else {
      // Continuous follow logic
      if (prevTargetPosRef.current) {
        // Calculate how much the object moved visually
        const delta = new THREE.Vector3().subVectors(currentPos, prevTargetPosRef.current);
        
        // Move camera by the same amount to maintain relative position
        cameraRef.current.position.add(delta);
        
        // Update controls target to keep looking at the object
        controlsRef.current.target.copy(currentPos);
      }
    }
    
    // Update previous position for next frame
    if (!prevTargetPosRef.current) {
      prevTargetPosRef.current = new THREE.Vector3();
    }
    prevTargetPosRef.current.copy(currentPos);
    
    // We do NOT call controlsRef.current.update() here because @react-three/drei OrbitControls
    // handles it internally in its own useFrame loop. Calling it twice causes jitter/clunkiness.
  });
}
