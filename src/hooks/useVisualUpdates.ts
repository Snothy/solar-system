
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody } from '../types';
import { SCALE, TRAIL_LENGTH } from '../utils/constants';

// Reusable objects to avoid GC
// Reusable objects to avoid GC
const _visualPos = new THREE.Vector3();
const _pole = new THREE.Vector3();

export interface VisualUpdates {
  visualScale: number;
  setVisualScale: React.Dispatch<React.SetStateAction<number>>;
  useVisualScale: boolean;
  setUseVisualScale: React.Dispatch<React.SetStateAction<boolean>>;
  useLightTimeDelay: boolean;
  setUseLightTimeDelay: React.Dispatch<React.SetStateAction<boolean>>;
  enableLightAberration: boolean;
  setEnableLightAberration: React.Dispatch<React.SetStateAction<boolean>>;
  
  updateVisuals: (dt: number) => void;
}

export function useVisualUpdates(
  bodies: PhysicsBody[],
  visualBodies: VisualBody[],
  observerPos: React.MutableRefObject<THREE.Vector3>,
  focusedObject: PhysicsBody | null,
  getVisualState?: (
    observerPos: THREE.Vector3,
    visualScale: number,
    useVisualScale: boolean,
    useLightTimeDelay: boolean,
    enableLightAberration: boolean,
    focusedBodyIdx: number,
    scaleFactor: number
  ) => any
): VisualUpdates {
  const [visualScale, setVisualScale] = useState(1);
  const [useVisualScale, setUseVisualScale] = useState(false);
  const [useLightTimeDelay, setUseLightTimeDelay] = useState(true);
  const [enableLightAberration, setEnableLightAberration] = useState(true);

  const updateVisuals = useCallback((dt: number) => {
    // Try WASM first
    if (getVisualState) {
        const focusedIdx = focusedObject ? bodies.findIndex(b => b.name === focusedObject.name) : -1;
        const visualState = getVisualState(
            observerPos.current,
            visualScale,
            useVisualScale,
            useLightTimeDelay,
            enableLightAberration,
            focusedIdx,
            SCALE
        );

        if (visualState && visualState.positions) {
            const positions = visualState.positions; // Float32Array [x, y, z, x, y, z...]
            const geometricPositions = visualState.geometricPositions; // Float32Array [x, y, z...]
            
            visualBodies.forEach((vb, i) => {
                // Update Position
                const idx = i * 3;
                _visualPos.set(positions[idx], positions[idx+1], positions[idx+2]);
                vb.mesh.position.copy(_visualPos);

                // Update Rotation (still in JS for now, or move to WASM later)
                if (vb.body.angularVelocity) {
                    _pole.copy(vb.body.poleVector || new THREE.Vector3(0, 1, 0));
                    const spinSpeed = vb.body.angularVelocity.dot(_pole);
                    vb.mesh.rotation.y += spinSpeed * dt;
                } else if (vb.rotationSpeed !== 0) {
                    vb.mesh.rotation.y += vb.rotationSpeed * dt;
                }
                
                // Update trail (JS side using GEOMETRIC pos to avoid camera artifacts)
                // _visualPos depends on camera position (Light Time Delay), causing trails to jump when camera moves.
                // We must use the stable geometric position for trails.
                let geoX, geoY, geoZ;
                
                if (geometricPositions) {
                    geoX = geometricPositions[idx];
                    geoY = geometricPositions[idx+1];
                    geoZ = geometricPositions[idx+2];
                } else {
                    geoX = vb.body.pos.x * SCALE;
                    geoY = vb.body.pos.y * SCALE;
                    geoZ = vb.body.pos.z * SCALE;
                }

                const trailPositions = vb.trail.geometry.attributes.position.array as Float32Array;
                if (vb.trailCount >= TRAIL_LENGTH) {
                    trailPositions.copyWithin(0, 3, TRAIL_LENGTH * 3);
                    const lastIdx = (TRAIL_LENGTH - 1) * 3;
                    trailPositions[lastIdx] = geoX;
                    trailPositions[lastIdx + 1] = geoY;
                    trailPositions[lastIdx + 2] = geoZ;
                } else {
                    const idx = vb.trailCount * 3;
                    trailPositions[idx] = geoX;
                    trailPositions[idx + 1] = geoY;
                    trailPositions[idx + 2] = geoZ;
                    vb.trailCount++;
                }
                vb.trail.geometry.setDrawRange(0, vb.trailCount);
                vb.trail.geometry.attributes.position.needsUpdate = true;
            });
            return;
        }
    }

    // Fallback to JS (Minimal Geometric Update)
    // If WASM is not ready, just show bodies at their current geometric position.
    visualBodies.forEach(vb => {
      _visualPos.set(
        vb.body.pos.x * SCALE,
        vb.body.pos.y * SCALE,
        vb.body.pos.z * SCALE
      );
      vb.mesh.position.copy(_visualPos);

      // Simple rotation
      if (vb.body.angularVelocity) {
        _pole.copy(vb.body.poleVector || new THREE.Vector3(0, 1, 0));
        const spinSpeed = vb.body.angularVelocity.dot(_pole);
        vb.mesh.rotation.y += spinSpeed * dt;
      } else if (vb.rotationSpeed !== 0) {
        vb.mesh.rotation.y += vb.rotationSpeed * dt;
      }

      // Simple trail update (Geometric)
      const trailPositions = vb.trail.geometry.attributes.position.array as Float32Array;
      if (vb.trailCount >= TRAIL_LENGTH) {
        trailPositions.copyWithin(0, 3, TRAIL_LENGTH * 3);
        const lastIdx = (TRAIL_LENGTH - 1) * 3;
        trailPositions[lastIdx] = _visualPos.x;
        trailPositions[lastIdx + 1] = _visualPos.y;
        trailPositions[lastIdx + 2] = _visualPos.z;
      } else {
        const idx = vb.trailCount * 3;
        trailPositions[idx] = _visualPos.x;
        trailPositions[idx + 1] = _visualPos.y;
        trailPositions[idx + 2] = _visualPos.z;
        vb.trailCount++;
      }
      vb.trail.geometry.setDrawRange(0, vb.trailCount);
      vb.trail.geometry.attributes.position.needsUpdate = true;
    });
  }, [bodies, visualBodies, observerPos, focusedObject, useLightTimeDelay, enableLightAberration, useVisualScale, visualScale, getVisualState]); // Added getVisualState to dependencies

  return {
    visualScale,
    setVisualScale,
    useVisualScale,
    setUseVisualScale,
    useLightTimeDelay,
    setUseLightTimeDelay,
    enableLightAberration,
    setEnableLightAberration,
    updateVisuals
  };
}
