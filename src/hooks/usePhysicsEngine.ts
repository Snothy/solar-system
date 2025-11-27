import { useState, useCallback } from 'react';
import * as THREE from 'three';
import type { PhysicsBody, Particle } from '../types';
import { yoshida4Step, rkf45Step, checkCollisions } from '../utils/physics';
import { utcToTDB } from '../utils/timeUtils';
import { updatePoleOrientation } from '../utils/precession';
import { SCALE } from '../utils/constants';

// Define the interface for the hook's return value
export interface PhysicsEngine {
  simTime: number;
  setSimTime: React.Dispatch<React.SetStateAction<number>>;
  timeStep: number;
  setTimeStep: React.Dispatch<React.SetStateAction<number>>;
  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Options
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
  useAdaptiveTimeStep: boolean;
  setUseAdaptiveTimeStep: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Methods
  step: (dt: number) => void;
}

export function usePhysicsEngine(
  bodies: PhysicsBody[],
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>,
  physicsCompute: any // Type this properly if possible, or leave as any for now
): PhysicsEngine {
  const [simTime, setSimTime] = useState(new Date().getTime()); // Will be overwritten by init
  const [timeStep, setTimeStep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  
  // Advanced physics toggles
  const [enableTidalEvolution, setEnableTidalEvolution] = useState(true);
  const [enableAtmosphericDrag, setEnableAtmosphericDrag] = useState(true);
  const [enableYarkovsky, setEnableYarkovsky] = useState(true);
  const [enablePrecession, setEnablePrecession] = useState(true);
  const [enableNutation, setEnableNutation] = useState(true);
  const [useTDBTime, setUseTDBTime] = useState(true);
  const [enableRelativity, setEnableRelativity] = useState(true);
  const [useAdaptiveTimeStep, setUseAdaptiveTimeStep] = useState(false);

  // Helper: Run physics on main thread with sub-stepping
  const runMainThreadPhysics = useCallback((dt: number) => {
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
  }, [bodies, physicsCompute, useAdaptiveTimeStep, enableTidalEvolution, enableAtmosphericDrag, enableYarkovsky, enableRelativity]);

  const step = useCallback((dt: number) => {
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

    physicsCompute.performanceMonitor.endFrame();
  }, [bodies, simTime, useTDBTime, enablePrecession, enableNutation, runMainThreadPhysics, physicsCompute, setParticles]);

  return {
    simTime,
    setSimTime,
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
    step
  };
}
