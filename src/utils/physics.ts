import * as THREE from 'three';
import type { PhysicsBody } from '../types';
import { G } from './constants';

/**
 * Compute gravitational forces between all bodies using Newton's law of universal gravitation
 */
export function computeGravitationalForces(bodies: PhysicsBody[]): void {
  // Reset forces
  bodies.forEach(b => b.force.set(0, 0, 0));

  // Calculate pairwise forces
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const b1 = bodies[i];
      const b2 = bodies[j];

      const distSq = b1.pos.distanceToSquared(b2.pos);
      
      // Add softening to prevent singularities at very small distances
      const fMag = (G * b1.mass * b2.mass) / (distSq + 1e5);
      
      const dir = new THREE.Vector3().subVectors(b2.pos, b1.pos).normalize();
      
      // Apply equal and opposite forces
      b1.force.addScaledVector(dir, fMag);
      b2.force.addScaledVector(dir, -fMag);
    }
  }
}

/**
 * Perform one step of Velocity Verlet integration
 * This is a symplectic integrator that conserves energy better than Euler
 */
export function velocityVerletStep(bodies: PhysicsBody[], dt: number): void {
  // First half-step of velocity using current acceleration
  bodies.forEach(b => {
    if (!b.acc) b.acc = new THREE.Vector3();
    b.vel.addScaledVector(b.acc, 0.5 * dt);
    b.pos.addScaledVector(b.vel, dt);
  });

  // Recompute forces at new positions
  computeGravitationalForces(bodies);

  // Update accelerations and complete velocity step
  bodies.forEach(b => {
    if (!b.acc) b.acc = new THREE.Vector3();
    b.acc.copy(b.force).divideScalar(b.mass);
    b.vel.addScaledVector(b.acc, 0.5 * dt);
  });
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
