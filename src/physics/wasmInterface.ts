/**
 * Canonical interface between TypeScript and the Rust WASM physics engine.
 *
 * The Rust `PhysicsBody` uses `#[serde(rename_all = "camelCase")]`.
 * Most nested param structs are `#[serde(flatten)]` — their fields appear at the
 * top level of the JSON object. The only exception is `tidal`, which is nested.
 *
 * Coordinate frames:
 *   Three.js  : Y-up  (x, y, z)
 *   WASM/Rust : Ecliptic Z-up (x, y, z)  — heliocentric ecliptic J2000
 *
 *   TS → WASM : (x, y, z)_threejs  →  { x,  y: -z,  z:  y }
 *   WASM → TS : (x, y, z)_ecl     →  set(x, z, -y)  [Three.js Vector3]
 */

import * as THREE from "three";
import type { PhysicsBody, CelestialBodyData } from "../types";

export type Vec3 = { x: number; y: number; z: number };

/**
 * Exact JSON shape expected by Rust's PhysicsBody after serde deserialization.
 * Flattened param structs contribute fields at the top level; `tidal` is nested.
 */
export interface WasmBody {
  // Core (required)
  name: string;
  gm: number;
  equatorialRadius: number;
  pos: Vec3;
  vel: Vec3;
  force?: Vec3 | null;

  // HarmonicsParams (flattened)
  zonalCoeffs?: number[] | null; // Rust alias "J" also accepted
  c22?: number | null;
  s22?: number | null;
  poleVector?: Vec3 | null;

  // TidalParams (NESTED — not flattened in Rust)
  tidal?: { k2?: number | null; tidalQ?: number | null } | null;

  // RotationalParams (flattened)
  angularVelocity?: Vec3 | null;
  momentOfInertia?: number | null;
  torque?: Vec3 | null;

  // AtmosphereParams (flattened)
  hasAtmosphere?: boolean | null;
  surfacePressure?: number | null;
  scaleHeight?: number | null;
  meanTemperature?: number | null;
  dragCoefficient?: number | null;

  // ThermalParams (flattened)
  albedo?: number | null;
  thermalInertia?: number | null;

  // PrecessionParams (flattened) — camelCase of Rust snake_case field names
  poleRa0?: number | null; // pole_ra0 → poleRa0  (alias "poleRA" accepted)
  poleDec0?: number | null; // pole_dec0 → poleDec0 (alias "poleDec" accepted)
  poleRARate?: number | null; // pole_ra_rate (aliases: "poleRARate", "poleRA_rate")
  poleDecRate?: number | null; // pole_dec_rate (aliases: "poleDecRate", "poleDec_rate")
  precessionRate?: number | null;
  nutationAmplitude?: number | null;
  w0?: number | null; // alias "W0" accepted
  wdot?: number | null; // alias "Wdot" accepted

  // MoonParams (flattened)
  libration?: number | null;

  // CometParams (flattened)
  yorpFactor?: number | null;
  cometA1?: number | null;
  cometA2?: number | null;
  cometA3?: number | null;
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

/** Three.js Y-up → Ecliptic Z-up: (x, y, z) → { x, y: -z, z: y } */
function toEcliptic(v: THREE.Vector3): Vec3 {
  return { x: v.x, y: -v.z, z: v.y };
}

// ---------------------------------------------------------------------------
// Main conversion: PhysicsBody (THREE.js runtime) → WasmBody
// ---------------------------------------------------------------------------

/**
 * Convert a frontend PhysicsBody (THREE.js Y-up) to the WasmBody shape
 * expected by the Rust physics engine (ecliptic Z-up, camelCase fields).
 */
export function bodyToWasm(b: PhysicsBody): WasmBody {
  return {
    name: b.name,
    gm: b.gm,
    equatorialRadius: b.equatorialRadius,
    pos: toEcliptic(b.pos),
    vel: toEcliptic(b.vel),

    // HarmonicsParams (flattened)
    zonalCoeffs: b.J ?? null,
    c22: b.c22 ?? null,
    s22: b.s22 ?? null,
    poleVector: b.poleVector ? toEcliptic(b.poleVector) : null,

    // TidalParams (NESTED)
    tidal: b.tidal
      ? { k2: b.tidal.k2 ?? null, tidalQ: b.tidal.tidalQ ?? null }
      : null,

    // RotationalParams (flattened)
    angularVelocity: b.angularVelocity ? toEcliptic(b.angularVelocity) : null,
    momentOfInertia: b.momentOfInertia ?? null,
    torque: b.torque ? toEcliptic(b.torque) : null,

    // AtmosphereParams (flattened)
    hasAtmosphere: b.hasAtmosphere ?? null,
    surfacePressure: b.surfacePressure ?? null,
    scaleHeight: b.scaleHeight ?? null,
    meanTemperature: b.meanTemperature ?? null,
    dragCoefficient: b.dragCoefficient ?? null,

    // ThermalParams (flattened)
    albedo: b.albedo ?? null,
    thermalInertia: b.thermalInertia ?? null,

    // PrecessionParams (flattened)
    poleRa0: b.poleRA0 ?? null,
    poleDec0: b.poleDec0 ?? null,
    poleRARate: b.poleRARate ?? null,
    poleDecRate: b.poleDecRate ?? null,
    precessionRate: b.precessionRate ?? null,
    nutationAmplitude: b.nutationAmplitude ?? null,
    w0: b.W0 ?? null,
    wdot: b.Wdot ?? null,

    // MoonParams (flattened)
    libration: b.libration ?? null,

    // CometParams (flattened)
    yorpFactor: b.yorpFactor ?? null,
    cometA1: b.cometA1 ?? null,
    cometA2: b.cometA2 ?? null,
    cometA3: b.cometA3 ?? null,
  };
}

// ---------------------------------------------------------------------------
// Read-back: WASM output → PhysicsBody (mutates in place)
// ---------------------------------------------------------------------------

function getField(obj: unknown, key: string): unknown {
  if (!obj) return undefined;
  if (typeof (obj as Map<string, unknown>).get === "function") {
    return (obj as Map<string, unknown>).get(key);
  }
  return (obj as Record<string, unknown>)[key];
}

/**
 * Read WASM `get_bodies()` output back into a PhysicsBody (mutates `target`).
 * Converts ecliptic Z-up → Three.js Y-up.
 * Returns true if pos/vel were valid and the update was applied.
 */
export function wasmToPhysicsPos(
  wasmBody: unknown,
  target: PhysicsBody,
): boolean {
  const posObj = getField(wasmBody, "pos");
  const velObj = getField(wasmBody, "vel");
  if (!posObj || !velObj) return false;

  const px = getField(posObj, "x") as number;
  const py = getField(posObj, "y") as number;
  const pz = getField(posObj, "z") as number;
  const vx = getField(velObj, "x") as number;
  const vy = getField(velObj, "y") as number;
  const vz = getField(velObj, "z") as number;

  if (isNaN(px) || isNaN(py) || isNaN(pz)) return false;
  if (isNaN(vx) || isNaN(vy) || isNaN(vz)) return false;

  // Ecliptic Z-up (x, y, z) → Three.js Y-up: set(x, z, -y)
  target.pos.set(px, pz, -py);
  target.vel.set(vx, vz, -vy);

  // Read back angularVelocity if the engine updated it
  const avObj = getField(wasmBody, "angularVelocity");
  if (avObj && target.angularVelocity) {
    const ax = getField(avObj, "x") as number;
    const ay = getField(avObj, "y") as number;
    const az = getField(avObj, "z") as number;
    if (!isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
      target.angularVelocity.set(ax, az, -ay);
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Test runner: CelestialBodyData + archive pos/vel → WasmBody
// ---------------------------------------------------------------------------

/**
 * Compute the ecliptic pole vector from IAU RA/Dec (in degrees).
 * Archive positions are already in ecliptic Z-up — no further transform needed.
 */
function computePoleVec(ra?: number, dec?: number): Vec3 {
  if (ra == null || dec == null) return { x: 0, y: 1, z: 0 };
  const raR = THREE.MathUtils.degToRad(ra);
  const decR = THREE.MathUtils.degToRad(dec);
  const xe = Math.cos(decR) * Math.cos(raR);
  const ye = Math.cos(decR) * Math.sin(raR);
  const ze = Math.sin(decR);
  const eps = THREE.MathUtils.degToRad(23.43928);
  const c = Math.cos(eps),
    s = Math.sin(eps);
  // equatorial → ecliptic Z-up
  return { x: xe, y: ye * c + ze * s, z: -ye * s + ze * c };
}

export function celBodyToWasm(
  data: CelestialBodyData,
  pos: [number, number, number],
  vel: [number, number, number],
): WasmBody {
  const degToRad = (d: number) => (d * Math.PI) / 180;

  // 1. Core State (JPL starting point)
  const body: any = {
    name: data.name,
    gm: data.gm,
    equatorialRadius: data.equatorialRadius ?? 0,
    pos: { x: pos[0], y: pos[1], z: pos[2] }, // Already Ecliptic Z-up from JPL
    vel: { x: vel[0], y: vel[1], z: vel[2] },
  };

  // 2. Harmonics & Pole Vector (Mirroring Rust Logic)
  if (data.J && data.J.length > 0) {
    body.zonalCoeffs = data.J;
  }

  // Explicitly calculate pole vector exactly like Rust's to_physics_body
  if (data.poleRA != null && data.poleDec != null) {
    body.poleVector = computePoleVec(data.poleRA, data.poleDec);
  }

  // 3. PrecessionParams (Units matching Rust's SimplifiedBody)
  if (data.poleRA != null && data.poleDec != null) {
    body.poleRa0 = data.poleRA;
    body.poleDec0 = data.poleDec;
  }

  if (data.precessionRate != null) {
    // Rust: ((rate / 3600.0) * 100.0).to_radians()
    body.precessionRate = degToRad((data.precessionRate / 3600.0) * 100.0);
  }

  if (data.nutationAmplitude != null) {
    // Rust: (amp / 3600.0).to_radians()
    body.nutationAmplitude = degToRad(data.nutationAmplitude / 3600.0);
  }

  body.w0 = data.W0;
  body.wdot = data.Wdot;
  body.poleRaRate = data.poleRA_rate;
  body.poleDecRate = data.poleDec_rate;

  // 4. Tidal
  if (data.tidal) {
    body.tidal = { k2: data.tidal.k2, tidalQ: data.tidal.tidalQ };
  }

  return body as WasmBody;
}
