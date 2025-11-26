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
  radii?: { x: number; y: number; z: number }; // Tri-axial radii for irregular bodies
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
  W0?: number;              // Prime Meridian angle at J2000 (degrees)
  Wdot?: number;            // Rotation rate (degrees/day)
  modelPath?: string;       // Path to GLB/GLTF model
  shape?: 'sphere' | 'model'; // Explicit shape type
  modelScale?: number;      // Scale factor for the model
  ringInnerRadius?: number; // Inner radius of rings (m)
  ringOuterRadius?: number; // Outer radius of rings (m)
  ringTexture?: string;     // Path to ring texture (1D/2D)
  ringOpacity?: number;     // Ring opacity (0.0 - 1.0)
  
  // Higher-order gravity harmonics
  J3?: number;              // Third zonal harmonic
  J4?: number;              // Fourth zonal harmonic
  C22?: number;             // Sectoral harmonic (equatorial ellipticity)
  S22?: number;             // Sectoral harmonic
  
  // Tidal parameters
  k2?: number;              // Tidal Love number
  tidalQ?: number;          // Tidal dissipation factor
  
  // Atmospheric properties
  hasAtmosphere?: boolean;
  surfacePressure?: number; // Pascals
  scaleHeight?: number;     // km
  dragCoefficient?: number; // Cd (typically 2.0-2.2 for spheres)
  
  // Thermal properties (for Yarkovsky effect)
  albedo?: number;          // Bond albedo (0-1)
  thermalInertia?: number;  // J m^-2 s^-0.5 K^-1
  
  // Precession parameters
  precessionRate?: number;  // arcseconds per year
  nutationAmplitude?: number; // arcseconds
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
  
  // Higher-order gravity harmonics
  J3?: number;
  J4?: number;
  C22?: number;
  S22?: number;
  
  // Tidal parameters
  k2?: number;
  tidalQ?: number;
  
  // Atmospheric parameters
  hasAtmosphere?: boolean;
  surfacePressure?: number;
  scaleHeight?: number;
  dragCoefficient?: number;
  
  // Thermal properties
  albedo?: number;
  thermalInertia?: number;
  
  // Time-dependent pole orientation
  poleRA0?: number;        // Initial pole RA at J2000
  poleDec0?: number;       // Initial pole Dec at J2000
  precessionRate?: number; // arcsec/year
  nutationAmplitude?: number;
  
  // Temperature for atmospheric calculations
  meanTemperature?: number; // Kelvin
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
