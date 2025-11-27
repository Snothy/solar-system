
import * as THREE from 'three';
import { rkf45Step, computeGravitationalForces } from '../src/utils/physics';
import { G, C_LIGHT, AU } from '../src/utils/constants';
import type { PhysicsBody } from '../src/types';

// Mock PhysicsBody since we can't import types easily if they depend on other things
// But we imported it above.

const SUN_MASS = 1.989e30;
const MERCURY_MASS = 3.3011e23;
const MERCURY_PERIHELION = 46.0012e9; // m
const MERCURY_APHELION = 69.8169e9; // m
const MERCURY_SEMI_MAJOR = 57.909e9; // m
const MERCURY_ECCENTRICITY = 0.205630;

// Initial State (at Perihelion)
// Velocity at perihelion: v = sqrt(GM * (2/r - 1/a))
const v_perihelion = Math.sqrt(G * SUN_MASS * (2 / MERCURY_PERIHELION - 1 / MERCURY_SEMI_MAJOR));

const sun: PhysicsBody = {
    name: 'Sun',
    mass: SUN_MASS,
    radius: 696340000,
    pos: new THREE.Vector3(0, 0, 0),
    vel: new THREE.Vector3(0, 0, 0),
    force: new THREE.Vector3(),
    hasAtmosphere: false
};

const mercury: PhysicsBody = {
    name: 'Mercury',
    mass: MERCURY_MASS,
    radius: 2439700,
    pos: new THREE.Vector3(MERCURY_PERIHELION, 0, 0),
    vel: new THREE.Vector3(0, v_perihelion, 0),
    force: new THREE.Vector3(),
    hasAtmosphere: false
};

const bodies = [sun, mercury];

// Simulation Parameters
let dt = 1; // Initial step
const totalTime = 88 * 24 * 3600 * 5; // 5 Mercury years
let time = 0;

console.log("Starting Verification Simulation...");
console.log("Initial State:");
console.log("Sun:", sun.pos, sun.vel);
console.log("Mercury:", mercury.pos, mercury.vel);

let minDist = Infinity;
let maxDist = 0;
let perihelionCount = 0;
let lastDist = mercury.pos.length();
let lastDiff = 0;

// Track perihelion positions
const perihelionAngles: number[] = [];

// Energy Check
function getEnergy(bodies: PhysicsBody[]) {
    let ke = 0;
    let pe = 0;
    for (let i = 0; i < bodies.length; i++) {
        ke += 0.5 * bodies[i].mass * bodies[i].vel.lengthSq();
        for (let j = i + 1; j < bodies.length; j++) {
            const dist = bodies[i].pos.distanceTo(bodies[j].pos);
            pe -= (G * bodies[i].mass * bodies[j].mass) / dist;
        }
    }
    return ke + pe;
}

const initialEnergy = getEnergy(bodies);
console.log("Initial Energy:", initialEnergy);

// Run Loop
while (time < totalTime) {
    // Use RKF45 with Relativity Enabled
    const result = rkf45Step(
        bodies,
        dt,
        1e-9,
        false, // Tidal
        false, // Drag
        false, // Yarkovsky
        true   // Relativity (EIH)
    );
    
    // Check for Perihelion passage
    const dist = mercury.pos.length();
    const diff = dist - lastDist;
    
    // Local minimum detection
    if (lastDiff < 0 && diff > 0) {
        // Perihelion passage just happened
        perihelionCount++;
        const angle = Math.atan2(mercury.pos.y, mercury.pos.x);
        perihelionAngles.push(angle);
        // console.log(`Perihelion ${perihelionCount}: Angle = ${angle} rad, Dist = ${dist/AU} AU`);
    }
    
    lastDist = dist;
    lastDiff = diff;
    
    time += result.takenDt;
    dt = result.nextDt; // Update dt for next step
    
    if (isNaN(mercury.pos.x)) {
        console.error("NaN detected at time", time);
        break;
    }

    if (time % (88 * 24 * 3600) < result.takenDt) {
        process.stdout.write(".");
    }
}

console.log("\nSimulation Complete.");

const finalEnergy = getEnergy(bodies);
console.log("Final Energy:", finalEnergy);
console.log("Energy Error:", (finalEnergy - initialEnergy) / initialEnergy);

// Calculate Precession
if (perihelionAngles.length > 1) {
    const totalPrecession = perihelionAngles[perihelionAngles.length - 1] - perihelionAngles[0];
    const orbits = perihelionAngles.length - 1;
    const precessionPerOrbit = totalPrecession / orbits;
    
    // Theoretical Value (GR): 6 * pi * GM / (c^2 * a * (1 - e^2)) radians per orbit
    const a = MERCURY_SEMI_MAJOR;
    const e = MERCURY_ECCENTRICITY;
    const theoretical = (6 * Math.PI * G * SUN_MASS) / (C_LIGHT * C_LIGHT * a * (1 - e * e));
    
    console.log(`Measured Precession per Orbit: ${precessionPerOrbit} rad`);
    console.log(`Theoretical Precession per Orbit: ${theoretical} rad`);
    console.log(`Error: ${Math.abs((precessionPerOrbit - theoretical) / theoretical) * 100}%`);
    
    // Convert to arcsec per century
    const orbitsPerCentury = 100 * 365.25 / 88;
    const arcsecPerRad = 180 * 3600 / Math.PI;
    const measuredArcsec = precessionPerOrbit * orbitsPerCentury * arcsecPerRad;
    const theoreticalArcsec = theoretical * orbitsPerCentury * arcsecPerRad;
    
    console.log(`Measured Precession (arcsec/century): ${measuredArcsec}`);
    console.log(`Theoretical Precession (arcsec/century): ${theoreticalArcsec}`);
} else {
    console.log("Not enough orbits to calculate precession.");
}
