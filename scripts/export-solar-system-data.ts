import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOLAR_SYSTEM_DATA } from '../src/data/solarSystem';
import { EXTENDED_BODIES } from '../src/data/extendedBodies';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '../physics-wasm/tests/fixtures/solar_system_data.json');

async function main() {
  const allBodies = [...SOLAR_SYSTEM_DATA, ...EXTENDED_BODIES];

  const exportData = allBodies.map(body => ({
    name: body.name,
    mass: body.mass,
    radius: body.radius,
    // Physics parameters
    J2: body.J2,
    J3: body.J3,
    J4: body.J4,
    tidalQ: body.tidalQ,
    k2: body.k2,
    dragCoefficient: body.dragCoefficient,
    // Initial State (for static bodies or if needed)
    // Note: We usually load state from Ephemeris, but having these might be useful
    // for fallback or specific tests.
    rotationPeriod: body.rotationPeriod,
    axialTilt: body.axialTilt,
    
    // Parent for hierarchy
    parent: body.parent,
    
    // JPL ID for matching with ephemeris
    jplId: body.jplId
  }));

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(exportData, null, 2));
  console.log(`Exported ${exportData.length} bodies to ${OUTPUT_PATH}`);
}

main().catch(console.error);
