/**
 * Physics Worker - Runs physics simulation on separate thread
 * This prevents the main thread from blocking during heavy calculations
 */

import * as THREE from 'three';
import type { PhysicsBody } from '../types';
import { yoshida4Step, checkCollisions, computeBarycenter } from '../utils/physics';
import { utcToTDB } from '../utils/timeUtils';
import { updatePoleOrientation } from '../utils/precession';
import type {
  WorkerInputMessage,
  WorkerOutputMessage,
  SerializedBody,
  PhysicsConfig
} from './workerTypes';
import { deserializeBody, serializeBody } from './workerTypes';

// Worker state
let bodies: PhysicsBody[] = [];
let config: PhysicsConfig = {
  enableTidal: true,
  enableAtmosphericDrag: true,
  enableYarkovsky: true,
  enablePrecession: true,
  enableNutation: true,
  useTDBTime: true
};
let simTime: number = Date.now();

/**
 * Handle messages from main thread
 */
self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'INIT':
        handleInit(message.bodies, message.config);
        break;
      
      case 'STEP':
        handleStep(message.dt, message.currentTime);
        break;
      
      case 'UPDATE_BODY':
        handleUpdateBody(message.name, message.updates);
        break;
      
      case 'SET_CONFIG':
        handleSetConfig(message.config);
        break;
      
      case 'TERMINATE':
        self.close();
        break;
    }
  } catch (error) {
    const errorMsg: WorkerOutputMessage = {
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error)
    };
    self.postMessage(errorMsg);
  }
};

/**
 * Initialize physics bodies
 */
function handleInit(serializedBodies: SerializedBody[], newConfig: PhysicsConfig) {
  bodies = serializedBodies.map(deserializeBody);
  config = newConfig;
  
  const response: WorkerOutputMessage = { type: 'READY' };
  self.postMessage(response);
}

/**
 * Perform physics step
 */
function handleStep(dt: number, currentTime: number) {
  if (bodies.length === 0) return;
  
  simTime = currentTime;
  
  // Get time in TDB if enabled
  const physicsTime = config.useTDBTime ? utcToTDB(simTime) : simTime;
  
  // Update pole vectors for precession/nutation
  if (config.enablePrecession || config.enableNutation) {
    bodies.forEach(b => {
      if (b.poleRA0 !== undefined && b.poleDec0 !== undefined) {
        b.poleVector = updatePoleOrientation(
          b.poleRA0,
          b.poleDec0,
          b.precessionRate,
          b.nutationAmplitude,
          physicsTime,
          config.enablePrecession,
          config.enableNutation
        );
      }
    });
  }
  
  // Run physics with sub-stepping
  const MAX_SUB_STEP = 600;
  let remainingDt = dt;
  
  while (remainingDt > 0) {
    const step = Math.min(remainingDt, MAX_SUB_STEP);
    yoshida4Step(
      bodies,
      step,
      config.enableTidal,
      config.enableAtmosphericDrag,
      config.enableYarkovsky
    );
    remainingDt -= step;
  }
  
  simTime += dt * 1000;
  
  // Check for collisions
  const collisionPositions = checkCollisions(bodies);
  
  // Barycentric correction
  const barycenter = computeBarycenter(bodies);
  bodies.forEach(b => {
    b.pos.sub(barycenter);
  });
  
  // Send updated state back to main thread
  const response: WorkerOutputMessage = {
    type: 'STATE_UPDATE',
    bodies: bodies.map(serializeBody),
    simTime: simTime,
    collisions: collisionPositions.length > 0 
      ? collisionPositions.map(p => [p.x, p.y, p.z] as [number, number, number])
      : undefined
  };
  
  self.postMessage(response);
}

/**
 * Update a specific body's properties
 */
function handleUpdateBody(name: string, updates: Partial<SerializedBody>) {
  const bodyIndex = bodies.findIndex(b => b.name === name);
  if (bodyIndex === -1) return;
  
  const body = bodies[bodyIndex];
  
  // Apply updates
  if (updates.mass !== undefined) body.mass = updates.mass;
  if (updates.radius !== undefined) body.radius = updates.radius;
  if (updates.pos) body.pos.set(...updates.pos);
  if (updates.vel) body.vel.set(...updates.vel);
  if (updates.J2 !== undefined) body.J2 = updates.J2;
  if (updates.J3 !== undefined) body.J3 = updates.J3;
  if (updates.J4 !== undefined) body.J4 = updates.J4;
  if (updates.C22 !== undefined) body.C22 = updates.C22;
  if (updates.S22 !== undefined) body.S22 = updates.S22;
  if (updates.k2 !== undefined) body.k2 = updates.k2;
  if (updates.tidalQ !== undefined) body.tidalQ = updates.tidalQ;
  if (updates.poleVector) body.poleVector = new THREE.Vector3(...updates.poleVector);
  if (updates.angularVelocity) body.angularVelocity = new THREE.Vector3(...updates.angularVelocity);
  if (updates.momentOfInertia !== undefined) body.momentOfInertia = updates.momentOfInertia;
}

/**
 * Update physics configuration
 */
function handleSetConfig(newConfig: Partial<PhysicsConfig>) {
  config = { ...config, ...newConfig };
}

// Signal that worker is loaded
const readyMsg: WorkerOutputMessage = { type: 'READY' };
self.postMessage(readyMsg);
