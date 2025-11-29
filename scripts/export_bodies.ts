
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOLAR_SYSTEM_DATA } from '../src/data/solarSystem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.resolve(__dirname, '../physics-wasm/tests/fixtures');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bodies.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Transform data if necessary to match Rust struct expectations
// The Rust PhysicsBody struct expects:
// pub struct PhysicsBody {
//     pub name: String,
//     pub mass: f64,
//     pub radius: f64,
//     pub pos: Vector3,
//     pub vel: Vector3,
//     ...
// }
// The solarSystem data in TS might need some fields mapped or ensured.
// However, the Rust side uses serde with rename_all = "camelCase" usually, or matches the TS interface.
// Let's dump it as is for now, and we can adjust the Rust struct or this script if deserialization fails.

const data = JSON.stringify(SOLAR_SYSTEM_DATA, null, 2);

fs.writeFileSync(OUTPUT_FILE, data);

console.log(`Successfully exported ${SOLAR_SYSTEM_DATA.length} bodies to ${OUTPUT_FILE}`);
