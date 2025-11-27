import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, Particle } from '../types';
import { SCALE } from '../utils/constants';

/**
 * Convert UTC time to Barycentric Dynamical Time (TDB)
 * TDB is the time standard used for Solar System dynamics calculations
 * @param utcTime - Time in milliseconds since Unix epoch (UTC)
 * @returns Time in milliseconds since Unix epoch (TDB)
 */
function utcToTDB(utcTime: number): number {
  // Convert milliseconds to Julian Date
  const jd = utcTime / 86400000 + 2440587.5;
  
  // Time in centuries since J2000.0
  const t = (jd - 2451545.0) / 36525.0;
  
  // Earth's mean anomaly (degrees)
  const g = 357.53 + 35999.05 * t;
  const g_rad = g * Math.PI / 180.0;
  
  // TDB - TT periodic correction (seconds)
  // Simplified formula: TDB - TT ≈ 0.001658 sin(g) + 0.000014 sin(2g)
  const tdb_tt = 0.001658 * Math.sin(g_rad) + 0.000014 * Math.sin(2 * g_rad);
  
  // TT - TAI offset (constant 32.184 seconds)
  const tt_tai = 32.184;
  
  // TAI - UTC offset (leap seconds, 37 as of 2024)
  // NOTE: Update this value when new leap seconds are announced
  const tai_utc = 37.0;
  
  // Total correction: UTC → TAI → TT → TDB
  const total_correction_seconds = tai_utc + tt_tai + tdb_tt;
  
  // Convert seconds to milliseconds and add to UTC time
  return utcTime + total_correction_seconds * 1000;
}
import { usePhysicsCompute } from './usePhysicsCompute';
import init, { PhysicsEngine as WasmPhysicsEngine } from '../../physics-wasm/pkg/physics_wasm';

export interface PhysicsEngine {
  simTime: number;
  setSimTime: React.Dispatch<React.SetStateAction<number>>;
  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  timeStep: number;
  setTimeStep: React.Dispatch<React.SetStateAction<number>>;
  particles: Particle[];

  // Settings
  enableTidalEvolution: boolean;
  setEnableTidalEvolution: React.Dispatch<React.SetStateAction<boolean>>;
  enableAtmosphericDrag: boolean;
  setEnableAtmosphericDrag: React.Dispatch<React.SetStateAction<boolean>>;
  enablePrecession: boolean;
  setEnablePrecession: React.Dispatch<React.SetStateAction<boolean>>;
  enableNutation: boolean;
  setEnableNutation: React.Dispatch<React.SetStateAction<boolean>>;
  useTDBTime: boolean;
  setUseTDBTime: React.Dispatch<React.SetStateAction<boolean>>;
  enableYarkovsky: boolean;
  setEnableYarkovsky: React.Dispatch<React.SetStateAction<boolean>>;
  enableRelativity: boolean;
  setEnableRelativity: React.Dispatch<React.SetStateAction<boolean>>;
  useAdaptiveTimeStep: boolean;
  setUseAdaptiveTimeStep: React.Dispatch<React.SetStateAction<boolean>>;
  adaptiveQuality: number;
  setAdaptiveQuality: React.Dispatch<React.SetStateAction<number>>;
  useEIH: boolean;
  setUseEIH: React.Dispatch<React.SetStateAction<boolean>>;
  enableSolarMassLoss: boolean;
  setEnableSolarMassLoss: React.Dispatch<React.SetStateAction<boolean>>;
  enableCollisions: boolean;
  setEnableCollisions: React.Dispatch<React.SetStateAction<boolean>>;
  enablePRDrag: boolean;
  setEnablePRDrag: React.Dispatch<React.SetStateAction<boolean>>;

  // Methods
  step: (dt: number) => number;
  syncBodiesToWasm: () => void;
  getVisualState: (
    observerPos: THREE.Vector3,
    visualScale: number,
    useVisualScale: boolean,
    useLightTimeDelay: boolean,
    enableLightAberration: boolean,
    focusedBodyIdx: number,
    scaleFactor: number
  ) => any;
}

export function usePhysicsEngine(
  bodies: PhysicsBody[],
  initialTime: number
): PhysicsEngine {
  const [simTime, setSimTime] = useState(initialTime);
  const [isPaused, setIsPaused] = useState(false); // Simulation running by default  
  const [timeStep, setTimeStep] = useState(0); // Real time: 0 = realtime (1 second per second)
  const [particles, setParticles] = useState<Particle[]>([]);

  // Refs for throttled time updates
  const simTimeRef = useRef(initialTime);
  const lastStateUpdateTime = useRef(0);

  // Sync ref if initialTime changes
  useEffect(() => {
    if (simTimeRef.current === initialTime) return;
    simTimeRef.current = initialTime;
  }, [initialTime]);

  // Physics Settings
  const [enableTidalEvolution, setEnableTidalEvolution] = useState(true);
  const [enableAtmosphericDrag, setEnableAtmosphericDrag] = useState(true);
  const [enablePrecession, setEnablePrecession] = useState(true);
  const [enableNutation, setEnableNutation] = useState(true);
  const [useTDBTime, setUseTDBTime] = useState(true);
  const [enableYarkovsky, setEnableYarkovsky] = useState(true);
  const [enableRelativity, setEnableRelativity] = useState(true);
  const [useAdaptiveTimeStep, setUseAdaptiveTimeStep] = useState(true); // Adaptive timestep enabled by default
  const [adaptiveQuality, setAdaptiveQuality] = useState(2); // 0=Low, 1=Medium, 2=High (Default), 3=Ultra
  const [useEIH, setUseEIH] = useState(true); // Default to Maximum Accuracy
  
  // New Toggles
  const [enableSolarMassLoss, setEnableSolarMassLoss] = useState(true);
  const [enableCollisions, setEnableCollisions] = useState(true);
  const [enablePRDrag, setEnablePRDrag] = useState(true);

  const physicsCompute = usePhysicsCompute();
  const wasmEngineRef = useRef<WasmPhysicsEngine | null>(null);
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmInitialized, setWasmInitialized] = useState(false);

  // Initialize WASM module (once)
  useEffect(() => {
    const loadWasm = async () => {
      try {
        await init();
        console.log("WASM Module Loaded");
        setWasmInitialized(true);
      } catch (e) {
        console.error("Failed to load WASM module:", e);
      }
    };
    loadWasm();
  }, []);

  // Create/Update WASM engine when bodies change
  useEffect(() => {
    if (!wasmInitialized || bodies.length === 0) return;
    
    try {
      // Convert bodies to plain objects for WASM
      const wasmBodies = bodies.map(b => ({
        name: b.name,
        mass: b.mass,
        radius: b.radius,
        pos: { x: b.pos.x, y: b.pos.y, z: b.pos.z },
        vel: { x: b.vel.x, y: b.vel.y, z: b.vel.z },
        j2: b.J2,
        j3: b.J3,
        j4: b.J4,
        c22: b.C22,
        s22: b.S22,
        poleVector: b.poleVector ? { x: b.poleVector.x, y: b.poleVector.y, z: b.poleVector.z } : null,
        k2: b.k2,
        tidalQ: b.tidalQ,
        angularVelocity: b.angularVelocity ? { x: b.angularVelocity.x, y: b.angularVelocity.y, z: b.angularVelocity.z } : null,
        momentOfInertia: b.momentOfInertia,
        hasAtmosphere: b.hasAtmosphere,
        surfacePressure: b.surfacePressure,
        scaleHeight: b.scaleHeight,
        meanTemperature: b.meanTemperature,
        dragCoefficient: b.dragCoefficient,
        albedo: b.albedo,
        thermalInertia: b.thermalInertia,
        poleRA0: b.poleRA0,
        poleDec0: b.poleDec0,
        precessionRate: b.precessionRate,
        nutationAmplitude: b.nutationAmplitude,
        libration: b.libration
      }));
      
      if (!wasmEngineRef.current) {
        // Create engine for the first time
        wasmEngineRef.current = new WasmPhysicsEngine(wasmBodies);
        console.log(`WASM Physics Engine Initialized with ${bodies.length} bodies`);
      } else {
        // Update existing engine
        wasmEngineRef.current.update_bodies(wasmBodies);
        console.log(`WASM Physics Engine Updated with ${bodies.length} bodies`);
      }
      setWasmReady(true);
    } catch (e) {
      console.error("Failed to create/update WASM physics engine:", e);
      setWasmReady(false);
    }
  }, [wasmInitialized, bodies.length]); // Re-update when body count changes

  // Manual sync function to push body changes to WASM
  const syncBodiesToWasm = useCallback(() => {
    if (!wasmReady || !wasmEngineRef.current || bodies.length === 0) return;
    
    try {
      const wasmBodies = bodies.map(b => ({
        name: b.name,
        mass: b.mass,
        radius: b.radius,
        pos: { x: b.pos.x, y: b.pos.y, z: b.pos.z },
        vel: { x: b.vel.x, y: b.vel.y, z: b.vel.z },
        j2: b.J2,
        j3: b.J3,
        j4: b.J4,
        c22: b.C22,
        s22: b.S22,
        poleVector: b.poleVector ? { x: b.poleVector.x, y: b.poleVector.y, z: b.poleVector.z } : null,
        k2: b.k2,
        tidalQ: b.tidalQ,
        angularVelocity: b.angularVelocity ? { x: b.angularVelocity.x, y: b.angularVelocity.y, z: b.angularVelocity.z } : null,
        momentOfInertia: b.momentOfInertia,
        hasAtmosphere: b.hasAtmosphere,
        surfacePressure: b.surfacePressure,
        scaleHeight: b.scaleHeight,
        meanTemperature: b.meanTemperature,
        dragCoefficient: b.dragCoefficient,
        albedo: b.albedo,
        thermalInertia: b.thermalInertia,
        poleRA0: b.poleRA0,
        poleDec0: b.poleDec0,
        precessionRate: b.precessionRate,
        nutationAmplitude: b.nutationAmplitude,
        libration: b.libration
      }));
      
      wasmEngineRef.current.update_bodies(wasmBodies);
      console.log(`Manually synced ${bodies.length} bodies to WASM physics engine`);
    } catch (e) {
      console.error("Failed to sync bodies to WASM:", e);
    }
  }, [wasmReady, bodies]);

  const step = useCallback((dt: number) => {
    // Get current time in TDB if enabled
    // Use the ref for accurate physics time
    const currentTime = useTDBTime ? utcToTDB(simTimeRef.current) : simTimeRef.current;

    let simulatedDt = dt;

    if (wasmReady && wasmEngineRef.current) {
        try {
            // Pass flags: dt, sim_time, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih
            // WASM now handles adaptive sub-stepping internally for stability
            simulatedDt = wasmEngineRef.current.step(
                dt,
                currentTime, // Pass sim_time for pole updates
                enableRelativity, 
                true, // enable_j2 (Always on for high fidelity, or use a setting)
                enableTidalEvolution,
                true, // enable_srp
                enableYarkovsky,
                enableAtmosphericDrag,
                useEIH,
                enablePrecession, // enable_precession
                enableNutation,    // enable_nutation
                enableSolarMassLoss,
                enablePRDrag,
                useAdaptiveTimeStep,
                adaptiveQuality // 0=Low, 1=Medium, 2=High, 3=Ultra
            );
            
            // Sync back bodies
            const newBodies = wasmEngineRef.current.get_bodies();
            for (let i = 0; i < bodies.length; i++) {
                const nb = newBodies[i];
                if (nb) {
                    bodies[i].pos.set(nb.pos.x, nb.pos.y, nb.pos.z);
                    bodies[i].vel.set(nb.vel.x, nb.vel.y, nb.vel.z);
                    if (nb.angular_velocity) {
                        if (!bodies[i].angularVelocity) bodies[i].angularVelocity = new THREE.Vector3();
                        bodies[i].angularVelocity!.set(nb.angular_velocity.x, nb.angular_velocity.y, nb.angular_velocity.z);
                    }
                    // Sync pole vector if updated
                    if (nb.pole_vector) {
                        if (!bodies[i].poleVector) bodies[i].poleVector = new THREE.Vector3();
                        bodies[i].poleVector!.set(nb.pole_vector.x, nb.pole_vector.y, nb.pole_vector.z);
                    }
                    // Sync libration
                    if (nb.libration !== undefined) {
                        bodies[i].libration = nb.libration;
                    }
                }
            }
        } catch (e) {
            console.error("WASM Step failed", e);
        }
    } else {
        console.warn("WASM Physics not ready yet");
        simulatedDt = 0;
    }

    // Check collisions
    let collisionPositions: {x: number, y: number, z: number}[] = [];
    if (enableCollisions && wasmReady && wasmEngineRef.current) {
         const cols = wasmEngineRef.current.check_collisions();
         collisionPositions = cols as any; 
    }

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

    // Return the actual time simulated
    return simulatedDt;

  }, [bodies, useTDBTime, enablePrecession, enableNutation, physicsCompute, setParticles, enableTidalEvolution, enableAtmosphericDrag, enableYarkovsky, enableRelativity, useEIH, wasmReady, enableSolarMassLoss, enablePRDrag, enableCollisions, useAdaptiveTimeStep]);

  // Custom setter to handle ref and throttling
  const setSimTimeThrottled = useCallback((valOrUpdater: number | ((prev: number) => number)) => {
    let newVal: number;
    if (typeof valOrUpdater === 'function') {
      newVal = valOrUpdater(simTimeRef.current);
    } else {
      newVal = valOrUpdater;
    }
    
    simTimeRef.current = newVal;

    // Throttle React state update to ~15 FPS (every 60ms)
    const now = performance.now();
    if (now - lastStateUpdateTime.current > 60) {
      setSimTime(newVal);
      lastStateUpdateTime.current = now;
    }
  }, []);

  // Force update state when pausing to ensure UI is consistent
  useEffect(() => {
    if (isPaused) {
        setSimTime(simTimeRef.current);
    }
  }, [isPaused]);

  // Expose getVisualState for visual updates
  const getVisualState = useCallback((
    observerPos: THREE.Vector3,
    visualScale: number,
    useVisualScale: boolean,
    useLightTimeDelay: boolean,
    enableLightAberration: boolean,
    focusedBodyIdx: number,
    scaleFactor: number
  ) => {
    if (!wasmReady || !wasmEngineRef.current) return null;
    
    try {
        return wasmEngineRef.current.get_visual_state(
            observerPos.x,
            observerPos.y,
            observerPos.z,
            visualScale,
            useVisualScale,
            useLightTimeDelay,
            enableLightAberration,
            focusedBodyIdx,
            scaleFactor
        );
    } catch (e) {
        console.error("WASM get_visual_state failed", e);
        return null;
    }
  }, [wasmReady]);

  return {
    simTime,
    setSimTime: setSimTimeThrottled, // Use our wrapper
    timeStep,
    setTimeStep,
    isPaused,
    setIsPaused,
    enableTidalEvolution,
    setEnableTidalEvolution,
    enableAtmosphericDrag,
    setEnableAtmosphericDrag,
    enableYarkovsky,
    setEnableYarkovsky,
    enablePrecession,
    setEnablePrecession,
    enableNutation,
    setEnableNutation,
    useTDBTime,
    setUseTDBTime,
    enableRelativity,
    setEnableRelativity,
    useAdaptiveTimeStep,
    setUseAdaptiveTimeStep,
    adaptiveQuality,
    setAdaptiveQuality,
    useEIH,
    setUseEIH,
    enableSolarMassLoss,
    setEnableSolarMassLoss,
    enableCollisions,
    setEnableCollisions,
    enablePRDrag,
    setEnablePRDrag,
    particles,
    step,
    syncBodiesToWasm,
    getVisualState
  };
}