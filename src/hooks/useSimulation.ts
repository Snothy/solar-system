import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody, Particle } from '../types';
import type { SolarSystemData } from '../types/data';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import { START_DATE, SCALE, TRAIL_LENGTH } from '../utils/constants';
import { usePhysicsCompute } from './usePhysicsCompute';
import { usePhysicsEngine } from './usePhysicsEngine';
import { useVisualUpdates } from './useVisualUpdates';

function computePoleVector(ra: number, dec: number): THREE.Vector3 {
  const raRad = THREE.MathUtils.degToRad(ra);
  const decRad = THREE.MathUtils.degToRad(dec);
  
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
}

export function useSimulation(initialData: SolarSystemData[] | null = null, startDate: Date = START_DATE) {
  const [bodies, setBodies] = useState<PhysicsBody[]>([]);
  const [visualBodies, setVisualBodies] = useState<VisualBody[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selectedObject, setSelectedObject] = useState<PhysicsBody | null>(null);
  const [focusedObject, setFocusedObject] = useState<PhysicsBody | null>(null);

  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const observerPos = useRef(new THREE.Vector3(0, 0, 500)); // Default camera pos
  const setObserverPosition = (x: number, y: number, z: number) => {
    observerPos.current.set(x, y, z);
  };

  // Track when we need to sync bodies to WASM (after manual updates)
  const needsWasmSync = useRef(false);

  // Physics compute (worker/GPU) integration
  const physicsCompute = usePhysicsCompute();

  // Physics Engine Hook
  const physics = usePhysicsEngine(bodies, startDate.getTime() / 86400000 + 2440587.5);

  // Sync bodies to WASM when manual updates occur
  useEffect(() => {
    if (needsWasmSync.current && bodies.length > 0) {
      physics.syncBodiesToWasm();
      needsWasmSync.current = false;
    }
  }, [bodies, physics]);

  // Visual Updates Hook
  const visuals = useVisualUpdates(bodies, visualBodies, observerPos, focusedObject);

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
          
          const visualBody: VisualBody = {
            body: body,
            mesh: new THREE.Mesh(), 
            trail: trail,
            trailIdx: 0,
            trailCount: 0,
            baseRadius: data.radius * SCALE,
            type: data.type,
            rotationSpeed: rotationSpeed,
            textureUrl: data.texture
          };
          newVisualBodies.push(visualBody);
        });

        setBodies(newBodies);
        setVisualBodies(newVisualBodies);
        // Initialize simTime in physics engine if needed, but it defaults to Date.now()
        // We should sync it with startDate
        physics.setSimTime(startDate.getTime());
        setIsLoading(false);

      } catch (error) {
        console.error("Error initializing simulation:", error);
        setIsLoading(false);
      }
    };

    initSimulation();
  }, [initialData, startDate, physics]); // Added physics to deps, but setSimTime is stable

  const removeParticle = (index: number) => {
    setParticles(prev => prev.filter((_, i) => i !== index));
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

    setVisualBodies(prevVisualBodies => 
      prevVisualBodies.map(vb => {
        if (vb.body.name === name) {
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

    if (selectedObject && selectedObject.name === name) {
      setSelectedObject(prev => prev ? { ...prev, ...updates } : null);
    }
    if (focusedObject && focusedObject.name === name) {
      setFocusedObject(prev => prev ? { ...prev, ...updates } : null);
    }

    // Mark that we need to sync to WASM on next effect
    needsWasmSync.current = true;
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
      const current = prev[name] !== false;
      next[name] = !current;

      if (includeChildren) {
        const children = SOLAR_SYSTEM_DATA.filter(d => d.parent === name);
        children.forEach(child => {
          next[child.name] = !current;
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

  // Track physics debt (simulation time we still need to process)
  const physicsDebt = useRef(0);
  
  const updatePhysics = () => {
    // timeStep represents simulation seconds per real second
    // timeStep = 0 means realtime (1 sec sim per 1 sec real)
    // At 60 FPS, each frame is 1/60 seconds
    // So: dt = (timeStep === 0 ? 1 : timeStep) / 60
    const targetDt = !physics.isPaused ? ((physics.timeStep === 0 ? 1 : physics.timeStep) / 60) : 0;

    if (targetDt > 0) {
      // Start performance tracking for this frame
      physicsCompute.performanceMonitor.startFrame();
      physicsCompute.performanceMonitor.setBodyCount(bodies.length);

      // Add this frame's required simulation time to our debt
      physicsDebt.current += targetDt;
      
      // MAXIMUM ACCURACY MODE: Process ALL physics debt with fixed sub-stepping
      // Breaking large timesteps into smaller chunks for numerical stability
      const MAX_SUBSTEP = 60; // Maximum substep size in seconds (1 minute)
      
      let totalSimulatedDt = 0;
      let substepsProcessed = 0;
      
      // Process physics debt
      if (physics.useAdaptiveTimeStep) {
        // MAXIMUM ACCURACY MODE: Process ALL physics debt with fixed sub-stepping
        // Breaking large timesteps into smaller chunks for numerical stability
        while (physicsDebt.current > 0) {
          // Calculate the size of this substep (capped at MAX_SUBSTEP for stability)
          const subDt = Math.min(physicsDebt.current, MAX_SUBSTEP);
          
          // Perform the physics step
          const simulatedDt = physics.step(subDt);
          totalSimulatedDt += simulatedDt;
          physicsDebt.current -= simulatedDt;
          substepsProcessed++;
        }
      } else {
        // RAW PERFORMANCE MODE: Single step for the entire debt
        // Faster, but may be unstable at high speeds (moons might fly off)
        if (physicsDebt.current > 0) {
           const simulatedDt = physics.step(physicsDebt.current);
           totalSimulatedDt += simulatedDt;
           physicsDebt.current = 0; // All processed
           substepsProcessed = 1;
        }
      }
      
      // Update visuals with the total simulated time
      if (totalSimulatedDt > 0) {
        visuals.updateVisuals(totalSimulatedDt);
        physics.setSimTime(prev => prev + totalSimulatedDt * 1000);
      }
      
      // Performance monitoring
      if (substepsProcessed > 100) {
        console.warn(`High substep count: ${substepsProcessed} substeps processed this frame. Consider reducing time acceleration for better performance.`);
      }
      
      physicsCompute.performanceMonitor.endFrame();
    } else {
      // Simulation paused, reset debt
      physicsDebt.current = 0;
    }
  };

  // Combine everything into a single return object
  return {
    // State
    bodies,
    visualBodies,
    particles,
    selectedObject,
    focusedObject,
    orbitVisibility,
    isLoading,
    
    // Physics Engine Exports
    simTime: physics.simTime,
    timeStep: physics.timeStep,
    isPaused: physics.isPaused,
    enableTidalEvolution: physics.enableTidalEvolution,
    enableAtmosphericDrag: physics.enableAtmosphericDrag,
    enableYarkovsky: physics.enableYarkovsky,
    enablePrecession: physics.enablePrecession,
    enableNutation: physics.enableNutation,
    useTDBTime: physics.useTDBTime,
    enableRelativity: physics.enableRelativity,
    useAdaptiveTimeStep: physics.useAdaptiveTimeStep,
    
    setTimeStep: physics.setTimeStep,
    setIsPaused: physics.setIsPaused,
    setEnableTidalEvolution: physics.setEnableTidalEvolution,
    setEnableAtmosphericDrag: physics.setEnableAtmosphericDrag,
    setEnableYarkovsky: physics.setEnableYarkovsky,
    setEnablePrecession: physics.setEnablePrecession,
    setEnableNutation: physics.setEnableNutation,
    setUseTDBTime: physics.setUseTDBTime,
    setEnableRelativity: physics.setEnableRelativity,
    setUseAdaptiveTimeStep: physics.setUseAdaptiveTimeStep,
    updatePhysics,

    // Visual Updates Exports
    visualScale: visuals.visualScale,
    useVisualScale: visuals.useVisualScale,
    useLightTimeDelay: visuals.useLightTimeDelay,
    enableLightAberration: visuals.enableLightAberration,
    
    setVisualScale: visuals.setVisualScale,
    setUseVisualScale: visuals.setUseVisualScale,
    setUseLightTimeDelay: visuals.setUseLightTimeDelay,
    setEnableLightAberration: visuals.setEnableLightAberration,
    
    // Simulation Methods
    setObserverPosition,
    setSelectedObject,
    setFocusedObject,
    removeParticle,
    updateBody,
    addBody,
    toggleOrbitVisibility,
    setAllOrbitVisibility,
    
    // External Compute
    physicsCompute
  };
}
