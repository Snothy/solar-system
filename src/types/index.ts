import * as THREE from 'three';

export interface OrbitalElements {
  a: number;  // Semi-major axis (AU)
  e: number;  // Eccentricity
  i: number;  // Inclination (degrees)
  O: number;  // Longitude of ascending node (degrees)
  w: number;  // Argument of periapsis (degrees)
  M: number;  // Mean anomaly at epoch (degrees)
  n: number;  // Mean motion (degrees/day)
}

export interface CelestialBodyData {
  name: string;
  mass?: number;
  radius?: number;
  color: number;
  emissive?: number; // For stars
  texture?: string;
  ringColor?: number;
  hasRings?: boolean;
  type?: 'star' | 'planet' | 'moon';
  elements?: OrbitalElements | null;
  parent?: string;
  rel_a?: number;           // Relative semi-major axis (m) for moons
  rel_v?: number;           // Relative orbital velocity (m/s) for moons
  rotationPeriod?: number;  // Hours
  axialTilt?: number;       // Degrees
  meanTemperature?: number; // Kelvin
  surfaceGravity?: number;  // m/s^2
  jplId?: string;
}

export interface PhysicsBody {
  name: string;
  mass: number;
  radius: number;
  pos: THREE.Vector3;     // Position in meters
  vel: THREE.Vector3;     // Velocity in m/s
  force: THREE.Vector3;   // Force in Newtons
  acc?: THREE.Vector3;    // Acceleration in m/s^2
  parentName?: string;    // For moons
}

export interface VisualBody {
  body: PhysicsBody;
  mesh: THREE.Mesh;
  trail: THREE.Line;
  trailIdx: number;
  trailCount: number;
  baseRadius: number;     // Base radius in scene units
  type?: string;
  rotationSpeed: number;  // Radians per simulation second
}

export interface Particle {
  mesh: THREE.Points;
  vels: number[];
  life: number;
}

export interface SimulationState {
  bodies: PhysicsBody[];
  visualBodies: VisualBody[];
  particles: Particle[];
  simTime: number;
  timeStep: number;
  isPaused: boolean;
  visualScale: number;
  useVisualScale: boolean;
  selectedObject: PhysicsBody | null;
  focusedObject: PhysicsBody | null;
  updateBody: (name: string, updates: Partial<PhysicsBody>) => void;
  isLoading: boolean;
}
