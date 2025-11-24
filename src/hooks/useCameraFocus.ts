import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VisualBody } from '../types';

export function useCameraFocus(
  focusedObject: any,
  focusedObjectPrevPos: React.RefObject<THREE.Vector3>,
  visualBodies: VisualBody[],
  visualScale: number,
  useVisualScale: boolean,
  controlsRef: React.RefObject<any>,
  cameraRef: React.RefObject<THREE.Camera>
) {
  // We need to track if we've just started focusing to perform the initial zoom
  const isFocusingRef = useRef(false);
  const lastFocusedObjectRef = useRef<any>(null);

  useFrame(() => {
    if (!focusedObject || !controlsRef.current || !cameraRef.current) {
      isFocusingRef.current = false;
      lastFocusedObjectRef.current = null;
      return;
    }

    const vb = visualBodies.find(v => v.body === focusedObject);
    if (!vb) return;

    // Check if we just switched to this object
    if (lastFocusedObjectRef.current !== focusedObject) {
      isFocusingRef.current = true;
      lastFocusedObjectRef.current = focusedObject;
      
      // Initial zoom-in logic
      // Use a multiplier of radius, but ensure a minimum distance for very small objects if needed
      // The + 5 was causing issues in true scale where radius is < 0.01
      const radius = vb.baseRadius * (useVisualScale ? visualScale : 1);
      
      // For very small objects (like moons in true scale), ensure we don't zoom out too far
      // If radius is extremely small, we might want a minimum distance, but relative to the object size
      // The issue "zooms out really far" implies targetDist is too big.
      // Let's stick to a tight multiplier.
      const targetDist = radius * 4.0;
      const currentDist = cameraRef.current.position.distanceTo(vb.mesh.position);
      
      // Only zoom in if we are too far away
      if (currentDist > targetDist * 1.5) {
        const dir = new THREE.Vector3()
          .subVectors(cameraRef.current.position, vb.mesh.position)
          .normalize();
        
        // If camera is directly on top/bottom, might cause issues, so ensure some offset
        if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
        
        const newPos = vb.mesh.position.clone().add(dir.multiplyScalar(targetDist));
        cameraRef.current.position.copy(newPos);
      }
      
      // Reset controls target to the object
      controlsRef.current.target.copy(vb.mesh.position);
    } else {
      // Continuous follow logic
      const currentPos = vb.mesh.position.clone();
      const prevPos = focusedObjectPrevPos.current;
      
      // Calculate how much the object moved
      const delta = new THREE.Vector3().subVectors(currentPos, prevPos);
      
      // Move camera by the same amount to maintain relative position
      cameraRef.current.position.add(delta);
      
      // Update controls target to keep looking at the object
      controlsRef.current.target.copy(currentPos);
    }
    
    controlsRef.current.update();
  });
}
