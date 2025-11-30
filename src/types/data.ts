import * as THREE from 'three';

export interface SolarSystemData {
  name: string;
  mass: number;
  radius: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  parent?: string;
  color: number;
  texture?: string;
  type?: string;
  
  // Rotational properties
  rotationPeriod?: number; // hours
  poleRA?: number;
  poleDec?: number;
  
  // Advanced Physics Properties
  J?: number[];
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
  
  // Other
  albedo?: number;
  thermalInertia?: number;
  precessionRate?: number;
  nutationAmplitude?: number;

  // Orbital Elements (J2000)
  rel_a?: number;           // Semi-major axis (m)
  rel_e?: number;           // Eccentricity
  rel_i?: number;           // Inclination (deg)
  rel_node?: number;        // Longitude of Ascending Node (deg)
  rel_peri?: number;        // Argument of Periapsis (deg)
  rel_M?: number;           // Mean Anomaly (deg)
}
