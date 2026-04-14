import { useState, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { PhysicsBody, Particle } from "../types";
import { SCALE } from "../utils/constants";
import { bodyToWasm, wasmToPhysicsPos } from "../physics/wasmInterface";

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
  const g_rad = (g * Math.PI) / 180.0;

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
import init, {
  FrontendSimulation as WasmPhysicsEngine,
} from "../../physics-wasm/pkg/physics_wasm";
import { usePhysicsCompute } from "./usePhysicsCompute";
import type { IntegratorMode } from "../components/UI/PhysicsSettings";

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
  sabaQuality: number;
  setSabaQuality: React.Dispatch<React.SetStateAction<number>>;
  highPrecisionQuality: number;
  setHighPrecisionQuality: React.Dispatch<React.SetStateAction<number>>;

  // New Toggles
  enableSolarMassLoss: boolean;
  setEnableSolarMassLoss: React.Dispatch<React.SetStateAction<boolean>>;
  enableCollisions: boolean;
  setEnableCollisions: React.Dispatch<React.SetStateAction<boolean>>;
  enablePRDrag: boolean;
  setEnablePRDrag: React.Dispatch<React.SetStateAction<boolean>>;
  enableYORP: boolean;
  setEnableYORP: React.Dispatch<React.SetStateAction<boolean>>;
  enableCometForces: boolean;
  setEnableCometForces: React.Dispatch<React.SetStateAction<boolean>>;
  useEIH: boolean;
  setUseEIH: React.Dispatch<React.SetStateAction<boolean>>;
  enableGravitationalHarmonics: boolean;
  setEnableGravitationalHarmonics: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  enableSolarRadiationPressure: boolean;
  setEnableSolarRadiationPressure: React.Dispatch<
    React.SetStateAction<boolean>
  >;

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
    scaleFactor: number,
  ) => any;
  particles: Particle[];
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
}

export function usePhysicsEngine(
  bodies: PhysicsBody[],
  initialTime: number,
): PhysicsEngine {
  const [simTime, setSimTimeState] = useState(initialTime);
  const [timeStep, setTimeStep] = useState(0); // 0 = Realtime
  const [isPaused, setIsPaused] = useState(false);

  // Refs for throttled time updates
  const simTimeRef = useRef(initialTime);
  const lastStateUpdateTime = useRef(0);
  const lastBodySyncTime = useRef(0);

  // Wrapper to keep ref in sync with state
  const setSimTime = useCallback(
    (value: number | ((prev: number) => number)) => {
      setSimTimeState((prev) => {
        const newValue = typeof value === "function" ? value(prev) : value;
        simTimeRef.current = newValue;
        return newValue;
      });
    },
    [],
  );

  // Physics Settings
  const [enableTidalEvolution, setEnableTidalEvolution] = useState(true);
  const [enableAtmosphericDrag, setEnableAtmosphericDrag] = useState(true);
  const [enableYarkovsky, setEnableYarkovsky] = useState(true);
  const [enablePrecession, setEnablePrecession] = useState(true);
  const [enableNutation, setEnableNutation] = useState(true);
  const [useTDBTime, setUseTDBTime] = useState(true);
  const [enableRelativity, setEnableRelativity] = useState(true);
  const [useEIH, setUseEIH] = useState(true);
  const [enableGravitationalHarmonics, setEnableGravitationalHarmonics] =
    useState(true);
  const [enableSolarRadiationPressure, setEnableSolarRadiationPressure] =
    useState(true);

  // Integrator Settings
  const [integratorMode, setIntegratorMode] = useState<IntegratorMode>("saba4"); // Default to best
  const [adaptiveQuality, setAdaptiveQuality] = useState(2); // High default
  const [wisdomHolmanQuality, setWisdomHolmanQuality] = useState(1); // Medium default
  const [sabaQuality, setSabaQuality] = useState(1); // Medium default
  const [highPrecisionQuality, setHighPrecisionQuality] = useState(2); // High default

  // New Toggles
  const [enableSolarMassLoss, setEnableSolarMassLoss] = useState(true);
  const [enableCollisions, setEnableCollisions] = useState(true);
  const [enablePRDrag, setEnablePRDrag] = useState(true);
  const [enableYORP, setEnableYORP] = useState(true);
  const [enableCometForces, setEnableCometForces] = useState(true);

  const physicsCompute = usePhysicsCompute();
  const wasmEngineRef = useRef<WasmPhysicsEngine | null>(null);
  const [wasmReady, setWasmReady] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Initialize WASM module (once)
  useEffect(() => {
    const loadWasm = async () => {
      try {
        await init();
        setWasmReady(true);
      } catch (e) {
        console.error("Failed to load WASM module:", e);
      }
    };
    loadWasm();
  }, []);

  // Push config to WASM engine whenever settings change
  useEffect(() => {
    if (!wasmReady || !wasmEngineRef.current) return;
    const config = {
      relativity: enableRelativity,
      gravitationalHarmonics: enableGravitationalHarmonics,
      tidalForces: enableTidalEvolution,
      solarRadiationPressure: enableSolarRadiationPressure,
      yarkovskyEffect: enableYarkovsky,
      atmosphericDrag: enableAtmosphericDrag,
      useEih: useEIH,
      poyntingRobertsonDrag: enablePRDrag,
      yorpEffect: enableYORP,
      cometForces: enableCometForces,
      precession: enablePrecession,
      nutation: enableNutation,
      solarMassLoss: enableSolarMassLoss,
      collisions: enableCollisions,
    };
    wasmEngineRef.current.set_config(config);
  }, [
    wasmReady,
    enableRelativity,
    enableGravitationalHarmonics,
    enableTidalEvolution,
    enableSolarRadiationPressure,
    enableYarkovsky,
    enableAtmosphericDrag,
    useEIH,
    enablePRDrag,
    enableYORP,
    enableCometForces,
    enablePrecession,
    enableNutation,
    enableSolarMassLoss,
    enableCollisions,
  ]);

  // Create/Update WASM engine when bodies change
  // Create/Update WASM engine when bodies change
  useEffect(() => {
    if (!wasmReady || bodies.length === 0) return;

    try {
      const wasmBodies = bodies.map((b) => bodyToWasm(b));

      if (!wasmEngineRef.current) {
        // Fix: Convert initialTime (Unix ms) to Julian Date
        const tdbTime = useTDBTime ? utcToTDB(initialTime) : initialTime;
        const initialJd = tdbTime / 86400000 + 2440587.5;

        wasmEngineRef.current = new WasmPhysicsEngine(wasmBodies, initialJd);
      } else {
        wasmEngineRef.current.update_bodies(wasmBodies);
      }
    } catch (e) {
      console.error("Failed to create/update WASM physics engine:", e);
    }
  }, [wasmReady, bodies.length]);

  // Manual sync function to push body changes to WASM
  const syncBodiesToWasm = useCallback(() => {
    if (!wasmReady || !wasmEngineRef.current || bodies.length === 0) return;

    try {
      const wasmBodies = bodies.map((b) => bodyToWasm(b));
      wasmEngineRef.current.update_bodies(wasmBodies);
    } catch (e) {
      console.error("Failed to sync bodies to WASM:", e);
    }
  }, [wasmReady, bodies]);

  const step = useCallback(
    (dt: number) => {
      if (!wasmEngineRef.current || !wasmReady) return 0;

      try {
        // Map integratorMode string to u8
        let integratorType = 0; // Adaptive
        let quality = adaptiveQuality;

        if (integratorMode === "wisdom-holman") {
          integratorType = 1;
          quality = wisdomHolmanQuality;
        } else if (integratorMode === "saba4") {
          integratorType = 2;
          quality = sabaQuality;
        } else if (integratorMode === "high-precision") {
          integratorType = 3;
          quality = highPrecisionQuality;
        } else {
          // Adaptive (Symplectic)
          integratorType = 0;
          quality = adaptiveQuality;
        }

        const currentSimTime = simTimeRef.current;
        // Fix: Pass elapsed simulation time in seconds, not Julian Date
        const simTimeSec = (currentSimTime - initialTime) / 1000;

        const simulatedDt = wasmEngineRef.current.step(
          dt,
          simTimeSec, // Now matches your test runner logic
          integratorType,
          quality,
        );

        // Update simTime (convert seconds to milliseconds)
        simTimeRef.current += simulatedDt * 1000;

        // Throttle React state updates for UI
        const now = performance.now();
        if (now - lastStateUpdateTime.current > 100) {
          // 10fps UI update
          setSimTime(simTimeRef.current);
          lastStateUpdateTime.current = now;
        }

        // Check collisions
        let collisionPositions: { x: number; y: number; z: number }[] = [];
        if (enableCollisions && wasmReady && wasmEngineRef.current) {
          const cols = wasmEngineRef.current.check_collisions();
          collisionPositions = cols as any;
        }

        if (collisionPositions.length > 0) {
          const newParticles: Particle[] = collisionPositions.map((pos) => {
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(30 * 3);
            for (let i = 0; i < 30; i++) {
              positions[i * 3] = pos.x * SCALE;
              positions[i * 3 + 1] = pos.y * SCALE;
              positions[i * 3 + 2] = pos.z * SCALE;
            }
            geo.setAttribute(
              "position",
              new THREE.BufferAttribute(positions, 3),
            );
            const mat = new THREE.PointsMaterial({ color: 0xffaa00, size: 2 });
            const pts = new THREE.Points(geo, mat);

            const vels: number[] = [];
            for (let i = 0; i < 30; i++) {
              vels.push(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
              );
            }

            return { mesh: pts, vels, life: 1.0 };
          });
          setParticles((prev) => [...prev, ...newParticles]);
        }

        // Sync positions/velocities from WASM back into PhysicsBody objects
        if (now - lastBodySyncTime.current > 500) {
          const states = wasmEngineRef.current.get_bodies();
          for (let i = 0; i < bodies.length; i++) {
            if (states[i]) wasmToPhysicsPos(states[i], bodies[i]);
          }
          lastBodySyncTime.current = now;
        }

        return simulatedDt;
      } catch (e) {
        console.error(e);
        return 0;
      }
    },
    [
      bodies,
      useTDBTime,
      enablePrecession,
      enableNutation,
      physicsCompute,
      setParticles,
      enableTidalEvolution,
      enableAtmosphericDrag,
      enableYarkovsky,
      enableRelativity,
      useEIH,
      wasmReady,
      enableSolarMassLoss,
      enablePRDrag,
      enableCollisions,
      integratorMode,
      adaptiveQuality,
      wisdomHolmanQuality,
      sabaQuality,
      enableGravitationalHarmonics,
      enableSolarRadiationPressure,
      enableCometForces,
      enableYORP,
    ],
  );

  // Force update state when pausing to ensure UI is consistent
  useEffect(() => {
    if (isPaused) {
      setSimTime(simTimeRef.current);
    }
  }, [isPaused]);

  // Expose getVisualState for visual updates
  const getVisualState = useCallback(
    (
      observerPos: THREE.Vector3,
      _visualScale: number,
      _useVisualScale: boolean,
      useLightTimeDelay: boolean,
      enableLightAberration: boolean,
      _focusedBodyIdx: number,
      scaleFactor: number,
    ) => {
      if (!wasmReady || !wasmEngineRef.current) return null;

      try {
        // Convert observer from Three.js Y-up (x,y,z) → ecliptic Z-up (x,-z,y)
        return wasmEngineRef.current.get_visual_state(
          observerPos.x,
          -observerPos.z,
          observerPos.y,
          0,
          0,
          0, // observer velocity (assuming 0 for now)
          scaleFactor,
          useLightTimeDelay,
          enableLightAberration,
        );
      } catch (e) {
        console.error("WASM get_visual_state failed", e);
        return null;
      }
    },
    [wasmReady],
  );

  // Backward compatibility wrappers
  const useAdaptiveTimeStep = integratorMode === "adaptive";
  const setUseAdaptiveTimeStep = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIntegratorMode((prev) => {
        const newVal =
          typeof val === "function" ? val(prev === "adaptive") : val;
        return newVal ? "adaptive" : "standard";
      });
    },
    [],
  );

  const useWisdomHolman = integratorMode === "wisdom-holman";
  const setUseWisdomHolman = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setIntegratorMode((prev) => {
        const newVal =
          typeof val === "function" ? val(prev === "wisdom-holman") : val;
        return newVal ? "wisdom-holman" : "standard";
      });
    },
    [],
  );

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
    sabaQuality,
    setSabaQuality,
    highPrecisionQuality,
    setHighPrecisionQuality,
    useEIH,
    setUseEIH,
    enableSolarMassLoss,
    setEnableSolarMassLoss,
    enableCollisions,
    setEnableCollisions,
    enablePRDrag,
    setEnablePRDrag,
    enableYORP,
    setEnableYORP,
    enableCometForces,
    setEnableCometForces,
    enableGravitationalHarmonics,
    setEnableGravitationalHarmonics,
    enableSolarRadiationPressure,
    setEnableSolarRadiationPressure,
    // Backward compatibility
    useAdaptiveTimeStep,
    setUseAdaptiveTimeStep,
    useWisdomHolman,
    setUseWisdomHolman,
    particles,
    setParticles,
    step,
    syncBodiesToWasm,
    getVisualState,
  };
}
