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
  
  // Other
  albedo?: number;
  thermalInertia?: number;
  precessionRate?: number;
  nutationAmplitude?: number;
}
