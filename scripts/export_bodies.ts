/**
 * Exports SOLAR_SYSTEM_DATA to physics-wasm/tests/fixtures/bodies.json
 *
 * The output JSON conforms to the Rust PhysicsBody serde shape:
 *   - camelCase field names (rename_all = "camelCase")
 *   - Flattened params at top level: harmonics, rotation, atmosphere, thermal, precession
 *   - Nested tidal: { k2, tidalQ }
 *   - Frontend-only fields (texture, color, rings, etc.) are excluded
 *
 * Rust's SimplifiedBody (tests/common/mod.rs) deserializes this file to load
 * body metadata. Positions/velocities come from JPL Horizons data separately.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOLAR_SYSTEM_DATA } from '../src/data/solarSystem';
import type { CelestialBodyData } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../physics-wasm/tests/fixtures');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bodies.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/** Map a CelestialBodyData to the physics-engine JSON shape. */
function toPhysicsJson(b: CelestialBodyData): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: b.name,
    mass: b.mass,
    radius: b.radius,
    // pos/vel default to zero; Rust tests override from JPL data
    pos: [0, 0, 0],
    vel: [0, 0, 0],
  };

  // HarmonicsParams (flattened at top level)
  if (b.J != null)   out.J     = b.J;       // Rust alias "J" → zonalCoeffs
  if (b.c22 != null) out.c22   = b.c22;
  if (b.s22 != null) out.s22   = b.s22;

  // TidalParams (NESTED object)
  if (b.tidal != null) {
    out.tidal = { k2: b.tidal.k2, tidalQ: b.tidal.tidalQ };
  }

  // AtmosphereParams (flattened at top level)
  if (b.hasAtmosphere != null)  out.hasAtmosphere  = b.hasAtmosphere;
  if (b.surfacePressure != null) out.surfacePressure = b.surfacePressure;
  if (b.scaleHeight != null)    out.scaleHeight     = b.scaleHeight;
  if (b.meanTemperature != null) out.meanTemperature = b.meanTemperature;
  if (b.dragCoefficient != null) out.dragCoefficient = b.dragCoefficient;

  // ThermalParams (flattened at top level)
  if (b.albedo != null)        out.albedo        = b.albedo;
  if (b.thermalInertia != null) out.thermalInertia = b.thermalInertia;

  // PrecessionParams (flattened at top level; Rust has aliases for these names)
  if (b.poleRA != null)        out.poleRA        = b.poleRA;        // alias → poleRa0
  if (b.poleDec != null)       out.poleDec       = b.poleDec;       // alias → poleDec0
  if (b.poleRA_rate != null)   out.poleRA_rate   = b.poleRA_rate;   // alias → poleRaRate
  if (b.poleDec_rate != null)  out.poleDec_rate  = b.poleDec_rate;  // alias → poleDecRate
  if (b.precessionRate != null) out.precessionRate = b.precessionRate;
  if (b.nutationAmplitude != null) out.nutationAmplitude = b.nutationAmplitude;
  if (b.W0 != null)            out.W0            = b.W0;            // alias → w0
  if (b.Wdot != null)          out.Wdot          = b.Wdot;          // alias → wdot

  return out;
}

const output = SOLAR_SYSTEM_DATA.map(toPhysicsJson);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
console.log(`Exported ${output.length} bodies → ${OUTPUT_FILE}`);
