/**
 * Hook to manage worker and GPU physics
 * Provides interface to switch between compute modes
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { PhysicsBody } from '../types';
import type { WorkerInputMessage, WorkerOutputMessage, PhysicsConfig } from '../workers/workerTypes';
import { serializeBodies } from '../workers/workerTypes';
import { GPUPhysics } from '../utils/GPUPhysics';
import type { ComputeMode } from '../utils/PerformanceMonitor';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

export function usePhysicsCompute() {
  const workerRef = useRef<Worker | null>(null);
  const gpuRef = useRef<GPUPhysics | null>(null);
  const performanceRef = useRef(new PerformanceMonitor());
  
  const [computeMode, setComputeMode] = useState<ComputeMode>('auto');
  const [activeMode, setActiveMode] = useState<'main' | 'worker' | 'gpu'>('main');
  const [workerReady, setWorkerReady] = useState(false);
  const [gpuReady, setGPUReady] = useState(false);

  // Initialize worker
  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('../workers/PhysicsWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<WorkerOutputMessage>) => {
        if (event.data.type === 'READY') {
          setWorkerReady(true);
          // Physics Worker initialized
        } else if (event.data.type === 'ERROR') {
          console.error('Worker error:', event.data.error);
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        setWorkerReady(false);
      };

      workerRef.current = worker;

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      console.error('Failed  to create worker:', error);
    }
  }, []);

  // Initialize GPU
  useEffect(() => {
    const initGPU = async () => {
      const gpu = new GPUPhysics();
      const success = await gpu.initialize();
      
      if (success) {
        gpuRef.current = gpu;
        setGPUReady(true);
        // GPU Physics initialized successfully
      } else {
        // GPU Physics unavailable, using CPU fallback
      }
    };

    initGPU();

    return () => {
      gpuRef.current?.destroy();
      gpuRef.current = null;
    };
  }, []);

  /**
   * Initialize worker/GPU with bodies
   */
  const initializeBodies = (bodies: PhysicsBody[], config: PhysicsConfig) => {
    if (workerRef.current && workerReady) {
      const message: WorkerInputMessage = {
        type: 'INIT',
        bodies: serializeBodies(bodies),
        config
      };
      workerRef.current.postMessage(message);
    }
  };

  /**
   * Execute physics step with selected compute mode
   */
  const executeStep = async (
    bodies: PhysicsBody[],
    dt: number,
    currentTime: number,
    _config: PhysicsConfig, // Prefix with _ to indicate intentionally unused
    onComplete: (updatedBodies: PhysicsBody[], collisions?: THREE.Vector3[]) => void
  ) => {
    performanceRef.current.startPhysics();

    // Determine actual mode to use
    let modeToUse: 'main' | 'worker' | 'gpu' = 'main';
    
    if (computeMode === 'auto') {
      const recommended = performanceRef.current.recommendMode(
        workerReady,
        gpuReady,
        bodies.length
      );
      
      if (recommended === 'gpu' && gpuReady) modeToUse = 'gpu';
      else if (recommended === 'worker' && workerReady) modeToUse = 'worker';
      else modeToUse = 'main';
    } else if (computeMode === 'worker' && workerReady) {
      modeToUse = 'worker';
    } else if (computeMode === 'gpu' && gpuReady) {
      modeToUse = 'gpu';
    }

    setActiveMode(modeToUse);
    performanceRef.current.setMode(modeToUse);

    // Execute based on mode
    if (modeToUse === 'worker' && workerRef.current) {
      // Use worker
      const handleMessage = (event: MessageEvent<WorkerOutputMessage>) => {
        if (event.data.type === 'STATE_UPDATE') {
          // Bodies are updated in the main thread from the serialized data
          // This is handled in useSimulation
          performanceRef.current.endPhysics();
          workerRef.current?.removeEventListener('message', handleMessage);
        }
      };
      
      workerRef.current.addEventListener('message', handleMessage);
      
      const message: WorkerInputMessage = {
        type: 'STEP',
        dt,
        currentTime
      };
      workerRef.current.postMessage(message);
      
    } else if (modeToUse === 'gpu' && gpuRef.current) {
      // Use GPU
      try {
        await gpuRef.current.computeForces(bodies);
        performanceRef.current.endPhysics();
        onComplete(bodies);
      } catch (error) {
        console.error('GPU computation failed, falling back to main thread:', error);
        performanceRef.current.endPhysics();
        onComplete(bodies);
      }
      
    } else {
      // Use main thread (handled by caller)
      performanceRef.current.endPhysics();
      onComplete(bodies);
    }
  };

  /**
   * Update physics configuration
   */
  const updateConfig = (config: Partial<PhysicsConfig>) => {
    if (workerRef.current && workerReady) {
      const message: WorkerInputMessage = {
        type: 'SET_CONFIG',
        config
      };
      workerRef.current.postMessage(message);
    }
  };

  /**
   * Get performance metrics
   */
  const getPerformanceMetrics = () => {
    return performanceRef.current.getMetrics();
  };

  return {
    computeMode,
    setComputeMode,
    activeMode,
    workerReady,
    gpuReady,
    initializeBodies,
    executeStep,
    updateConfig,
    getPerformanceMetrics,
    performanceMonitor: performanceRef.current
  };
}
