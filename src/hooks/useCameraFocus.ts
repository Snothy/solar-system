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
      const currentDist = cameraRef.current.position.distanceTo(currentPos);
      
      // Only zoom in if we are too far away
      if (currentDist > targetDist * 1.5) {
        const dir = new THREE.Vector3()
          .subVectors(cameraRef.current.position, currentPos)
          .normalize();
        
        // If camera is directly on top/bottom, might cause issues, so ensure some offset
        if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
        
        const newPos = currentPos.clone().add(dir.multiplyScalar(targetDist));
        cameraRef.current.position.copy(newPos);
      }
      
      // Reset controls target to the object
      controlsRef.current.target.copy(currentPos);
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
    
    controlsRef.current.update();
  });
}
