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
  cameraRef: React.RefObject<THREE.Camera>,
  viewMode: 'realistic' | 'simplistic'
) {
  const isFocusingRef = useRef(false);
  const lastFocusedObjectRef = useRef<any>(null);
  const prevTargetPosRef = useRef<THREE.Vector3 | null>(null);
  
  const animTargetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const animTargetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const animTimeRef = useRef(0);

  useFrame((_state, delta) => {
    if (!focusedObject || !controlsRef.current || !cameraRef.current) {
      if (isFocusingRef.current) {
          controlsRef.current.enabled = true;
      }
      isFocusingRef.current = false;
      lastFocusedObjectRef.current = null;
      prevTargetPosRef.current = null;
      animTargetCamPosRef.current = null;
      animTargetLookAtRef.current = null;
      animTimeRef.current = 0;
      return;
    }

    const vb = visualBodies.find(v => v.body === focusedObject);
    if (!vb) return;

    const currentPos = vb.mesh.position.clone();

    // Check if we just switched to this object
    if (lastFocusedObjectRef.current !== focusedObject) {
      lastFocusedObjectRef.current = focusedObject;
      isFocusingRef.current = true;
      animTimeRef.current = 0;
      
      let radius = vb.baseRadius * (useVisualScale ? visualScale : 1);
      let targetDist = radius * 4.0;
      
      // Enforce safe distance in simplistic mode to not clip into Billboard UI
      if (viewMode === 'simplistic') {
         const dotSize = vb.type === 'star' ? 0.08 : vb.type === 'planet' ? 0.03 : 0.015;
         const minSafeDist = dotSize * 25.0; 
         targetDist = Math.max(targetDist, minSafeDist);
      } else {
         // Default minimum safe distance for extremely small physical bodies
         targetDist = Math.max(targetDist, 0.005);
      }
      
      const viewDir = new THREE.Vector3(0, 0.6, 1).normalize();
      const newPos = currentPos.clone().add(viewDir.multiplyScalar(targetDist));
      
      animTargetCamPosRef.current = newPos.clone();
      animTargetLookAtRef.current = currentPos.clone();
      
      controlsRef.current.enabled = false;
    } else {
      // While tracking, we update the targets dynamically
      if (animTargetLookAtRef.current && animTargetCamPosRef.current) {
         animTargetLookAtRef.current.copy(currentPos);
         
         let radius = vb.baseRadius * (useVisualScale ? visualScale : 1);
         let targetDist = radius * 4.0;
         
         if (viewMode === 'simplistic') {
            const dotSize = vb.type === 'star' ? 0.08 : vb.type === 'planet' ? 0.03 : 0.015;
            targetDist = Math.max(targetDist, dotSize * 25.0);
         } else {
            targetDist = Math.max(targetDist, 0.005);
         }
         
         const dir = new THREE.Vector3().subVectors(animTargetCamPosRef.current!, currentPos).normalize();
         if (dir.lengthSq() < 0.1) dir.set(0, 0.6, 1).normalize(); // Fallback
         
         animTargetCamPosRef.current.copy(currentPos).add(dir.multiplyScalar(targetDist));
      }
    }

    if (isFocusingRef.current && animTargetCamPosRef.current && animTargetLookAtRef.current) {
       animTimeRef.current += delta;
       const T = Math.min(1.0, delta * 5.0); 
       
       cameraRef.current.position.lerp(animTargetCamPosRef.current!, T);
       controlsRef.current.target.lerp(animTargetLookAtRef.current!, T);
       controlsRef.current.update();
       
       const distSq = cameraRef.current.position.distanceToSquared(animTargetCamPosRef.current!);
       const targetDistSq = controlsRef.current.target.distanceToSquared(animTargetLookAtRef.current!);
       
       // Breakout condition: either very close, OR time ran out (2 seconds max)
       if ((distSq < 1e-4 && targetDistSq < 1e-4) || animTimeRef.current > 2.0) {
          isFocusingRef.current = false;
          controlsRef.current.enabled = true;
       }
    } else if (!isFocusingRef.current) {
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
