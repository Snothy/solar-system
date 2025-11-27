import type { PhysicsBody } from '../types';
import * as THREE from 'three';

/**
 * Serialized body state for efficient transfer between threads
 * Uses TypedArrays for zero-copy transfer
 */
export interface SerializedBody {
  name: string;
  mass: number;
  radius: number;
  
  // Position and velocity as arrays for efficient transfer
  pos: [number, number, number];
  vel: [number, number, number];
  force: [number, number, number];
  
  // Physics parameters
  J2?: number;
  J3?: number;
  J4?: number;
  C22?: number;
  S22?: number;
  k2?: number;
  tidalQ?: number;
  
  // Atmosphere
  hasAtmosphere?: boolean;
  surfacePressure?: number;
  scaleHeight?: number;
  dragCoefficient?: number;
  meanTemperature?: number;
  
  // Small body effects
  albedo?: number;
  thermalInertia?: number;
  
  // Rotation
  poleVector?: [number, number, number];
  poleRA0?: number;
  poleDec0?: number;
  precessionRate?: number;
  nutationAmplitude?: number;
  angularVelocity?: [number, number, number];
  momentOfInertia?: number;
  torque?: [number, number, number];
  
  parentName?: string;
}

/**
 * Physics configuration sent to worker
 */
export interface PhysicsConfig {
  enableTidal: boolean;
  enableAtmosphericDrag: boolean;
  enableYarkovsky: boolean;
  enablePrecession: boolean;
  enableNutation: boolean;
  useTDBTime: boolean;
}

/**
 * Messages from main thread to worker
 */
export type WorkerInputMessage =
  | { type: 'INIT'; bodies: SerializedBody[]; config: PhysicsConfig }
  | { type: 'STEP'; dt: number; currentTime: number }
  | { type: 'UPDATE_BODY'; name: string; updates: Partial<SerializedBody> }
  | { type: 'SET_CONFIG'; config: Partial<PhysicsConfig> }
  | { type: 'TERMINATE' };

/**
 * Messages from worker to main thread
 */
export type WorkerOutputMessage =
  | { type: 'READY' }
  | { 
      type: 'STATE_UPDATE'; 
      bodies: SerializedBody[]; 
      simTime: number;
      collisions?: Array<[number, number, number]>;
    }
  | { type: 'ERROR'; error: string };

/**
 * Serialize PhysicsBody for transfer to worker
 */
export function serializeBody(body: PhysicsBody): SerializedBody {
  return {
    name: body.name,
    mass: body.mass,
    radius: body.radius,
    pos: [body.pos.x, body.pos.y, body.pos.z],
    vel: [body.vel.x, body.vel.y, body.vel.z],
    force: [body.force.x, body.force.y, body.force.z],
    J2: body.J2,
    J3: body.J3,
    J4: body.J4,
    C22: body.C22,
    S22: body.S22,
    k2: body.k2,
    tidalQ: body.tidalQ,
    hasAtmosphere: body.hasAtmosphere,
    surfacePressure: body.surfacePressure,
    scaleHeight: body.scaleHeight,
    dragCoefficient: body.dragCoefficient,
    meanTemperature: body.meanTemperature,
    albedo: body.albedo,
    thermalInertia: body.thermalInertia,
    poleVector: body.poleVector ? [body.poleVector.x, body.poleVector.y, body.poleVector.z] : undefined,
    poleRA0: body.poleRA0,
    poleDec0: body.poleDec0,
    precessionRate: body.precessionRate,
    nutationAmplitude: body.nutationAmplitude,
    angularVelocity: body.angularVelocity ? [body.angularVelocity.x, body.angularVelocity.y, body.angularVelocity.z] : undefined,
    momentOfInertia: body.momentOfInertia,
    torque: body.torque ? [body.torque.x, body.torque.y, body.torque.z] : undefined,
    parentName: body.parentName
  };
}

/**
 * Deserialize SerializedBody back to PhysicsBody
 */
export function deserializeBody(serialized: SerializedBody): PhysicsBody {
  return {
    name: serialized.name,
    mass: serialized.mass,
    radius: serialized.radius,
    pos: new THREE.Vector3(...serialized.pos),
    vel: new THREE.Vector3(...serialized.vel),
    force: new THREE.Vector3(...serialized.force),
    J2: serialized.J2,
    J3: serialized.J3,
    J4: serialized.J4,
    C22: serialized.C22,
    S22: serialized.S22,
    k2: serialized.k2,
    tidalQ: serialized.tidalQ,
    hasAtmosphere: serialized.hasAtmosphere,
    surfacePressure: serialized.surfacePressure,
    scaleHeight: serialized.scaleHeight,
    dragCoefficient: serialized.dragCoefficient,
    meanTemperature: serialized.meanTemperature,
    albedo: serialized.albedo,
    thermalInertia: serialized.thermalInertia,
    poleVector: serialized.poleVector ? new THREE.Vector3(...serialized.poleVector) : undefined,
    poleRA0: serialized.poleRA0,
    poleDec0: serialized.poleDec0,
    precessionRate: serialized.precessionRate,
    nutationAmplitude: serialized.nutationAmplitude,
    angularVelocity: serialized.angularVelocity ? new THREE.Vector3(...serialized.angularVelocity) : undefined,
    momentOfInertia: serialized.momentOfInertia,
    torque: serialized.torque ? new THREE.Vector3(...serialized.torque) : undefined,
    parentName: serialized.parentName
  };
}

/**
 * Batch serialize bodies with efficient TypedArray transfer
 */
export function serializeBodies(bodies: PhysicsBody[]): SerializedBody[] {
  return bodies.map(serializeBody);
}

/**
 * Batch deserialize bodies
 */
export function deserializeBodies(serialized: SerializedBody[]): PhysicsBody[] {
  return serialized.map(deserializeBody);
}
