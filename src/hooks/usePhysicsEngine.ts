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
import init, { PhysicsEngine as WasmPhysicsEngine } from '../../physics-wasm/pkg/physics_wasm';
import { usePhysicsCompute } from './usePhysicsCompute';
import type { IntegratorMode } from '../components/UI/PhysicsSettings';

export interface PhysicsEngine {
  // State
  simTime: number;
  timeStep: number;
  isPaused: boolean;
  
  // Settings
  enableTidalEvolution: boolean;
  setEnableTidalEvolution: React.Dispatch<React.SetStateAction<boolean>>;
  enableAtmosphericDrag: boolean;
  setEnableAtmosphericDrag: React.Dispatch<React.SetStateAction<boolean>>;
  enableYarkovsky: boolean;
  setEnableYarkovsky: React.Dispatch<React.SetStateAction<boolean>>;
  enablePrecession: boolean;
  setEnablePrecession: React.Dispatch<React.SetStateAction<boolean>>;
  enableNutation: boolean;
  setEnableNutation: React.Dispatch<React.SetStateAction<boolean>>;
  useTDBTime: boolean;
  setUseTDBTime: React.Dispatch<React.SetStateAction<boolean>>;
  enableRelativity: boolean;
  setEnableRelativity: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Integrator Settings
  integratorMode: IntegratorMode;
  setIntegratorMode: React.Dispatch<React.SetStateAction<IntegratorMode>>;
  adaptiveQuality: number;
  setAdaptiveQuality: React.Dispatch<React.SetStateAction<number>>;
  wisdomHolmanQuality: number;
  setWisdomHolmanQuality: React.Dispatch<React.SetStateAction<number>>;
  
  // New Toggles
  enableSolarMassLoss: boolean;
  setEnableSolarMassLoss: React.Dispatch<React.SetStateAction<boolean>>;
  enableCollisions: boolean;
  setEnableCollisions: React.Dispatch<React.SetStateAction<boolean>>;
  enablePRDrag: boolean;
  setEnablePRDrag: React.Dispatch<React.SetStateAction<boolean>>;
  useEIH: boolean;
  setUseEIH: React.Dispatch<React.SetStateAction<boolean>>;

  // Backward compatibility
  useAdaptiveTimeStep: boolean;
  setUseAdaptiveTimeStep: React.Dispatch<React.SetStateAction<boolean>>;
  useWisdomHolman: boolean;
  setUseWisdomHolman: React.Dispatch<React.SetStateAction<boolean>>;

  // Methods
  step: (dt: number) => number;
  setTimeStep: (step: number) => void;
  setIsPaused: (paused: boolean) => void;
  setSimTime: React.Dispatch<React.SetStateAction<number>>;
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
  particles: Particle[];
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
}

export function usePhysicsEngine(bodies: PhysicsBody[], initialTime: number): PhysicsEngine {
  const [simTime, setSimTimeState] = useState(initialTime);
  const [timeStep, setTimeStep] = useState(0); // 0 = Realtime
  const [isPaused, setIsPaused] = useState(false);
  
  // Refs for throttled time updates
  const simTimeRef = useRef(initialTime);
  const lastStateUpdateTime = useRef(0);

  // Wrapper to keep ref in sync with state
  const setSimTime = useCallback((value: number | ((prev: number) => number)) => {
      setSimTimeState(prev => {
          const newValue = typeof value === 'function' ? value(prev) : value;
          simTimeRef.current = newValue;
          return newValue;
      });
  }, []);

  // Physics Settings
  const [enableTidalEvolution, setEnableTidalEvolution] = useState(true);
  const [enableAtmosphericDrag, setEnableAtmosphericDrag] = useState(true);
  const [enableYarkovsky, setEnableYarkovsky] = useState(true);
  const [enablePrecession, setEnablePrecession] = useState(true);
  const [enableNutation, setEnableNutation] = useState(true);
  const [useTDBTime, setUseTDBTime] = useState(true);
  const [enableRelativity, setEnableRelativity] = useState(true);
  const [useEIH, setUseEIH] = useState(true);
  
  // Integrator Settings
  const [integratorMode, setIntegratorMode] = useState<IntegratorMode>('saba4'); // Default to best
  const [adaptiveQuality, setAdaptiveQuality] = useState(2); // High default
  const [wisdomHolmanQuality, setWisdomHolmanQuality] = useState(1); // Medium default

  // New Toggles
  const [enableSolarMassLoss, setEnableSolarMassLoss] = useState(true);
  const [enableCollisions, setEnableCollisions] = useState(true);
  const [enablePRDrag, setEnablePRDrag] = useState(true);

  const physicsCompute = usePhysicsCompute();
  const wasmEngineRef = useRef<WasmPhysicsEngine | null>(null);
  const [wasmReady, setWasmReady] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Initialize WASM module (once)
  useEffect(() => {
    const loadWasm = async () => {
      try {
        await init();
        console.log("WASM Module Loaded");
        setWasmReady(true);
      } catch (e) {
        console.error("Failed to load WASM module:", e);
      }
    };
    loadWasm();
  }, []);

  // Create/Update WASM engine when bodies change
  useEffect(() => {
    // Only proceed if WASM module is loaded and there are bodies
    if (!wasmReady || bodies.length === 0) return;
    
    try {
      // Convert bodies to plain objects for WASM
      const wasmBodies = bodies.map(b => {
        return {
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
          pole_vector: b.poleVector ? { x: b.poleVector.x, y: b.poleVector.y, z: b.poleVector.z } : { x: 0, y: 1, z: 0 },
          k2: b.k2,
          tidal_q: b.tidalQ,
          angular_velocity: b.angularVelocity ? { x: b.angularVelocity.x, y: b.angularVelocity.y, z: b.angularVelocity.z } : null,
          moment_of_inertia: b.momentOfInertia,
          has_atmosphere: b.hasAtmosphere,
          surface_pressure: b.surfacePressure,
          scale_height: b.scaleHeight,
          mean_temperature: b.meanTemperature,
          drag_coefficient: b.dragCoefficient,
          albedo: b.albedo,
          thermal_inertia: b.thermalInertia,
          pole_ra0: b.poleRA0,
          pole_dec0: b.poleDec0,
          precession_rate: b.precessionRate,
          nutation_amplitude: b.nutationAmplitude,
          libration: b.libration
        };
      });
      
      if (!wasmEngineRef.current) {
        // Create engine for the first time
        wasmEngineRef.current = new WasmPhysicsEngine(wasmBodies);
        console.log(`WASM Physics Engine Initialized with ${bodies.length} bodies`);
      } else {
        // Update existing engine
        wasmEngineRef.current.update_bodies(wasmBodies);
        console.log(`WASM Physics Engine Updated with ${bodies.length} bodies`);
      }
    } catch (e) {
      console.error("Failed to create/update WASM physics engine:", e);
    }
  }, [wasmReady, bodies.length]); // Re-update when body count changes

  // Manual sync function to push body changes to WASM
  const syncBodiesToWasm = useCallback(() => {
    if (!wasmReady || !wasmEngineRef.current || bodies.length === 0) return;
    
    try {
      const wasmBodies = bodies.map(b => {
        return {
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
          pole_vector: b.poleVector ? { x: b.poleVector.x, y: b.poleVector.y, z: b.poleVector.z } : { x: 0, y: 1, z: 0 },
          k2: b.k2,
          tidal_q: b.tidalQ,
          angular_velocity: b.angularVelocity ? { x: b.angularVelocity.x, y: b.angularVelocity.y, z: b.angularVelocity.z } : null,
          moment_of_inertia: b.momentOfInertia,
          has_atmosphere: b.hasAtmosphere,
          surface_pressure: b.surfacePressure,
          scale_height: b.scaleHeight,
          mean_temperature: b.meanTemperature,
          drag_coefficient: b.dragCoefficient,
          albedo: b.albedo,
          thermal_inertia: b.thermalInertia,
          pole_ra0: b.poleRA0,
          pole_dec0: b.poleDec0,
          precession_rate: b.precessionRate,
          nutation_amplitude: b.nutationAmplitude,
          libration: b.libration
        };
      });
      
      wasmEngineRef.current.update_bodies(wasmBodies);
      console.log(`Manually synced ${bodies.length} bodies to WASM physics engine`);
    } catch (e) {
      console.error("Failed to sync bodies to WASM:", e);
    }
  }, [wasmReady, bodies]);

  const step = useCallback((dt: number) => {
    if (!wasmEngineRef.current || !wasmReady) return 0;
    
    try {
        // Map integratorMode string to u8
        let integratorType = 0; // Adaptive
        let quality = adaptiveQuality;
        
        if (integratorMode === 'wisdom-holman') {
            integratorType = 1;
            quality = wisdomHolmanQuality;
        } else if (integratorMode === 'saba4') {
            integratorType = 2;
            quality = wisdomHolmanQuality; // Reuse WH quality for now
        } else if (integratorMode === 'high-precision') {
            integratorType = 3;
            quality = 3; // Ultra
        } else {
            // Adaptive
            integratorType = 0;
            quality = adaptiveQuality;
        }

        const currentSimTime = simTimeRef.current;
        const tdbTime = useTDBTime ? utcToTDB(currentSimTime) : currentSimTime;
        const jdTime = tdbTime / 86400000 + 2440587.5;

        const simulatedDt = wasmEngineRef.current.step(
            dt,
            jdTime, // Pass Julian Date to WASM
            enableRelativity, 
            true, // enable_j2 (Always on for high fidelity, or use a setting)
            enableTidalEvolution,
            true, // enable_srp
            enableYarkovsky,
            enableAtmosphericDrag,
            useEIH,
            enablePrecession,
            enableNutation,
            enableSolarMassLoss,
            enablePRDrag,
            integratorType,
            quality
        );
        
        // Update simTime (convert seconds to milliseconds)
        simTimeRef.current += simulatedDt * 1000;
        
        // Throttle React state updates for UI
        const now = performance.now();
        if (now - lastStateUpdateTime.current > 100) { // 10fps UI update
            setSimTime(simTimeRef.current);
            lastStateUpdateTime.current = now;
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

        // Let's fetch state for the bodies array occasionally?
        if (now - lastStateUpdateTime.current > 500) {
             const states = wasmEngineRef.current.get_bodies();
             // We don't want to trigger a re-render of the whole body list every 500ms if not needed.
             // But we might want to update the mutable objects in the array without triggering React?
             for (let i = 0; i < bodies.length; i++) {
                const nb = states[i];
                if (nb) {
                    bodies[i].pos.set(nb.pos.x, nb.pos.y, nb.pos.z);
                    bodies[i].vel.set(nb.vel.x, nb.vel.y, nb.vel.z);
                    // Update orientation
                    // if (!bodies[i].angularVelocity) bodies[i].angularVelocity = new THREE.Vector3();
                    // bodies[i].angularVelocity!.set(nb.angular_velocity.x, nb.angular_velocity.y, nb.angular_velocity.z);
                    
                    // Update pole vector
                    // if (!bodies[i].poleVector) bodies[i].poleVector = new THREE.Vector3();
                    // bodies[i].poleVector!.set(nb.pole_vector.x, nb.pole_vector.y, nb.pole_vector.z);
                    
                    // Update libration
                    // bodies[i].libration = nb.libration;
                }
            }
        }

        return simulatedDt;
    } catch (e) {
        console.error(e);
        return 0;
    }
  }, [bodies, useTDBTime, enablePrecession, enableNutation, physicsCompute, setParticles, enableTidalEvolution, enableAtmosphericDrag, enableYarkovsky, enableRelativity, useEIH, wasmReady, enableSolarMassLoss, enablePRDrag, enableCollisions, integratorMode, adaptiveQuality, wisdomHolmanQuality]);

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

  // Backward compatibility wrappers
  const useAdaptiveTimeStep = integratorMode === 'adaptive';
  const setUseAdaptiveTimeStep = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
      setIntegratorMode(prev => {
          const newVal = typeof val === 'function' ? val(prev === 'adaptive') : val;
          return newVal ? 'adaptive' : 'standard';
      });
  }, []);

  const useWisdomHolman = integratorMode === 'wisdom-holman';
  const setUseWisdomHolman = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
      setIntegratorMode(prev => {
          const newVal = typeof val === 'function' ? val(prev === 'wisdom-holman') : val;
          return newVal ? 'wisdom-holman' : 'standard';
      });
  }, []);

  return {
    simTime,
    setSimTime, // Use direct setter
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
    integratorMode,
    setIntegratorMode,
    adaptiveQuality,
    setAdaptiveQuality,
    wisdomHolmanQuality,
    setWisdomHolmanQuality,
    useEIH,
    setUseEIH,
    enableSolarMassLoss,
    setEnableSolarMassLoss,
    enableCollisions,
    setEnableCollisions,
    enablePRDrag,
    setEnablePRDrag,
    // Backward compatibility
    useAdaptiveTimeStep,
    setUseAdaptiveTimeStep,
    useWisdomHolman,
    setUseWisdomHolman,
    particles,
    setParticles,
    step,
    syncBodiesToWasm,
    getVisualState
  };
}