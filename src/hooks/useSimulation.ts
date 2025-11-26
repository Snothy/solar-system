import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody, Particle } from '../types';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import { START_DATE, SCALE,  TRAIL_LENGTH } from '../utils/constants';
import { yoshida4Step, checkCollisions } from '../utils/physics';

export function useSimulation(initialData: any[] | null = null, startDate: Date = START_DATE) {
  const [bodies, setBodies] = useState<PhysicsBody[]>([]);
  const [visualBodies, setVisualBodies] = useState<VisualBody[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [simTime, setSimTime] = useState(startDate.getTime());
  const [timeStep, setTimeStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [visualScale, setVisualScale] = useState(100);
  const [useVisualScale, setUseVisualScale] = useState(false);
  const [selectedObject, setSelectedObject] = useState<PhysicsBody | null>(null);
  const [focusedObject, setFocusedObject] = useState<PhysicsBody | null>(null);

  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useEphemeris, setUseEphemeris] = useState(false);

  // Initialize bodies from passed data
  useEffect(() => {
    if (initialized.current || !initialData) return;
    initialized.current = true;

    const initSimulation = () => {
      const newBodies: PhysicsBody[] = [];
      const newVisualBodies: VisualBody[] = [];

      try {
        // Build bodies from initialData
        initialData.forEach(data => {
          const body: PhysicsBody = {
            name: data.name,
            mass: data.mass,
            radius: data.radius,
            pos: data.pos,
            vel: data.vel,
            force: new THREE.Vector3(),
            parentName: data.parent,
            J2: data.J2,
            // Pole vector calculation (reused logic)
            poleVector: (data.poleRA !== undefined && data.poleDec !== undefined) 
              ? (() => {
                  const raRad = THREE.MathUtils.degToRad(data.poleRA);
                  const decRad = THREE.MathUtils.degToRad(data.poleDec);
                  
                  const x_eq = Math.cos(decRad) * Math.cos(raRad);
                  const y_eq = Math.cos(decRad) * Math.sin(raRad);
                  const z_eq = Math.sin(decRad);
                  
                  const epsilon = THREE.MathUtils.degToRad(23.43928);
                  const cosEps = Math.cos(epsilon);
                  const sinEps = Math.sin(epsilon);
                  
                  const x_ecl = x_eq;
                  const y_ecl = y_eq * cosEps + z_eq * sinEps;
                  const z_ecl = -y_eq * sinEps + z_eq * cosEps;
                  
                  return new THREE.Vector3(x_ecl, z_ecl, -y_ecl).normalize();
                })()
              : new THREE.Vector3(0, 1, 0)
          };
          
          newBodies.push(body);

          // Create visual representation
          const trailGeo = new THREE.BufferGeometry();
          const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
          trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
          const trailMat = new THREE.LineBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
          });
          const trail = new THREE.Line(trailGeo, trailMat);

          // Calculate rotation speed
          let rotationSpeed = 0;
          if (data.rotationPeriod) {
            const periodSeconds = data.rotationPeriod * 3600;
            rotationSpeed = (2 * Math.PI) / periodSeconds;
          }
          
          // Load texture if available
          // Texture loading is handled by the Scene/VisualBody component usually, 
          // but here we just pass the path/url.
          // The actual THREE.Texture loading happens in Scene or we can pre-load.
          // For now, we just pass the string URL.

          const visualBody: VisualBody = {
            body: body,
            mesh: new THREE.Mesh(), // Geometry/Material assigned in Scene or here? 
            // In previous code, mesh was empty here. Scene likely handles it or it's missing?
            // Wait, looking at Scene.tsx (not visible but inferred), it probably iterates visualBodies and adds them.
            // Actually, in the previous code, mesh was just new THREE.Mesh().
            // The geometry/material creation seems to happen elsewhere or was missing in the snippet I saw?
            // Ah, I see `CelestialBody` component in previous conversations. 
            // `Scene` probably maps `visualBodies` to `CelestialBody` components.
            // So we just need the data here.
            trail: trail,
            trailIdx: 0,
            trailCount: 0,
            baseRadius: data.radius * SCALE,
            type: data.type,
            rotationSpeed: rotationSpeed,
            textureUrl: data.texture // Pass the texture URL (custom or default)
          };
          newVisualBodies.push(visualBody);
        });

        setBodies(newBodies);
        setVisualBodies(newVisualBodies);
        setIsLoading(false);

      } catch (error) {
        console.error("Error initializing simulation:", error);
        setIsLoading(false);
      }
    };

    initSimulation();
  }, [initialData]);

  const removeParticle = (index: number) => {
    setParticles(prev => prev.filter((_, i) => i !== index));
  };

  const observerPos = useRef(new THREE.Vector3(0, 0, 500)); // Default camera pos
  const [useLightTimeDelay, setUseLightTimeDelay] = useState(true);

  const setObserverPosition = (x: number, y: number, z: number) => {
    observerPos.current.set(x, y, z);
  };

  const updatePhysics = () => {
    const dt = (!isPaused && timeStep > 0) ? (timeStep / 60) : 0;

    if (dt > 0) {
      // Update physics with sub-stepping for stability
      const MAX_SUB_STEP = 600;
      let remainingDt = dt;

      while (remainingDt > 0) {
        const step = Math.min(remainingDt, MAX_SUB_STEP);
        yoshida4Step(bodies, step);
        remainingDt -= step;
      }

      setSimTime(prev => prev + dt * 1000);

      // Check collisions
      const collisionPositions = checkCollisions(bodies);
      if (collisionPositions.length > 0) {
        const newParticles: Particle[] = collisionPositions.map(pos => {
          const geo = new THREE.BufferGeometry();
          const positions = new Float32Array(30 * 3);
          for (let i = 0; i < 30; i++) {
            positions[i * 3] = pos.x * SCALE;
            positions[i * 3 + 1] = pos.y * SCALE;
            positions[i * 3 + 2] = pos.z * SCALE;
          }
          geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const mat = new THREE.PointsMaterial({ color: 0xffaa00, size: 2 });
          const pts = new THREE.Points(geo, mat);
          
          const vels: number[] = [];
          for (let i = 0; i < 30; i++) {
            vels.push((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
          }
          
          return { mesh: pts, vels, life: 1.0 };
        });
        setParticles(prev => [...prev, ...newParticles]);
      }

      // Update visual bodies
      visualBodies.forEach(vb => {
        // Update position
        let visualPos = new THREE.Vector3(
          vb.body.pos.x * SCALE,
          vb.body.pos.y * SCALE,
          vb.body.pos.z * SCALE
        );

        // Light Time Delay Correction
        if (useLightTimeDelay) {
          // Calculate distance from observer to the object's TRUE position
          // Note: observerPos is in Scene Coordinates (scaled)
          // visualPos is also in Scene Coordinates (scaled)
          const dist = observerPos.current.distanceTo(visualPos);
          
          // Convert distance to meters for time calculation
          const distMeters = dist / SCALE;
          
          // Speed of light in m/s
          const C = 299792458;
          
          // Time delay in seconds
          const delay = distMeters / C;
          
          // Backtrack position: pos_visual = pos_true - vel * delay
          // vel is in m/s, need to convert to SceneUnits/s?
          // body.vel is m/s.
          // visualPos change = vel * delay * SCALE
          const correction = vb.body.vel.clone().multiplyScalar(delay * SCALE).negate();
          visualPos.add(correction);
        }

        // Moon visibility fix
        if (useVisualScale && vb.body.parentName) {
          const parentVb = visualBodies.find(p => p.body.name === vb.body.parentName);
          if (parentVb) {
            const parentPos = new THREE.Vector3(
              parentVb.body.pos.x * SCALE,
              parentVb.body.pos.y * SCALE,
              parentVb.body.pos.z * SCALE
            );
            
            // Apply LTD to parent pos as well for consistent relative check?
            // If we delay the moon, we should delay the parent too.
            // But parentVb.mesh.position is ALREADY updated in this loop?
            // No, forEach order matters. If parent is processed before child, mesh.position is updated.
            // If after, it's old.
            // Ideally we should use the calculated visualPos of the parent.
            // But for this "pop-out" fix, using the mesh position is "okay" but might jitter.
            // Let's re-calculate parent visual pos with LTD for this check to be safe.
            
            if (useLightTimeDelay) {
               const pDist = observerPos.current.distanceTo(parentPos);
               const pDelay = (pDist / SCALE) / 299792458;
               const pCorrection = parentVb.body.vel.clone().multiplyScalar(pDelay * SCALE).negate();
               parentPos.add(pCorrection);
            }

            const parentRadius = parentVb.baseRadius * visualScale;
            const childRadius = vb.baseRadius * visualScale;

            const dir = new THREE.Vector3().subVectors(visualPos, parentPos);
            const dist = dir.length();
            // Use 1.2x parent radius to ensure moon is clearly above surface/atmosphere
            const minDistance = parentRadius * 1.2 + childRadius;

            if (dist < minDistance) {
              dir.normalize();
              visualPos.copy(parentPos).add(dir.multiplyScalar(minDistance));
            }
          }
        }

        vb.mesh.position.copy(visualPos);

        // Update rotation
        if (vb.rotationSpeed !== 0) {
          vb.mesh.rotation.y += vb.rotationSpeed * dt;
        }

        // Update trail
        const positions = vb.trail.geometry.attributes.position.array as Float32Array;
        
        // If trail is full, shift everything back by one position
        if (vb.trailCount >= TRAIL_LENGTH) {
          // Shift existing points: copy from index 3 to 0, length is (TRAIL_LENGTH-1)*3
          positions.copyWithin(0, 3, TRAIL_LENGTH * 3);
          
          // Add new point at the end
          const lastIdx = (TRAIL_LENGTH - 1) * 3;
          positions[lastIdx] = vb.mesh.position.x;
          positions[lastIdx + 1] = vb.mesh.position.y;
          positions[lastIdx + 2] = vb.mesh.position.z;
        } else {
          // Append new point
          const idx = vb.trailCount * 3;
          positions[idx] = vb.mesh.position.x;
          positions[idx + 1] = vb.mesh.position.y;
          positions[idx + 2] = vb.mesh.position.z;
          vb.trailCount++;
        }

        vb.trail.geometry.setDrawRange(0, vb.trailCount);
        vb.trail.geometry.attributes.position.needsUpdate = true;
      });
    }
  };

  // Update body properties
  const updateBody = (name: string, updates: Partial<PhysicsBody>) => {
    let updatedBody: PhysicsBody | null = null;

    setBodies(prevBodies => 
      prevBodies.map(b => {
        if (b.name === name) {
          updatedBody = { ...b, ...updates };
          return updatedBody;
        }
        return b;
      })
    );

    // We need to update visual bodies to reference the NEW body object
    // otherwise they will keep rendering the old (now disconnected) body
    setVisualBodies(prevVisualBodies => 
      prevVisualBodies.map(vb => {
        if (vb.body.name === name) {
          // If we have an updated body, use it. Otherwise, we need to find it (but we should have it from above)
          // Since setBodies is async/batched, we can't rely on 'bodies' state here yet.
          // But we captured 'updatedBody' in the closure above.
          // However, React state updates are pure functions, so side-effects like capturing 'updatedBody' 
          // might be tricky if called multiple times, but for this event handler it's fine.
          // Better approach: calculate the new body here too or just apply updates to the existing ref 
          // (but we want immutability).
          
          // Actually, the cleanest way is to apply the same updates to the body inside VisualBody
          const newBody = updatedBody || { ...vb.body, ...updates };
          
          return {
            ...vb,
            baseRadius: (updates.radius !== undefined) ? updates.radius * SCALE : vb.baseRadius,
            body: newBody
          };
        }
        return vb;
      })
    );

    // Also update selected/focused objects if they match
    if (selectedObject && selectedObject.name === name) {
      setSelectedObject(prev => prev ? { ...prev, ...updates } : null);
    }
    if (focusedObject && focusedObject.name === name) {
      setFocusedObject(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const [orbitVisibility, setOrbitVisibility] = useState<Record<string, boolean>>({});

  const toggleOrbitVisibility = (name: string, includeChildren: boolean = false) => {
    setOrbitVisibility(prev => {
      const next = { ...prev };
      // If undefined, it means visible (default true). So toggle means set to false.
      // If defined as true, set to false. If false, set to true.
      // Actually, let's treat undefined as true.
      const current = prev[name] !== false;
      next[name] = !current;

      if (includeChildren) {
        const children = SOLAR_SYSTEM_DATA.filter(d => d.parent === name);
        children.forEach(child => {
          next[child.name] = !current; // Set to same state as parent
        });
      }
      return next;
    });
  };

  const setAllOrbitVisibility = (visible: boolean) => {
    const next: Record<string, boolean> = {};
    SOLAR_SYSTEM_DATA.forEach(d => {
      next[d.name] = visible;
    });
    setOrbitVisibility(next);
  };

  return {
    bodies,
    visualBodies,
    particles,
    simTime,
    timeStep,
    isPaused,
    visualScale,
    useVisualScale,
    selectedObject,
    focusedObject,
    orbitVisibility,
    useLightTimeDelay,
    useEphemeris,
    setTimeStep,
    setIsPaused,
    setVisualScale,
    setUseVisualScale,
    setSelectedObject,
    setFocusedObject,
    removeParticle,
    updatePhysics,
    updateBody,
    toggleOrbitVisibility,
    setAllOrbitVisibility,
    setObserverPosition,
    setUseLightTimeDelay,
    setUseEphemeris,
    isLoading
  };
}
