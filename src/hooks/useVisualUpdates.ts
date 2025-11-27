
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody } from '../types';
import { SCALE, TRAIL_LENGTH } from '../utils/constants';

// Reusable objects to avoid GC
const _visualPos = new THREE.Vector3();
const _correction = new THREE.Vector3();
const _observerVel = new THREE.Vector3();
const _toObject = new THREE.Vector3();
const _vCross = new THREE.Vector3();
const _perpDirection = new THREE.Vector3();
const _parentPos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _geometricPos = new THREE.Vector3();

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
                
                // Update Trails (WASM should handle this, but for now we just get positions)
                // If we want WASM trails, we need to get them from WASM.
                // The plan said "Implement Trail History Buffer in Rust".
                // And "Expose get_visual_state".
                // I implemented `get_visual_state` to return positions.
                // I also implemented `get_trail` in Rust but didn't expose it in `get_visual_state` return object yet.
                // I should probably update trails in JS using the WASM-calculated position for this step, 
                // to ensure visual correctness first.
                
                // Update trail (JS side using GEOMETRIC pos to avoid camera artifacts)
                // _visualPos depends on camera position (Light Time Delay), causing trails to jump when camera moves.
                // We must use the stable geometric position for trails.
                const geoX = vb.body.pos.x * SCALE;
                const geoY = vb.body.pos.y * SCALE;
                const geoZ = vb.body.pos.z * SCALE;

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

    // Fallback to JS (Original Logic)
    visualBodies.forEach(vb => {
      // Update position (simple heliocentric coordinates)
      _geometricPos.set(
        vb.body.pos.x * SCALE,
        vb.body.pos.y * SCALE,
        vb.body.pos.z * SCALE
      );
      _visualPos.copy(_geometricPos);

      // Update Libration (Moon only)
      if (vb.body.name === "Moon" && vb.body.libration !== undefined) {
         vb.libration = vb.body.libration;
      }

      // Light Time Delay Correction
      if (useLightTimeDelay) {
        const dist = observerPos.current.distanceTo(_visualPos);
        const distMeters = dist / SCALE;
        const C = 299792458;
        const delay = distMeters / C;
        
        _correction.copy(vb.body.vel).multiplyScalar(delay * SCALE).negate();
        _visualPos.add(_correction);
      }

      // Light Aberration Correction
      if (enableLightAberration) {
        _observerVel.set(0, 0, 0);
        if (focusedObject) {
          _observerVel.copy(focusedObject.vel);
        }
        
        _toObject.subVectors(_visualPos, observerPos.current).normalize();
        const C = 299792458;
        _vCross.crossVectors(_observerVel, _toObject);
        const aberrationAngle = _vCross.length() / C;
        
        if (aberrationAngle > 1e-12) {
          _perpDirection.copy(_vCross).normalize();
          const dist = observerPos.current.distanceTo(_visualPos);
          const shift = _perpDirection.multiplyScalar(dist * Math.sin(aberrationAngle));
          _visualPos.add(shift);
        }
      }

      // Moon visibility fix (Visual Scale)
      if (useVisualScale && vb.body.parentName) {
        const parentVb = visualBodies.find(p => p.body.name === vb.body.parentName);
        if (parentVb) {
          _parentPos.set(
            parentVb.body.pos.x * SCALE,
            parentVb.body.pos.y * SCALE,
            parentVb.body.pos.z * SCALE
          );
          
          if (useLightTimeDelay) {
             const pDist = observerPos.current.distanceTo(_parentPos);
             const pDelay = (pDist / SCALE) / 299792458;
             _correction.copy(parentVb.body.vel).multiplyScalar(pDelay * SCALE).negate();
             _parentPos.add(_correction);
          }

          const parentRadius = parentVb.baseRadius * visualScale;
          const childRadius = vb.baseRadius * visualScale;

          _dir.subVectors(_visualPos, _parentPos);
          const dist = _dir.length();
          const minDistance = parentRadius * 1.2 + childRadius;

          if (dist < minDistance) {
            _dir.normalize();
            _visualPos.copy(_parentPos).add(_dir.multiplyScalar(minDistance));
          }
        }
      }

      vb.mesh.position.copy(_visualPos);

      // Update rotation
      if (vb.body.angularVelocity) {
        _pole.copy(vb.body.poleVector || new THREE.Vector3(0, 1, 0));
        const spinSpeed = vb.body.angularVelocity.dot(_pole);
        vb.mesh.rotation.y += spinSpeed * dt;
      } else if (vb.rotationSpeed !== 0) {
        vb.mesh.rotation.y += vb.rotationSpeed * dt;
      }

      // Update trail
      const positions = vb.trail.geometry.attributes.position.array as Float32Array;
      
      if (vb.trailCount >= TRAIL_LENGTH) {
        positions.copyWithin(0, 3, TRAIL_LENGTH * 3);
        const lastIdx = (TRAIL_LENGTH - 1) * 3;
        positions[lastIdx] = _geometricPos.x;
        positions[lastIdx + 1] = _geometricPos.y;
        positions[lastIdx + 2] = _geometricPos.z;
      } else {
        const idx = vb.trailCount * 3;
        positions[idx] = _geometricPos.x;
        positions[idx + 1] = _geometricPos.y;
        positions[idx + 2] = _geometricPos.z;
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
