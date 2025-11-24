import * as THREE from 'three';
import type { OrbitalElements } from '../types';
import { AU, G } from './constants';

/**
 * Convert Keplerian orbital elements to Cartesian state vectors (position and velocity)
 */
export function getKeplerianStateVector(
  el: OrbitalElements,
  days: number
): { pos: THREE.Vector3; vel: THREE.Vector3 } {
  const a = el.a * AU;  // Semi-major axis in meters
  const e = el.e;       // Eccentricity
  
  // Calculate mean anomaly at current time
  let M = (el.M + el.n * days) % 360;
  let M_rad = M * (Math.PI / 180);
  
  // Solve Kepler's equation for eccentric anomaly using Newton-Raphson
  let E = M_rad;
  for (let i = 0; i < 10; i++) {
    E = E - (E - e * Math.sin(E) - M_rad) / (1 - e * Math.cos(E));
  }
  
  // Calculate true anomaly
  const v_anom = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
  
  // Orbital radius
  const r = a * (1 - e * Math.cos(E));
  
  // Position in orbital plane
  const x_orb = r * Math.cos(v_anom);
  const y_orb = r * Math.sin(v_anom);
  
  // Velocity in orbital plane
  const mu = G * 1.989e30;  // Standard gravitational parameter for Sun
  const p = a * (1 - e * e);
  const h = Math.sqrt(mu * p);
  
  const vx_orb = (mu / h) * -Math.sin(v_anom);
  const vy_orb = (mu / h) * (e + Math.cos(v_anom));
  
  // Convert angles to radians
  const O = el.O * (Math.PI / 180);  // Longitude of ascending node
  const w = el.w * (Math.PI / 180);  // Argument of periapsis
  const i = el.i * (Math.PI / 180);  // Inclination
  
  // Apply rotations to convert from orbital plane to ecliptic coordinates
  const posOrb = new THREE.Vector3(x_orb, y_orb, 0);
  const velOrb = new THREE.Vector3(vx_orb, vy_orb, 0);
  
  // Rotation sequence: w (around z), i (around x), O (around z)
  posOrb.applyAxisAngle(new THREE.Vector3(0, 0, 1), w);
  posOrb.applyAxisAngle(new THREE.Vector3(1, 0, 0), i);
  posOrb.applyAxisAngle(new THREE.Vector3(0, 0, 1), O);
  
  velOrb.applyAxisAngle(new THREE.Vector3(0, 0, 1), w);
  velOrb.applyAxisAngle(new THREE.Vector3(1, 0, 0), i);
  velOrb.applyAxisAngle(new THREE.Vector3(0, 0, 1), O);
  
  // Convert to Three.js coordinate system (Y up instead of Z up)
  return {
    pos: new THREE.Vector3(posOrb.x, posOrb.z, -posOrb.y),
    vel: new THREE.Vector3(velOrb.x, velOrb.z, -velOrb.y)
  };
}
