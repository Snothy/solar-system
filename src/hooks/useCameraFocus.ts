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
  
  // Track target state for animations
  const animTargetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const animTargetLookAtRef = useRef<THREE.Vector3 | null>(null);

  useFrame((_state, delta) => {
    if (!focusedObject || !controlsRef.current || !cameraRef.current) {
      isFocusingRef.current = false;
      lastFocusedObjectRef.current = null;
      prevTargetPosRef.current = null;
      animTargetCamPosRef.current = null;
      animTargetLookAtRef.current = null;
      return;
    }

    const vb = visualBodies.find(v => v.body === focusedObject);
    if (!vb) return;

    const currentPos = vb.mesh.position.clone();

    // Check if we just switched to this object
    if (lastFocusedObjectRef.current !== focusedObject) {
      lastFocusedObjectRef.current = focusedObject;
      isFocusingRef.current = true;
      
      const radius = vb.baseRadius * (useVisualScale ? visualScale : 1);
      
      // Calculate target camera position
      const targetDist = radius * 4.0;
      const viewDir = new THREE.Vector3(0, 0.6, 1).normalize();
      const newPos = currentPos.clone().add(viewDir.multiplyScalar(targetDist));
      
      animTargetCamPosRef.current = newPos.clone();
      animTargetLookAtRef.current = currentPos.clone();
      
      // Disabling OrbitControls temporarily during animation
      controlsRef.current.enabled = false;
    } else {
      // While tracking, we update the targets dynamically
      if (animTargetLookAtRef.current) {
         animTargetLookAtRef.current.copy(currentPos);
         const radius = vb.baseRadius * (useVisualScale ? visualScale : 1);
         const targetDist = radius * 4.0;
         
         // Maintain the camera's current angle relative to the body, but adjust distance
         const dir = new THREE.Vector3().subVectors(cameraRef.current.position, currentPos).normalize();
         if (dir.lengthSq() < 0.1) dir.set(0, 0.6, 1).normalize(); // Fallback
         
         if (animTargetCamPosRef.current) {
            animTargetCamPosRef.current.copy(currentPos).add(dir.multiplyScalar(targetDist));
         }
      }
    }

    // Apply smooth interpolation if animating
    if (isFocusingRef.current && animTargetCamPosRef.current && animTargetLookAtRef.current) {
       const T = Math.min(1.0, delta * 3.0); // interpolation speed
       cameraRef.current.position.lerp(animTargetCamPosRef.current!, T);
       controlsRef.current.target.lerp(animTargetLookAtRef.current!, T);
       controlsRef.current.update();
       
       // Stop animation when close enough
       if (cameraRef.current.position.distanceToSquared(animTargetCamPosRef.current!) < 0.1 &&
           controlsRef.current.target.distanceToSquared(animTargetLookAtRef.current!) < 0.1) {
          isFocusingRef.current = false;
          controlsRef.current.enabled = true; // Give control back to user
       }
    } else if (!isFocusingRef.current) {
       // Continuous follow logic if not in transition
       if (prevTargetPosRef.current) {
         const moveDelta = new THREE.Vector3().subVectors(currentPos, prevTargetPosRef.current);
         cameraRef.current.position.add(moveDelta);
         controlsRef.current.target.copy(currentPos);
       }
    }
    
    if (!prevTargetPosRef.current) {
      prevTargetPosRef.current = new THREE.Vector3();
    }
    prevTargetPosRef.current.copy(currentPos);
  });
}
