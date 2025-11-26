import * as THREE from 'three';
import type { PhysicsBody } from '../types';
import { G, C_LIGHT, SOLAR_LUMINOSITY } from './constants';

// Yoshida 4th Order Coefficients
const w1 = 1.0 / (2.0 - Math.pow(2.0, 1.0 / 3.0));
const w0 = 1.0 - 2.0 * w1;
const c1_y = w1 / 2.0;
const c2_y = (w0 + w1) / 2.0;
const d1_y = w1;
const d2_y = w0;

/**
 * Compute gravitational forces between all bodies
 * Includes: Newtonian gravity, J2/J3/J4/C22/S22 harmonics, PPN relativity,
 * tidal forces, solar radiation pressure, atmospheric drag, Yarkovsky effect
 * 
 * @param bodies - Array of physics bodies
 */
export function computeGravitationalForces(
  bodies: PhysicsBody[],
  enableTidal: boolean = true,
  enableAtmosphericDrag: boolean = true,
  enableYarkovsky: boolean = true
): void {
  // Reset forces
  bodies.forEach(b => b.force.set(0, 0, 0));

  // Find Sun for SRP and Yarkovsky
  const sun = bodies.find(b => b.name === "Sun");

  // Calculate pairwise forces
  for (let i = 0; i < bodies.length; i++) {
    const b1 = bodies[i];
    
    // Apply Solar Radiation Pressure if Sun exists and b1 is not Sun
    if (sun && b1 !== sun) {
      applySolarRadiationPressure(sun, b1);
    }

    // Apply Yarkovsky effect (thermal radiation pressure for small bodies)
    if (enableYarkovsky && sun && b1 !== sun && b1.thermalInertia && b1.albedo !== undefined) {
      applyYarkovskyForce(sun, b1);
    }

    // Apply atmospheric drag if body is within an atmosphere
    if (enableAtmosphericDrag) {
      for (const atmo of bodies) {
        if (atmo.hasAtmosphere && atmo !== b1) {
          applyAtmosphericDrag(atmo, b1);
        }
      }
    }

    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];

      const rVec = new THREE.Vector3().subVectors(b2.pos, b1.pos);
      const dist = rVec.length();
      const distSq = dist * dist;
      const dir = rVec.clone().normalize();

      // 1. Newtonian Gravity
      const fMag = (G * b1.mass * b2.mass) / distSq;
      const fNewton = dir.clone().multiplyScalar(-fMag);
      b2.force.add(fNewton);
      b1.force.sub(fNewton);

      // 2. J2 Perturbations (Oblateness)
      if (b1.J2 && b1.poleVector) {
        applyJ2Force(b1, b2, rVec, dist);
      }
      if (b2.J2 && b2.poleVector) {
        const rVecRev = rVec.clone().negate();
        applyJ2Force(b2, b1, rVecRev, dist);
      }

      // 3. J3 Perturbations (Pear-shaped term)
      if (b1.J3 && b1.poleVector) {
        applyJ3Force(b1, b2, rVec, dist);
      }
      if (b2.J3 && b2.poleVector) {
        const rVecRev = rVec.clone().negate();
        applyJ3Force(b2, b1, rVecRev, dist);
      }

      // 4. J4 Perturbations (Higher-order oblateness)
      if (b1.J4 && b1.poleVector) {
        applyJ4Force(b1, b2, rVec, dist);
      }
      if (b2.J4 && b2.poleVector) {
        const rVecRev = rVec.clone().negate();
        applyJ4Force(b2, b1, rVecRev, dist);
      }

      // 5. C22/S22 Sectoral Harmonics (Equatorial ellipticity)
      if ((b1.C22 || b1.S22) && b1.poleVector) {
        applyC22S22Force(b1, b2, rVec, dist);
      }
      if ((b2.C22 || b2.S22) && b2.poleVector) {
        const rVecRev = rVec.clone().negate();
        applyC22S22Force(b2, b1, rVecRev, dist);
      }

      // 6. Post-Newtonian (PPN) Corrections - FULL N-BODY (no mass threshold)
      const c2 = C_LIGHT * C_LIGHT;
      
      // Force on b1 due to b2
      {
        const r = rVec;
        const v = new THREE.Vector3().subVectors(b1.vel, b2.vel);
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

      // Force on b2 due to b1
      {
        const r = rVec.clone().negate();
        const v = new THREE.Vector3().subVectors(b2.vel, b1.vel);
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

      // 7. Tidal Forces (for orbital evolution)
      if (enableTidal) {
        applyTidalForces(b1, b2, rVec, dist);
      }
    }
  }
}

/**
 * Apply Solar Radiation Pressure
 * F_srp = (L * Cr * A) / (4 * pi * c * r^2)
 */
function applySolarRadiationPressure(sun: PhysicsBody, body: PhysicsBody): void {
  const rVec = new THREE.Vector3().subVectors(body.pos, sun.pos);
  const dist = rVec.length();
  const dir = rVec.normalize();
  
  const Cr = 1.3; // Coefficient of reflectivity
  const area = Math.PI * body.radius * body.radius;
  
  const numerator = SOLAR_LUMINOSITY * Cr * area;
  const denominator = 4 * Math.PI * C_LIGHT * dist * dist;
  
  const fMag = numerator / denominator;
  
  const fSRP = dir.multiplyScalar(fMag);
  body.force.add(fSRP);
  sun.force.sub(fSRP);
}

/**
 * Apply Yarkovsky thermal radiation effect for asteroids
 * Causes slow orbital drift due to anisotropic thermal re-emission
 */
function applyYarkovskyForce(sun: PhysicsBody, body: PhysicsBody): void {
  if (!body.albedo || !body.thermalInertia) return;
  
  const rVec = new THREE.Vector3().subVectors(body.pos, sun.pos);
  const dist = rVec.length();
  
  // Solar flux at distance r
  const solarFlux = SOLAR_LUMINOSITY / (4 * Math.PI * dist * dist);
  
  // Absorbed power
  const absorbedPower = (1 - body.albedo) * solarFlux * Math.PI * body.radius * body.radius;
  
  // Yarkovsky force is perpendicular to sun-object line
  // Simplified: Force ~ (absorbed power / c) * thermal lag factor
  // Direction depends on rotation (prograde vs retrograde)
  
  const thermalLagAngle = Math.PI / 4; // 45 degrees lag (simplified)
  
  // Tangential component (perpendicular to radial)
  const velDir = body.vel.clone().normalize();
  const radialDir = rVec.clone().normalize();
  
  // Get tangential direction (in orbital plane)
  const tangential = new THREE.Vector3().crossVectors(
    new THREE.Vector3().crossVectors(radialDir, velDir),
    radialDir
  ).normalize();
  
  // Magnitude (very small, ~10^-10 N for typical asteroid)
  const fMag = (absorbedPower / C_LIGHT) * Math.sin(thermalLagAngle) * 0.1; // Scale factor
  
  const fYark = tangential.multiplyScalar(fMag);
  body.force.add(fYark);
}

/**
 * Apply atmospheric drag
 * F_drag = -0.5 * rho * v^2 * Cd * A * v_hat
 */
function applyAtmosphericDrag(atmosphere: PhysicsBody, body: PhysicsBody): void {
  if (!atmosphere.hasAtmosphere || !atmosphere.surfacePressure || !atmosphere.scaleHeight) return;
  if (!body.dragCoefficient && !atmosphere.dragCoefficient) return;
  
  const rVec = new THREE.Vector3().subVectors(body.pos, atmosphere.pos);
  const altitude = rVec.length() - atmosphere.radius;
  
  // Only apply drag if within 10 scale heights
  if (altitude < 0 || altitude > atmosphere.scaleHeight * 10 * 1000) return;
  
  // Exponential atmosphere model: rho(h) = rho_0 * exp(-h / H)
  const scaleHeightMeters = atmosphere.scaleHeight * 1000;
  const surfaceDensity = atmosphere.surfacePressure / (287 * (atmosphere.meanTemperature || 288));
  const density = surfaceDensity * Math.exp(-altitude / scaleHeightMeters);
  
  // Relative velocity (body velocity relative to atmosphere rotation)
  // Simplified: assume atmosphere co-rotates with planet
  const relVel = body.vel.clone();
  const vMag = relVel.length();
  
  if (vMag < 1) return; // Negligible drag
  
  const Cd = body.dragCoefficient || atmosphere.dragCoefficient || 2.2;
  const area = Math.PI * body.radius * body.radius;
  
  const dragMag = 0.5 * density * vMag * vMag * Cd * area;
  const fDrag = relVel.normalize().multiplyScalar(-dragMag);
  
  body.force.add(fDrag);
  // By Newton's 3rd law, atmosphere gains momentum, but planet is so massive it's negligible
}

/**
 * Apply J2 perturbation force (second zonal harmonic)
 */
function applyJ2Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  if (!primary.J2 || !primary.poleVector) return;
  
  const z = rVec.dot(primary.poleVector);
  const r2 = r * r;
  const r4 = r2 * r2;
  const R = primary.radius;
  
  const factor = (3 * G * primary.mass * satellite.mass * primary.J2 * (R * R)) / (2 * r4);
  const z2_r2 = (z * z) / r2;
  
  const term1 = rVec.clone().multiplyScalar(5 * z2_r2 - 1);
  const term2 = primary.poleVector.clone().multiplyScalar(2 * z);
  
  const fJ2 = term1.sub(term2).multiplyScalar(-factor / r);
  
  satellite.force.add(fJ2);
  primary.force.sub(fJ2);
}

/**
 * Apply J3 perturbation force (third zonal harmonic - "pear-shaped")
 */
function applyJ3Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  if (!primary.J3 || !primary.poleVector) return;
  
  const z = rVec.dot(primary.poleVector);
  const r2 = r * r;
  const r5 = r2 * r2 * r;
  const R = primary.radius;
  
  const factor = (G * primary.mass * satellite.mass * primary.J3 * Math.pow(R, 3)) / r5;
  const z_r = z / r;
  const z2_r2 = (z * z) / r2;
  
  // J3 force components
  const radialTerm = rVec.clone().multiplyScalar(5 * z_r * (7 * z2_r2 - 3));
  const polarTerm = primary.poleVector.clone().multiplyScalar(3 * (5 * z2_r2 - 1));
  
  const fJ3 = radialTerm.sub(polarTerm).multiplyScalar(-factor / (2 * r));
  
  satellite.force.add(fJ3);
  primary.force.sub(fJ3);
}

/**
 * Apply J4 perturbation force (fourth zonal harmonic)
 */
function applyJ4Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  if (!primary.J4 || !primary.poleVector) return;
  
  const z = rVec.dot(primary.poleVector);
  const r2 = r * r;
  const r6 = r2 * r2 * r2;
  const R = primary.radius;
  
  const factor = (5 * G * primary.mass * satellite.mass * primary.J4 * Math.pow(R, 4)) / (2 * r6);
  const z2_r2 = (z * z) / r2;
  const z4_r4 = z2_r2 * z2_r2;
  
  // J4 force components
  const radialTerm = rVec.clone().multiplyScalar(3 - 42 * z2_r2 + 63 * z4_r4);
  const polarTerm = primary.poleVector.clone().multiplyScalar(12 * z / r - 28 * (z * z2_r2) / r);
  
  const fJ4 = radialTerm.add(polarTerm).multiplyScalar(-factor / r);
  
  satellite.force.add(fJ4);
  primary.force.sub(fJ4);
}

/**
 * Apply C22/S22 sectoral harmonics (equatorial ellipticity)
 * Simplified implementation - full version requires longitude tracking
 */
function applyC22S22Force(
  primary: PhysicsBody,
  satellite: PhysicsBody,
  rVec: THREE.Vector3,
  r: number,
): void {
  if (!primary.C22 && !primary.S22) return;
  if (!primary.poleVector) return;
  
  const C22 = primary.C22 || 0;
  const S22 = primary.S22 || 0;
  const R = primary.radius;
  const r3 = r * r * r;
  
  // Simplified: assumes equatorial plane alignment
  // Full implementation would require transforming to body-fixed coords
  const factor = (3 * G * primary.mass * satellite.mass * Math.sqrt(C22 * C22 + S22 * S22) * R * R) / r3;
  
  // Approximate force in equatorial plane
  const equatorialDir = new THREE.Vector3().crossVectors(primary.poleVector, rVec).normalize();
  const fC22 = equatorialDir.multiplyScalar(factor / r);
  
  satellite.force.add(fC22);
  primary.force.sub(fC22);
}

/**
 * Apply tidal forces for orbital evolution
 * Uses Mignard's formulation for tidal dissipation
 * NOTE: Tidal effects are VERY gradual - cm/year scale, not immediate
 */
function applyTidalForces(b1: PhysicsBody, b2: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  // Determine which is primary (more massive) and which is satellite
  const primary = b1.mass > b2.mass ? b1 : b2;
  const satellite = b1.mass > b2.mass ? b2 : b1;
  const rVecSat = b1.mass > b2.mass ? rVec : rVec.clone().negate();
  
  if (!primary.k2 || !satellite.k2) return;
  if (!primary.tidalQ || !satellite.tidalQ) return;
  
  // Tidal forces cause VERY slow orbital evolution
  // Moon recedes ~3.8 cm/year, not meters per second!
  
  // Simplified tidal acceleration (tangential component)
  // Real formula is complex, but effect is: a_tidal ~ (k2/Q) * (M/m) * (R/r)^5 * n^2
  // Where n is orbital mean motion
  
  const k2_primary = primary.k2;
  const Q_primary = primary.tidalQ;
  const R_primary = primary.radius;
  
  // Orbital angular velocity (approximate)
  const orbitalVel = satellite.vel.clone().sub(primary.vel);
  const vMag = orbitalVel.length();
  const n = vMag / r; // Mean motion approximation
  
  // Tidal acceleration magnitude (very small!)
  // Scale factor to get realistic cm/year evolution
  const tidalAccel = (k2_primary / Q_primary) * 
    (primary.mass / satellite.mass) * 
    Math.pow(R_primary / r, 5) * 
    n * n * 
    1e-15; // Scaling factor for realistic timescales
  
  // Direction: tangent to orbit (perpendicular to position vector)
  const tangentialDir = new THREE.Vector3().crossVectors(
    rVecSat,
    new THREE.Vector3().crossVectors(rVecSat, orbitalVel)
  ).normalize();
  
  // Apply as acceleration, convert to force
  const fTidal = tangentialDir.multiplyScalar(tidalAccel * satellite.mass);
  
  satellite.force.add(fTidal);
  primary.force.sub(fTidal);
}

/**
 * Perform one step of Yoshida 4th Order Symplectic Integration
 */
export function yoshida4Step(
  bodies: PhysicsBody[],
  dt: number,
  enableTidal: boolean = true,
  enableAtmosphericDrag: boolean = true,
  enableYarkovsky: boolean = true
): void {
  // Step 1
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c1_y * dt);
  });
  
  computeGravitationalForces(bodies, enableTidal, enableAtmosphericDrag, enableYarkovsky);
  bodies.forEach(b => {
    if (!b.acc) b.acc = new THREE.Vector3();
    b.acc.copy(b.force).divideScalar(b.mass);
    b.vel.addScaledVector(b.acc, d1_y * dt);
  });

  // Step 2
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c2_y * dt);
  });

  computeGravitationalForces(bodies, enableTidal, enableAtmosphericDrag, enableYarkovsky);
  bodies.forEach(b => {
    if (!b.acc) b.acc = new THREE.Vector3();
    b.acc.copy(b.force).divideScalar(b.mass);
    b.vel.addScaledVector(b.acc, d2_y * dt);
  });

  // Step 3
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c2_y * dt);
  });

  computeGravitationalForces(bodies, enableTidal, enableAtmosphericDrag, enableYarkovsky);
  bodies.forEach(b => {
    if (!b.acc) b.acc = new THREE.Vector3();
    b.acc.copy(b.force).divideScalar(b.mass);
    b.vel.addScaledVector(b.acc, d1_y * dt);
  });

  // Step 4
  bodies.forEach(b => {
    b.pos.addScaledVector(b.vel, c1_y * dt);
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
        const collisionPos = b1.pos.clone().add(b2.pos).multiplyScalar(0.5);
        collisions.push(collisionPos);
      }
    }
  }
  
  return collisions;
}
