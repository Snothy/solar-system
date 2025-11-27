import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody, Particle } from '../types';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import { START_DATE, SCALE, TRAIL_LENGTH } from '../utils/constants';
import { yoshida4Step, rkf45Step, checkCollisions, computeOpticalLibration } from '../utils/physics';
import { utcToTDB } from '../utils/timeUtils';
import { computePoleVector, updatePoleOrientation } from '../utils/precession';
import { usePhysicsCompute } from './usePhysicsCompute';

export function useSimulation(initialData: any[] | null = null, startDate: Date = START_DATE) {
  const [bodies, setBodies] = useState<PhysicsBody[]>([]);
  const [visualBodies, setVisualBodies] = useState<VisualBody[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [simTime, setSimTime] = useState(startDate.getTime());
  const [timeStep, setTimeStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [visualScale, setVisualScale] = useState(1);
  const [useVisualScale, setUseVisualScale] = useState(false);
  const [selectedObject, setSelectedObject] = useState<PhysicsBody | null>(null);
  const [focusedObject, setFocusedObject] = useState<PhysicsBody | null>(null);

  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced physics toggles
  const [enableTidalEvolution, setEnableTidalEvolution] = useState(true);
  const [enableAtmosphericDrag, setEnableAtmosphericDrag] = useState(true);
  const [enableYarkovsky, setEnableYarkovsky] = useState(true);
  const [enablePrecession, setEnablePrecession] = useState(true);
  const [enableNutation, setEnableNutation] = useState(true);
  const [useTDBTime, setUseTDBTime] = useState(true);
  const [enableLightAberration, setEnableLightAberration] = useState(true);
  const [enableRelativity, setEnableRelativity] = useState(true);
  const [useAdaptiveTimeStep, setUseAdaptiveTimeStep] = useState(false);

  // Physics compute (worker/GPU) integration
  const physicsCompute = usePhysicsCompute();

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
            J3: data.J3,
            J4: data.J4,
            C22: data.C22,
            S22: data.S22,
            k2: data.k2,
            tidalQ: data.tidalQ,
            hasAtmosphere: data.hasAtmosphere,
            surfacePressure: data.surfacePressure,
            scaleHeight: data.scaleHeight,
            dragCoefficient: data.dragCoefficient,
            albedo: data.albedo,
            thermalInertia: data.thermalInertia,
            poleRA0: data.poleRA,
            poleDec0: data.poleDec,
            precessionRate: data.precessionRate,
            nutationAmplitude: data.nutationAmplitude,
            meanTemperature: data.meanTemperature,
            // Compute initial pole vector
            poleVector: (data.poleRA !== undefined && data.poleDec !== undefined) 
              ? computePoleVector(data.poleRA, data.poleDec)
              : new THREE.Vector3(0, 1, 0),
            
            // Rotational Physics
            momentOfInertia: 0.4 * data.mass * data.radius * data.radius, // Solid sphere approximation
            angularVelocity: (data.rotationPeriod) 
              ? ((data.poleRA !== undefined && data.poleDec !== undefined) 
                  ? computePoleVector(data.poleRA, data.poleDec) 
                  : new THREE.Vector3(0, 1, 0)
                ).multiplyScalar((2 * Math.PI) / (data.rotationPeriod * 3600))
              : new THREE.Vector3(0, 0, 0)
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

  // Helper: Run physics on main thread with sub-stepping
  const runMainThreadPhysics = (dt: number) => {
    physicsCompute.performanceMonitor.startPhysics();
    
    if (useAdaptiveTimeStep) {
      // Adaptive Step (RKF45)
      let remainingDt = dt;
      let currentStep = dt; // Initial guess
      
      while (remainingDt > 1e-6) {
        // Don't step past the end of the frame
        const stepAttempt = Math.min(currentStep, remainingDt);
        
        const result = rkf45Step(
          bodies,
          stepAttempt,
          1e-9, // Tolerance
          enableTidalEvolution,
          enableAtmosphericDrag,
          enableYarkovsky,
          enableRelativity
        );
        
        if (result.takenDt > 0) {
          remainingDt -= result.takenDt;
        }
        
        currentStep = result.nextDt;
        
        // Safety break if step becomes too small
        if (currentStep < 1e-8 && remainingDt > 1e-6) {
             // Force a small step or break? 
             // Let's just break to avoid infinite loop and accept the drift
             break;
        }
      }
    } else {
      // Fixed Step (Yoshida)
      const MAX_SUB_STEP = 600;
      let remainingDt = dt;

      while (remainingDt > 0) {
        const step = Math.min(remainingDt, MAX_SUB_STEP);
        yoshida4Step(
          bodies,
          step,
          enableTidalEvolution,
          enableAtmosphericDrag,
          enableYarkovsky,
          enableRelativity
        );
        remainingDt -= step;
      }
    }
    
    physicsCompute.performanceMonitor.endPhysics();
  };

  const updateVisuals = (dt: number) => {
    // Update visual bodies (heliocentric frame - Sun at origin)
    visualBodies.forEach(vb => {
      // Update position (simple heliocentric coordinates)
      let visualPos = new THREE.Vector3(
        vb.body.pos.x * SCALE,
        vb.body.pos.y * SCALE,
        vb.body.pos.z * SCALE
      );

      // Calculate Moon Libration
      if (vb.body.name === 'Moon') {
        const earth = bodies.find(b => b.name === 'Earth');
        if (earth) {
          vb.libration = computeOpticalLibration(vb.body, earth);
        }
      }

      // Light Time Delay Correction
      if (useLightTimeDelay) {
        const dist = observerPos.current.distanceTo(visualPos);
        const distMeters = dist / SCALE;
        const C = 299792458;
        const delay = distMeters / C;
        const correction = vb.body.vel.clone().multiplyScalar(delay * SCALE).negate();
        visualPos.add(correction);
      }

      // Light Aberration Correction
      if (enableLightAberration) {
        let observerVel = new THREE.Vector3(0, 0, 0);
        if (focusedObject) {
          observerVel = focusedObject.vel.clone();
        }
        
        const toObject = new THREE.Vector3().subVectors(visualPos, observerPos.current).normalize();
        const C = 299792458;
        const vCross = new THREE.Vector3().crossVectors(observerVel, toObject);
        const aberrationAngle = vCross.length() / C;
        
        if (aberrationAngle > 1e-12) {
          const perpDirection = vCross.normalize();
          const dist = observerPos.current.distanceTo(visualPos);
          const shift = perpDirection.multiplyScalar(dist * Math.sin(aberrationAngle));
          visualPos.add(shift);
        }
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
          const minDistance = parentRadius * 1.2 + childRadius;

          if (dist < minDistance) {
            dir.normalize();
            visualPos.copy(parentPos).add(dir.multiplyScalar(minDistance));
          }
        }
      }

      vb.mesh.position.copy(visualPos);

      // Update rotation
      if (vb.body.angularVelocity) {
        const pole = vb.body.poleVector || new THREE.Vector3(0, 1, 0);
        const spinSpeed = vb.body.angularVelocity.dot(pole);
        vb.mesh.rotation.y += spinSpeed * dt;
      } else if (vb.rotationSpeed !== 0) {
        vb.mesh.rotation.y += vb.rotationSpeed * dt;
      }

      // Update trail
      const positions = vb.trail.geometry.attributes.position.array as Float32Array;
      
      if (vb.trailCount >= TRAIL_LENGTH) {
        positions.copyWithin(0, 3, TRAIL_LENGTH * 3);
        const lastIdx = (TRAIL_LENGTH - 1) * 3;
        positions[lastIdx] = vb.mesh.position.x;
        positions[lastIdx + 1] = vb.mesh.position.y;
        positions[lastIdx + 2] = vb.mesh.position.z;
      } else {
        const idx = vb.trailCount * 3;
        positions[idx] = vb.mesh.position.x;
        positions[idx + 1] = vb.mesh.position.y;
        positions[idx + 2] = vb.mesh.position.z;
        vb.trailCount++;
      }

      vb.trail.geometry.setDrawRange(0, vb.trailCount);
      vb.trail.geometry.attributes.position.needsUpdate = true;
    });
  };

  const updatePhysics = () => {
    const dt = (!isPaused && timeStep > 0) ? (timeStep / 60) : 0;

    if (dt > 0) {
      // Start performance tracking
      physicsCompute.performanceMonitor.startFrame();
      physicsCompute.performanceMonitor.setBodyCount(bodies.length);
      
      // Get current time in TDB if enabled
      const currentTime = useTDBTime ? utcToTDB(simTime) : simTime;
      
      // Update pole vectors for precession/nutation before physics calculation
      if (enablePrecession || enableNutation) {
        bodies.forEach(b => {
          if (b.poleRA0 !== undefined && b.poleDec0 !== undefined) {
            b.poleVector = updatePoleOrientation(
              b.poleRA0,
              b.poleDec0,
              b.precessionRate,
              b.nutationAmplitude,
              currentTime,
              enablePrecession,
              enableNutation
            );
          }
        });
      }
      
      // Main thread physics
      runMainThreadPhysics(dt);

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

      updateVisuals(dt);
      setSimTime(prev => prev + dt * 1000);
      physicsCompute.performanceMonitor.endFrame();
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

  const addBody = (data: any) => {
    const newBody: PhysicsBody = {
      name: data.name,
      mass: data.mass,
      radius: data.radius,
      pos: data.pos,
      vel: data.vel,
      force: new THREE.Vector3(),
      parentName: data.parent,
      J2: data.J2,
      J3: data.J3,
      J4: data.J4,
      C22: data.C22,
      S22: data.S22,
      k2: data.k2,
      tidalQ: data.tidalQ,
      hasAtmosphere: data.hasAtmosphere,
      surfacePressure: data.surfacePressure,
      scaleHeight: data.scaleHeight,
      dragCoefficient: data.dragCoefficient,
      albedo: data.albedo,
      thermalInertia: data.thermalInertia,
      poleRA0: data.poleRA,
      poleDec0: data.poleDec,
      precessionRate: data.precessionRate,
      nutationAmplitude: data.nutationAmplitude,
      meanTemperature: data.meanTemperature,
      poleVector: (data.poleRA !== undefined && data.poleDec !== undefined) 
        ? computePoleVector(data.poleRA, data.poleDec)
        : new THREE.Vector3(0, 1, 0),
      momentOfInertia: 0.4 * data.mass * data.radius * data.radius,
      angularVelocity: (data.rotationPeriod) 
        ? ((data.poleRA !== undefined && data.poleDec !== undefined) 
            ? computePoleVector(data.poleRA, data.poleDec) 
            : new THREE.Vector3(0, 1, 0)
          ).multiplyScalar((2 * Math.PI) / (data.rotationPeriod * 3600))
        : new THREE.Vector3(0, 0, 0)
    };

    setBodies(prev => [...prev, newBody]);

    // Create visual body
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: data.color || 0xffffff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const trail = new THREE.Line(trailGeo, trailMat);

    let rotationSpeed = 0;
    if (data.rotationPeriod) {
      const periodSeconds = data.rotationPeriod * 3600;
      rotationSpeed = (2 * Math.PI) / periodSeconds;
    }

    const newVisualBody: VisualBody = {
      body: newBody,
      mesh: new THREE.Mesh(),
      trail: trail,
      trailIdx: 0,
      trailCount: 0,
      baseRadius: data.radius * SCALE,
      type: data.type || 'asteroid',
      rotationSpeed: rotationSpeed,
      textureUrl: data.texture
    };

    setVisualBodies(prev => [...prev, newVisualBody]);
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
    enableTidalEvolution,
    enableAtmosphericDrag,
    enableYarkovsky,
    enablePrecession,
    enableNutation,
    useTDBTime,
    enableLightAberration,
    physicsCompute, // Expose GPU/Worker compute interface
    setTimeStep,
    setIsPaused,
    setVisualScale,
    setUseVisualScale,
    setSelectedObject,
    setFocusedObject,
    removeParticle,
    updatePhysics,
    updateBody,
    addBody,
    toggleOrbitVisibility,
    setAllOrbitVisibility,
    setObserverPosition,
    setUseLightTimeDelay,
    setEnableTidalEvolution,
    setEnableAtmosphericDrag,
    setEnableYarkovsky,
    setEnablePrecession,
    setEnableNutation,
    setUseTDBTime,
    setEnableLightAberration,
    enableRelativity,
    setEnableRelativity,
    useAdaptiveTimeStep,
    setUseAdaptiveTimeStep,
    isLoading
  };
}
