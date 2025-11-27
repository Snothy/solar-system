import * as THREE from 'three';
import type { PhysicsBody } from '../types';
import { G, C_LIGHT, SOLAR_LUMINOSITY } from './constants';

// Reusable vectors to avoid GC
const _rVec = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _fNewton = new THREE.Vector3();
const _v = new THREE.Vector3();
const _accPPN = new THREE.Vector3();
const _term1Vec = new THREE.Vector3();
const _term2Vec = new THREE.Vector3();
const _equatorialDir = new THREE.Vector3();
const _orbitalVel = new THREE.Vector3();
const _tangentialDir = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _orbitalAngVel = new THREE.Vector3();
const _torque = new THREE.Vector3();
const _relVel = new THREE.Vector3();
const _cross1 = new THREE.Vector3();

// Yoshida 4th Order Coefficients
const w1 = 1.0 / (2.0 - Math.pow(2.0, 1.0 / 3.0));
const w0 = 1.0 - 2.0 * w1;
const c1_y = w1 / 2.0;
const c2_y = (w0 + w1) / 2.0;
const d1_y = w1;
const d2_y = w0;

/**
 * Compute gravitational forces between all bodies
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
    
    if (sun && b1 !== sun) {
      applySolarRadiationPressure(sun, b1);
    }

    if (enableYarkovsky && sun && b1 !== sun && b1.thermalInertia && b1.albedo !== undefined) {
      applyYarkovskyForce(sun, b1);
    }

    if (enableAtmosphericDrag) {
      for (const atmo of bodies) {
        if (atmo.hasAtmosphere && atmo !== b1) {
          applyAtmosphericDrag(atmo, b1);
        }
      }
    }

    for (let j = i + 1; j < bodies.length; j++) {
      const b2 = bodies[j];

      _rVec.subVectors(b2.pos, b1.pos);
      const dist = _rVec.length();
      const distSq = dist * dist;
      _dir.copy(_rVec).normalize();

      // 1. Newtonian Gravity
      const fMag = (G * b1.mass * b2.mass) / distSq;
      _fNewton.copy(_dir).multiplyScalar(-fMag);
      b2.force.add(_fNewton);
      b1.force.sub(_fNewton);

      // 2. J2 Perturbations
      if (b1.J2 && b1.poleVector) applyJ2Force(b1, b2, _rVec, dist);
      if (b2.J2 && b2.poleVector) {
        _rVec.negate();
        applyJ2Force(b2, b1, _rVec, dist);
        _rVec.negate(); // Restore
      }

      // 3. J3 Perturbations
      if (b1.J3 && b1.poleVector) applyJ3Force(b1, b2, _rVec, dist);
      if (b2.J3 && b2.poleVector) {
        _rVec.negate();
        applyJ3Force(b2, b1, _rVec, dist);
        _rVec.negate();
      }

      // 4. J4 Perturbations
      if (b1.J4 && b1.poleVector) applyJ4Force(b1, b2, _rVec, dist);
      if (b2.J4 && b2.poleVector) {
        _rVec.negate();
        applyJ4Force(b2, b1, _rVec, dist);
        _rVec.negate();
      }

      // 5. C22/S22 Sectoral Harmonics
      if ((b1.C22 || b1.S22) && b1.poleVector) applyC22S22Force(b1, b2, _rVec, dist);
      if ((b2.C22 || b2.S22) && b2.poleVector) {
        _rVec.negate();
        applyC22S22Force(b2, b1, _rVec, dist);
        _rVec.negate();
      }

      // 6. Post-Newtonian (PPN) Corrections
      const c2 = C_LIGHT * C_LIGHT;
      
      // Force on b1 due to b2
      {
        _v.subVectors(b1.vel, b2.vel);
        const rMag = dist;
        const mu = G * b2.mass;
        
        const vSq = _v.lengthSq();
        const rDotV = _rVec.dot(_v);
        
        const term1 = (4 * mu / rMag - vSq);
        _accPPN.copy(_rVec).multiplyScalar(term1)
          .add(_v.multiplyScalar(4 * rDotV))
          .multiplyScalar(mu / (c2 * Math.pow(rMag, 3)));
          
        b1.force.add(_accPPN.multiplyScalar(b1.mass));
      }

      // Force on b2 due to b1
      {
        _rVec.negate();
        _v.subVectors(b2.vel, b1.vel);
        const rMag = dist;
        const mu = G * b1.mass;
        
        const vSq = _v.lengthSq();
        const rDotV = _rVec.dot(_v);
        
        const term1 = (4 * mu / rMag - vSq);
        _accPPN.copy(_rVec).multiplyScalar(term1)
          .add(_v.multiplyScalar(4 * rDotV))
          .multiplyScalar(mu / (c2 * Math.pow(rMag, 3)));
          
        b2.force.add(_accPPN.multiplyScalar(b2.mass));
        _rVec.negate(); // Restore
      }

      // 7. Tidal Forces
      if (enableTidal) {
        applyTidalForces(b1, b2, _rVec, dist);
      }
    }
  }
}

function applySolarRadiationPressure(sun: PhysicsBody, body: PhysicsBody): void {
  _rVec.subVectors(body.pos, sun.pos);
  const dist = _rVec.length();
  _dir.copy(_rVec).normalize();
  
  const Cr = 1.3;
  const area = Math.PI * body.radius * body.radius;
  
  const numerator = SOLAR_LUMINOSITY * Cr * area;
  const denominator = 4 * Math.PI * C_LIGHT * dist * dist;
  
  const fMag = numerator / denominator;
  
  _dir.multiplyScalar(fMag);
  body.force.add(_dir);
  sun.force.sub(_dir);
}

function applyYarkovskyForce(sun: PhysicsBody, body: PhysicsBody): void {
  if (!body.albedo || !body.thermalInertia) return;
  
  _rVec.subVectors(body.pos, sun.pos);
  const dist = _rVec.length();
  
  const solarFlux = SOLAR_LUMINOSITY / (4 * Math.PI * dist * dist);
  const absorbedPower = (1 - body.albedo) * solarFlux * Math.PI * body.radius * body.radius;
  
  const thermalLagAngle = Math.PI / 4;
  
  _v.copy(body.vel).normalize(); // velDir
  _dir.copy(_rVec).normalize(); // radialDir
  
  // Tangential direction
  _cross1.crossVectors(_dir, _v);
  _tangentialDir.crossVectors(_cross1, _dir).normalize();
  
  const fMag = (absorbedPower / C_LIGHT) * Math.sin(thermalLagAngle) * 0.1;
  
  _tangentialDir.multiplyScalar(fMag);
  body.force.add(_tangentialDir);
}

function applyAtmosphericDrag(atmosphere: PhysicsBody, body: PhysicsBody): void {
  if (!atmosphere.hasAtmosphere || !atmosphere.surfacePressure || !atmosphere.scaleHeight) return;
  if (!body.dragCoefficient && !atmosphere.dragCoefficient) return;
  
  _rVec.subVectors(body.pos, atmosphere.pos);
  const altitude = _rVec.length() - atmosphere.radius;
  
  if (altitude < 0 || altitude > atmosphere.scaleHeight * 10 * 1000) return;
  
  const scaleHeightMeters = atmosphere.scaleHeight * 1000;
  const surfaceDensity = atmosphere.surfacePressure / (287 * (atmosphere.meanTemperature || 288));
  const density = surfaceDensity * Math.exp(-altitude / scaleHeightMeters);
  
  _relVel.copy(body.vel);
  const vMag = _relVel.length();
  
  if (vMag < 1) return;
  
  const Cd = body.dragCoefficient || atmosphere.dragCoefficient || 2.2;
  const area = Math.PI * body.radius * body.radius;
  
  const dragMag = 0.5 * density * vMag * vMag * Cd * area;
  _relVel.normalize().multiplyScalar(-dragMag);
  
  body.force.add(_relVel);
}

function applyJ2Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  if (!primary.J2 || !primary.poleVector) return;
  
  const z = rVec.dot(primary.poleVector);
  const r2 = r * r;
  const r4 = r2 * r2;
  const R = primary.radius;
  
  const factor = (3 * G * primary.mass * satellite.mass * primary.J2 * (R * R)) / (2 * r4);
  const z2_r2 = (z * z) / r2;
  
  _term1Vec.copy(rVec).multiplyScalar(5 * z2_r2 - 1);
  _term2Vec.copy(primary.poleVector).multiplyScalar(2 * z);
  
  _term1Vec.sub(_term2Vec).multiplyScalar(-factor / r);
  
  satellite.force.add(_term1Vec);
  primary.force.sub(_term1Vec);
}

function applyJ3Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  if (!primary.J3 || !primary.poleVector) return;
  
  const z = rVec.dot(primary.poleVector);
  const r2 = r * r;
  const r5 = r2 * r2 * r;
  const R = primary.radius;
  
  const factor = (G * primary.mass * satellite.mass * primary.J3 * Math.pow(R, 3)) / r5;
  const z_r = z / r;
  const z2_r2 = (z * z) / r2;
  
  _term1Vec.copy(rVec).multiplyScalar(5 * z_r * (7 * z2_r2 - 3));
  _term2Vec.copy(primary.poleVector).multiplyScalar(3 * (5 * z2_r2 - 1));
  
  _term1Vec.sub(_term2Vec).multiplyScalar(-factor / (2 * r));
  
  satellite.force.add(_term1Vec);
  primary.force.sub(_term1Vec);
}

function applyJ4Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  if (!primary.J4 || !primary.poleVector) return;
  
  const z = rVec.dot(primary.poleVector);
  const r2 = r * r;
  const r6 = r2 * r2 * r2;
  const R = primary.radius;
  
  const factor = (5 * G * primary.mass * satellite.mass * primary.J4 * Math.pow(R, 4)) / (2 * r6);
  const z2_r2 = (z * z) / r2;
  const z4_r4 = z2_r2 * z2_r2;
  
  _term1Vec.copy(rVec).multiplyScalar(3 - 42 * z2_r2 + 63 * z4_r4);
  _term2Vec.copy(primary.poleVector).multiplyScalar(12 * z / r - 28 * (z * z2_r2) / r);
  
  _term1Vec.add(_term2Vec).multiplyScalar(-factor / r);
  
  satellite.force.add(_term1Vec);
  primary.force.sub(_term1Vec);
}

function applyC22S22Force(primary: PhysicsBody, satellite: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  if (!primary.C22 && !primary.S22) return;
  if (!primary.poleVector) return;
  
  const C22 = primary.C22 || 0;
  const S22 = primary.S22 || 0;
  const R = primary.radius;
  const r3 = r * r * r;
  
  const factor = (3 * G * primary.mass * satellite.mass * Math.sqrt(C22 * C22 + S22 * S22) * R * R) / r3;
  
  _equatorialDir.crossVectors(primary.poleVector, rVec).normalize();
  _equatorialDir.multiplyScalar(factor / r);
  
  satellite.force.add(_equatorialDir);
  primary.force.sub(_equatorialDir);
}

function applyTidalForces(b1: PhysicsBody, b2: PhysicsBody, rVec: THREE.Vector3, r: number): void {
  const primary = b1.mass > b2.mass ? b1 : b2;
  const satellite = b1.mass > b2.mass ? b2 : b1;
  // If b1 is primary, rVec points b1->b2 (satellite). 
  // Wait, rVec was b2.pos - b1.pos.
  // If b1 is primary, rVec is correct (primary -> satellite).
  // If b2 is primary, rVec is satellite -> primary. We need primary -> satellite.
  // So if b2 is primary, we negate rVec.
  
  // Note: rVec passed in is b2.pos - b1.pos
  
  const rVecSat = b1.mass > b2.mass ? rVec : _rVec.copy(rVec).negate();
  
  if (!primary.k2 || !satellite.k2) return;
  if (!primary.tidalQ || !satellite.tidalQ) return;
  
  const k2_primary = primary.k2;
  const Q_primary = primary.tidalQ;
  const R_primary = primary.radius;
  
  _orbitalVel.subVectors(satellite.vel, primary.vel);
  const vMag = _orbitalVel.length();
  const n = vMag / r;
  
  const tidalAccel = (k2_primary / Q_primary) * 
    (primary.mass / satellite.mass) * 
    Math.pow(R_primary / r, 5) * 
    n * n * 
    1e-15;
  
  _cross1.crossVectors(rVecSat, _orbitalVel);
  _tangentialDir.crossVectors(rVecSat, _cross1).normalize();
  
  _tangentialDir.multiplyScalar(tidalAccel * satellite.mass);
  
  satellite.force.add(_tangentialDir);
  primary.force.sub(_tangentialDir);
  
  // Restore rVec if we negated it into _rVec? 
  // No, _rVec is a temp, we don't need to restore it. 
  // But if we used _rVec as a temp for negation, we must ensure we didn't overwrite rVec if rVec IS _rVec.
  // In the main loop, rVec IS _rVec.
  // So if b2 is primary, we did _rVec.copy(_rVec).negate(). This negates the main loop's _rVec!
  // We must be careful.
  // In main loop: applyTidalForces(b1, b2, _rVec, dist)
  // Inside here: rVec IS _rVec.
  // If b2 > b1, we do _rVec.copy(_rVec).negate(). This modifies the caller's _rVec.
  // This is BAD because subsequent calls in the loop might use _rVec.
  // BUT, applyTidalForces is the LAST thing called in the loop.
  // So it might be okay?
  // No, the loop continues to next j.
  // _rVec is recalculated at start of j loop: _rVec.subVectors(b2.pos, b1.pos).
  // So it is reset every iteration.
  // So modifying it at the end of the loop is SAFE.
}

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

  // Update Rotation
  bodies.forEach(b => {
    if (!b.torque) b.torque = new THREE.Vector3();
    b.torque.set(0, 0, 0);
  });

  if (enableTidal) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        applyTidalTorque(bodies[i], bodies[j]);
      }
    }
  }

  bodies.forEach(b => {
    if (b.momentOfInertia && b.angularVelocity && b.torque) {
      _torque.copy(b.torque).multiplyScalar(dt / b.momentOfInertia);
      b.angularVelocity.add(_torque);
    }
  });
}

function applyTidalTorque(b1: PhysicsBody, b2: PhysicsBody): void {
  _rVec.subVectors(b2.pos, b1.pos);
  const dist = _rVec.length();
  
  // Torque on b1
  if (b1.k2 && b1.tidalQ && b1.momentOfInertia && b1.angularVelocity) {
    _relVel.subVectors(b2.vel, b1.vel);
    _orbitalAngVel.crossVectors(_rVec, _relVel).divideScalar(dist*dist);
    
    _diff.subVectors(_orbitalAngVel, b1.angularVelocity);
    
    const factor = 1.5 * (b1.k2 / b1.tidalQ) * G * (b2.mass * b2.mass) * Math.pow(b1.radius, 5) / Math.pow(dist, 6);
    
    _torque.copy(_diff).normalize().multiplyScalar(factor);
    
    if (!b1.torque) b1.torque = new THREE.Vector3();
    b1.torque.add(_torque);
  }

  // Torque on b2
  if (b2.k2 && b2.tidalQ && b2.momentOfInertia && b2.angularVelocity) {
    _rVec.negate(); // b1 - b2
    _relVel.subVectors(b1.vel, b2.vel);
    _orbitalAngVel.crossVectors(_rVec, _relVel).divideScalar(dist*dist);
    
    _diff.subVectors(_orbitalAngVel, b2.angularVelocity);
    
    const factor = 1.5 * (b2.k2 / b2.tidalQ) * G * (b1.mass * b1.mass) * Math.pow(b2.radius, 5) / Math.pow(dist, 6);
    
    _torque.copy(_diff).normalize().multiplyScalar(factor);
    
    if (!b2.torque) b2.torque = new THREE.Vector3();
    b2.torque.add(_torque);
  }
}

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

export function computeBarycenter(bodies: PhysicsBody[]): THREE.Vector3 {
  const totalMass = bodies.reduce((sum, b) => sum + b.mass, 0);
  const baryPos = new THREE.Vector3();
  
  bodies.forEach(b => {
    baryPos.addScaledVector(b.pos, b.mass / totalMass);
  });
  
  return baryPos;
}

export function computeOpticalLibration(moon: PhysicsBody, earth: PhysicsBody): number {
  _rVec.subVectors(moon.pos, earth.pos);
  const r = _rVec.length();
  
  const a = 384400e3;
  const e = 0.0549;
  
  const p = a * (1 - e * e);
  const cosNu = (p / r - 1) / e;
  const clampedCosNu = Math.max(-1, Math.min(1, cosNu));
  
  _relVel.subVectors(moon.vel, earth.vel);
  const rDotV = _rVec.dot(_relVel);
  let nu = Math.acos(clampedCosNu);
  if (rDotV < 0) nu = 2 * Math.PI - nu;
  
  return -2 * e * Math.sin(nu);
}
