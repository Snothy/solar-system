import * as THREE from 'three';
import type { PhysicsBody } from '../types';
import { G } from './constants';

/**
 * Compute gravitational forces between all bodies using Newton's law of universal gravitation
 */
/**
 * Compute gravitational forces between all bodies using Newton's law + J2 Perturbations + PPN (GR)
 */
const C_LIGHT = 299792458; // Speed of light in m/s
const SOLAR_LUMINOSITY = 3.828e26; // Watts

// Yoshida 4th Order Coefficients
const w1 = 1.0 / (2.0 - Math.pow(2.0, 1.0 / 3.0));
const w0 = 1.0 - 2.0 * w1;
const c1_y = w1 / 2.0;
const c2_y = (w0 + w1) / 2.0;
const d1_y = w1;
const d2_y = w0;

/**
 * Compute gravitational forces between all bodies using Newton's law + J2 Perturbations + PPN (GR) + SRP
 */
export function computeGravitationalForces(bodies: PhysicsBody[]): void {
  // Reset forces
  bodies.forEach(b => b.force.set(0, 0, 0));

  // Find Sun for SRP
  const sun = bodies.find(b => b.name === "Sun");

  // Calculate pairwise forces
  for (let i = 0; i < bodies.length; i++) {
    const b1 = bodies[i];
    
    // Apply SRP if Sun exists and b1 is not Sun
    if (sun && b1 !== sun) {
      applySolarRadiationPressure(sun, b1);
    }

    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];

      const rVec = new THREE.Vector3().subVectors(b2.pos, b1.pos);
      const dist = rVec.length();
      const distSq = dist * dist;
      const dir = rVec.clone().normalize();

      // 1. Newtonian Gravity
      // F = G * m1 * m2 / r^2
      const fMag = (G * b1.mass * b2.mass) / distSq;
      
      // Apply Newtonian force
      const fNewton = dir.clone().multiplyScalar(-fMag); // Force on b2 towards b1
      b2.force.add(fNewton);
      b1.force.sub(fNewton); // Newton's 3rd law

      // 2. J2 Perturbations (Oblateness)
      if (b1.J2 && b1.poleVector) {
        applyJ2Force(b1, b2, rVec, dist, b1.J2, b1.poleVector);
      }
      if (b2.J2 && b2.poleVector) {
        // For b2 acting on b1, the vector is -rVec
        const rVecRev = rVec.clone().negate();
        applyJ2Force(b2, b1, rVecRev, dist, b2.J2, b2.poleVector);
      }

      // 3. Post-Newtonian (PPN) Corrections (General Relativity)
      // Apply pairwise for all bodies (N-body PPN approximation)
      // We calculate the relativistic acceleration on b1 due to b2, and on b2 due to b1 separately.
      
      const c2 = C_LIGHT * C_LIGHT;
      
      // Force on b1 due to b2 (treating b2 as the source of gravity)
      if (b2.mass > 1e20) { // Optimization: Only apply if source is massive enough (e.g. moons/planets)
        const r = rVec; // Vector from b1 to b2
        const v = new THREE.Vector3().subVectors(b1.vel, b2.vel); // Velocity of b1 relative to b2
        const rMag = dist;
        const mu = G * b2.mass;
        
        const vSq = v.lengthSq();
        const rDotV = r.dot(v);
        
        const term1 = (4 * mu / rMag - vSq);
        const accPPN = r.clone().multiplyScalar(term1)
          .add(v.clone().multiplyScalar(4 * rDotV))
          .multiplyScalar(mu / (c2 * Math.pow(rMag, 3)));
          
        b1.force.add(accPPN.multiplyScalar(b1.mass));
      }

      // Force on b2 due to b1 (treating b1 as the source of gravity)
      if (b1.mass > 1e20) {
        const r = rVec.clone().negate(); // Vector from b2 to b1
        const v = new THREE.Vector3().subVectors(b2.vel, b1.vel); // Velocity of b2 relative to b1
        const rMag = dist;
        const mu = G * b1.mass;
        
        const vSq = v.lengthSq();
        const rDotV = r.dot(v);
        
        const term1 = (4 * mu / rMag - vSq);
        const accPPN = r.clone().multiplyScalar(term1)
          .add(v.clone().multiplyScalar(4 * rDotV))
          .multiplyScalar(mu / (c2 * Math.pow(rMag, 3)));
          
        b2.force.add(accPPN.multiplyScalar(b2.mass));
      }
    }
  }
}

function applySolarRadiationPressure(sun: PhysicsBody, body: PhysicsBody) {
  // F_srp = (L * Cr * A) / (4 * pi * c * r^2)
  // Direction is away from Sun
  
  const rVec = new THREE.Vector3().subVectors(body.pos, sun.pos);
  const dist = rVec.length();
  const dir = rVec.normalize();
  
  // Cr: Coefficient of reflectivity (0 = black body, 1 = perfect reflector, 2 = perfect specular)
  // Earth albedo is ~0.3. Let's assume Cr ~ 1.3 for planets (absorption + reflection)
  const Cr = 1.3; 
  
  // Area: Cross-sectional area
  const area = Math.PI * body.radius * body.radius;
  
  const numerator = SOLAR_LUMINOSITY * Cr * area;
  const denominator = 4 * Math.PI * C_LIGHT * dist * dist;
  
  const fMag = numerator / denominator;
  
  const fSRP = dir.multiplyScalar(fMag);
  body.force.add(fSRP);
  // Sun feels equal and opposite force (negligible but physically accurate)
  sun.force.sub(fSRP);
}

/**
 * Apply J2 perturbation force to a satellite due to a primary body's oblateness.
 */
function applyJ2Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number, J2: number, pole: THREE.Vector3) {
  // Formula from: https://en.wikipedia.org/wiki/Geopotential_model#J2_term
  // F_J2 = - (3 * G * M * m * J2 * R^2) / (2 * r^4) * [ ... ]
  // We need the z-coordinate in the body-fixed frame (projection onto pole)
  
  const z = rVec.dot(pole); // Projection of position onto pole axis
  const r2 = r * r;
  const r4 = r2 * r2;
  const R = primary.radius; // Equatorial radius
  
  const factor = (3 * G * primary.mass * satellite.mass * J2 * (R * R)) / (2 * r4);
  
  // Decompose force into radial and polar components
  // F = factor * [ (5 * (z/r)^2 - 1) * r_hat - 2 * (z/r) * pole_hat ]
  // But simpler vector form:
  // F = factor/r * [ (5 * z^2 / r^2 - 1) * rVec - 2 * z * pole ]
  
  const z2_r2 = (z * z) / r2;
  
  const term1 = rVec.clone().multiplyScalar(5 * z2_r2 - 1);
  const term2 = pole.clone().multiplyScalar(2 * z);
  
  const fJ2 = term1.sub(term2).multiplyScalar(-factor / r); // Note the minus sign from potential gradient
  
  satellite.force.add(fJ2);
  primary.force.sub(fJ2);
}

/**
 * Perform one step of Yoshida 4th Order Symplectic Integration
 * Error is O(dt^5), much better than Verlet's O(dt^3)
 */
export function yoshida4Step(bodies: PhysicsBody[], dt: number): void {
  // Step 1
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c1_y * dt);
  });
  
  computeGravitationalForces(bodies);
  bodies.forEach(b => {
    // Ensure acc is initialized for all bodies before use
    if (!b.acc) b.acc = new THREE.Vector3();
    b.acc.copy(b.force).divideScalar(b.mass);
    b.vel.addScaledVector(b.acc, d1_y * dt);
  });

  // Step 2
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c2_y * dt);
  });

  computeGravitationalForces(bodies);
  bodies.forEach(b => {
    if (!b.acc) b.acc = new THREE.Vector3();
    b.acc.copy(b.force).divideScalar(b.mass);
    b.vel.addScaledVector(b.acc, d2_y * dt);
  });

  // Step 3
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c2_y * dt); // c3 = c2
  });

  computeGravitationalForces(bodies);
  bodies.forEach(b => {
    if (!b.acc) b.acc = new THREE.Vector3();
    b.acc.copy(b.force).divideScalar(b.mass);
    b.vel.addScaledVector(b.acc, d1_y * dt); // d3 = d1
  });

  // Step 4
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c1_y * dt); // c4 = c1
  });
  
  // Note: We don't need a final force calc for velocity here because 
  // the velocity is updated in the "middle" steps (Kick-Drift-Kick-Drift-Kick-Drift-Kick)
  // Yoshida formulation: x(c1) -> v(d1) -> x(c2) -> v(d2) -> x(c3) -> v(d3) -> x(c4)
}

/**
 * Check for collisions between bodies and return collision positions
 */
export function checkCollisions(bodies: PhysicsBody[]): THREE.Vector3[] {
  const collisions: THREE.Vector3[] = [];
  
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const b1 = bodies[i];
      const b2 = bodies[j];
      
      const r1 = b1.radius;
      const r2 = b2.radius;
      const dist = b1.pos.distanceTo(b2.pos);
      
      if (dist < (r1 + r2)) {
        // Collision detected - compute midpoint
        const collisionPos = b1.pos.clone().add(b2.pos).multiplyScalar(0.5);
        collisions.push(collisionPos);
      }
    }
  }
  
  return collisions;
}
