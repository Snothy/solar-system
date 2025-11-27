import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, VisualBody, Particle } from '../types';
import type { SolarSystemData } from '../types/data';
import { SOLAR_SYSTEM_DATA } from '../data/solarSystem';
import { START_DATE, SCALE, TRAIL_LENGTH } from '../utils/constants';
import { computePoleVector } from '../utils/precession';
import { usePhysicsCompute } from './usePhysicsCompute';
import { usePhysicsEngine } from './usePhysicsEngine';
import { useVisualUpdates } from './useVisualUpdates';

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

  // Physics compute (worker/GPU) integration
  const physicsCompute = usePhysicsCompute();

  // Physics Engine Hook
  const physics = usePhysicsEngine(bodies, setParticles, physicsCompute);

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

  const updatePhysics = () => {
    const dt = (!physics.isPaused && physics.timeStep > 0) ? (physics.timeStep / 60) : 0;

    if (dt > 0) {
      const simulatedDt = physics.step(dt);
      visuals.updateVisuals(simulatedDt);
      physics.setSimTime(prev => prev + simulatedDt * 1000);
      physicsCompute.performanceMonitor.endFrame();
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
