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
  type?: 'star' | 'planet' | 'moon' | 'dwarf planet' | 'asteroid' | 'comet';
  elements?: OrbitalElements | null;
  parent?: string;
  rel_a?: number;           // Relative semi-major axis (m) for moons
  rel_v?: number;           // Relative orbital velocity (m/s) for moons
  rotationPeriod?: number;  // Hours
  axialTilt?: number;       // Degrees
  meanTemperature?: number; // Kelvin
  surfaceGravity?: number;  // m/s^2
  jplId?: string;
  J2?: number;              // J2 spherical harmonic coefficient
  poleRA?: number;          // Right Ascension of North Pole (degrees)
  poleDec?: number;         // Declination of North Pole (degrees)
  modelPath?: string;       // Path to GLB/GLTF model
  shape?: 'sphere' | 'model'; // Explicit shape type
  modelScale?: number;      // Scale factor for the model
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
  J2?: number;            // J2 coefficient
  poleVector?: THREE.Vector3; // North pole direction vector
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
  textureUrl?: string;    // Custom or default texture URL
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
  orbitVisibility: Record<string, boolean>;
  toggleOrbitVisibility: (name: string, includeChildren?: boolean) => void;
  setAllOrbitVisibility: (visible: boolean) => void;
  isLoading: boolean;
}
