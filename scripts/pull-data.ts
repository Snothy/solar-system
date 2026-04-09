import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { SOLAR_SYSTEM_DATA } from '../src/data/solarSystem';
import { EXTENDED_BODIES } from '../src/data/extendedBodies';

// Disable TLS verification for local dev/proxy issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DATA_DIR = path.join(__dirname, '../data');
// CHANGED: Output to formatted_data in root
const FORMATTED_DATA_DIR = path.join(__dirname, '../formatted_data');
const BASE_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

// Combine all bodies
const ALL_BODIES = [...SOLAR_SYSTEM_DATA, ...EXTENDED_BODIES];

async function fetchJPLData(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const url = `${BASE_URL}?${searchParams.toString()}`;
  // console.log(`Fetching from ${url}...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return await response.text();
}

// --- Parsing Helpers ---

function parseVectorTable(text: string): any[] {
  const soeIndex = text.indexOf('$$SOE');
  const eoeIndex = text.indexOf('$$EOE');
  if (soeIndex === -1 || eoeIndex === -1) return [];

  const block = text.substring(soeIndex, eoeIndex);
  const lines = block.split('\n');
  const data = [];

  // Regex for X, Y, Z, VX, VY, VZ
  // Format: X = 1.23 Y = 4.56 Z = 7.89 ...
  const numRegex = /([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)/;
  
  let currentDate = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Date line: 2461005.500000000 = A.D. 2025-Nov-26 00:00:00.0000 TDB
    if (line.includes('TDB')) {
      currentDate = line.split('=')[1]?.trim() || line;
      continue;
    }

    // Data line: X = ...
    if (line.startsWith('X =')) {
      const getVal = (key: string, src: string) => {
        const match = src.match(new RegExp(`${key}\\s*=\\s*${numRegex.source}`, 'i'));
        return match ? parseFloat(match[1]) : NaN;
      };

      // Sometimes Velocity is on the next line.
      // Let's combine this line and the next line just in case.
      let combined = line;
      if (lines[i+1] && lines[i+1].includes('VX')) {
        combined += ' ' + lines[i+1];
        i++; // Skip next line
      }

      const x = getVal('X', combined);
      const y = getVal('Y', combined);
      const z = getVal('Z', combined);
      const vx = getVal('VX', combined);
      const vy = getVal('VY', combined);
      const vz = getVal('VZ', combined);

      if (![x, y, z, vx, vy, vz].some(isNaN)) {
        data.push({
          date: currentDate,
          pos: [x * 1000, y * 1000, z * 1000], // km -> m
          vel: [vx * 1000, vy * 1000, vz * 1000] // km/s -> m/s
        });
      }
    }
  }
  return data;
}

function parseObserverTable(text: string): any[] {
  const soeIndex = text.indexOf('$$SOE');
  const eoeIndex = text.indexOf('$$EOE');
  if (soeIndex === -1 || eoeIndex === -1) return [];

  const block = text.substring(soeIndex, eoeIndex);
  const lines = block.split('\n');
  const data = [];

  // 2025-Nov-28 00:00     16 14 57.33 -21 14 35.0  -26.771 -10.590  0.98665975803683  -0.3130723    0.0000 /?    0.0000
  // Date__(UT)__HR:MN     R.A._____(ICRF)_____DEC    APmag   S-brt             delta      deldot     S-O-T /r     S-T-O
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Split by whitespace
    const parts = line.trim().split(/\s+/);
    
    // Basic validation: date part should look like YYYY-Mon-DD
    if (!parts[0].match(/^\d{4}-[A-Z][a-z]{2}-\d{2}$/)) continue;

    // Reconstruct date
    const date = `${parts[0]} ${parts[1]}`;
    
    // RA: parts[2] (HH), parts[3] (MM), parts[4] (SS.ss)
    const ra = `${parts[2]} ${parts[3]} ${parts[4]}`;
    
    // DEC: parts[5] (DD), parts[6] (MM), parts[7] (SS.s)
    const dec = `${parts[5]} ${parts[6]} ${parts[7]}`;
    
    // Mag: parts[8]
    const mag = parseFloat(parts[8]);
    
    // Surface Brightness: parts[9]
    const s_brt = parseFloat(parts[9]);
    
    // Delta (AU): parts[10]
    const delta_au = parseFloat(parts[10]);
    
    // Delta-dot (km/s): parts[11]
    const deldot = parseFloat(parts[11]);

    data.push({
      date,
      ra,
      dec,
      mag: isNaN(mag) ? null : mag,
      surface_brightness: isNaN(s_brt) ? null : s_brt,
      distance_au: isNaN(delta_au) ? null : delta_au,
      distance_km: isNaN(delta_au) ? null : delta_au * 149597870.7,
      range_rate_km_s: isNaN(deldot) ? null : deldot
    });
  }
  return data;
}

// Property Definition Interface
interface PropertyDef {
  key: string;
  regexes: RegExp[];
  transform?: (val: string, fullMatch?: RegExpMatchArray) => any;
}

// Helper for scientific notation and standard floats
const NUM_REGEX = `([~]?[+-]?\\d+(?:\\.\\d+)?(?:[xX]?10\\^\\d+|E[+-]?\\d+)?)`;
// Helper for values with uncertainties like 0.687+-.001
const NUM_UNCERTAINTY_REGEX = `([~]?[+-]?\\d+(?:\\.\\d+)?)(?:\\s*\\+-[\\d\\.]+)?`;

const PROPERTY_DEFINITIONS: PropertyDef[] = [
  // --- Mass & Gravity ---
  {
    key: 'mass_kg',
    regexes: [
      new RegExp(`Mass\\s*x?10\\^(\\d+)\\s*\\(?kg\\)?\\s*=\\s*${NUM_REGEX}`, 'i'), // Mass x10^26 (kg) = 5.6834
      new RegExp(`Mass\\s*\\(10\\^(\\d+)\\s*kg\\s*\\)\\s*=\\s*${NUM_REGEX}`, 'i'), // Satellite: Mass (10^20 kg ) = 1.08
      new RegExp(`Mass\\s*,\\s*10\\^(\\d+)\\s*kg\\s*=\\s*${NUM_REGEX}`, 'i')
    ],
    transform: (val, match) => {
        if (!match) return parseFloat(val.replace('~', ''));
        const exponent = parseInt(match[1]);
        const base = parseFloat(match[2].replace('~', ''));
        return base * Math.pow(10, exponent);
    }
  },
  {
    key: 'gm_km3_s2',
    regexes: [
      new RegExp(`GM\\s*\\(km\\^3\\/s\\^2\\)\\s*=\\s*${NUM_REGEX}`, 'i'),
      new RegExp(`GM\\s*,\\s*km\\^3\\/s\\^2\\s*=\\s*${NUM_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'density_g_cm3',
    regexes: [
      new RegExp(`Density\\s*\\(g\\/cm\\^3\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i'),
      new RegExp(`Mean\\s*density\\s*,\\s*g\\/cm\\^3\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i'),
      new RegExp(`Density\\s*\\(g\\s*cm\\^-3\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i') // Satellite: Density (g cm^-3)
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },

  // --- Radii ---
  {
    key: 'vol_mean_radius_km',
    regexes: [
      new RegExp(`Vol\\.\\s*Mean\\s*Radius\\s*\\(km\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i'),
      new RegExp(`Vol\\.\\s*mean\\s*radius\\s*,\\s*km\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'equatorial_radius_km',
    regexes: [
      new RegExp(`Equat\\.\\s*radius\\s*\\(1\\s*bar\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}\\s*km`, 'i'), // Saturn
      new RegExp(`Equatorial\\s*radius\\s*\\(km\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'polar_radius_km',
    regexes: [
      new RegExp(`Polar\\s*radius\\s*\\(km\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'mean_radius_km', // Fallback or general
    regexes: [
      new RegExp(`Mean\\s*Radius\\s*\\(km\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i'),
      new RegExp(`Radius\\s*\\(photosphere\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}\\s*km`, 'i'),
      new RegExp(`Radius\\s*\\(km\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i') // Satellite: Radius (km) = 13.1
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },

  // --- Rotation & Motion ---
  {
    key: 'sidereal_rotation_period_hours',
    regexes: [
      // Saturn: Sid. rot. period (III)= 10h 39m 22.4s
      new RegExp(`Sid\\.\\s*rot\\.\\s*period\\s*(?:\\(III\\))?\\s*=\\s*(\\d+)h\\s*(\\d+)m\\s*(\\d+(?:\\.\\d+)?)s`, 'i'),
      new RegExp(`Sidereal\\s*rot\\.\\s*per\\.\\s*=\\s*${NUM_REGEX}\\s*d`, 'i'),
      new RegExp(`Adopted\\s*sid\\.\\s*rot\\.\\s*per\\.\\s*=\\s*${NUM_REGEX}\\s*d`, 'i'),
      new RegExp(`Mean\\s*sidereal\\s*day\\s*,\\s*hr\\s*=\\s*${NUM_REGEX}`, 'i'),
      new RegExp(`Mean\\s*solar\\s*day\\s*,\\s*hrs\\s*=\\s*${NUM_REGEX}`, 'i'),
      new RegExp(`Rotational\\s*period\\s*=\\s*${NUM_REGEX}\\s*d`, 'i') // Satellite
    ],
    transform: (val, match) => {
        if (match && match.length >= 4 && match[0].includes('h')) {
            // HMS format
            const h = parseFloat(match[1]);
            const m = parseFloat(match[2]);
            const s = parseFloat(match[3]);
            return h + m/60 + s/3600;
        }
        // Days or Hours
        const rawVal = parseFloat(val.replace('~', ''));
        if (match && match[0].includes('d')) {
            return rawVal * 24;
        }
        return rawVal;
    }
  },
  {
    key: 'rotation_rate_rad_s',
    regexes: [
        new RegExp(`Sid\\.\\s*rot\\.\\s*rate\\s*\\(rad\\/s\\)\\s*=\\s*${NUM_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'mean_daily_motion_deg_d',
    regexes: [
        new RegExp(`Mean\\s*daily\\s*motion\\s*=\\s*${NUM_REGEX}\\s*deg\\/d`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'obliquity_deg',
    regexes: [
        new RegExp(`Obliquity\\s*to\\s*orbit\\s*=\\s*${NUM_REGEX}\\s*deg`, 'i'),
        new RegExp(`Obliquity\\s*to\\s*ecliptic\\s*=\\s*${NUM_REGEX}\\s*deg`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'flattening',
    regexes: [
        new RegExp(`Flattening\\s*=\\s*${NUM_REGEX}`, 'i'),
        new RegExp(`Flatness\\s*,\\s*f\\s*=\\s*${NUM_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },

  // --- Atmosphere & Surface ---
  {
    key: 'mean_temperature_k',
    regexes: [
        new RegExp(`Atmos\\.\\s*temp\\.\\s*\\(1\\s*bar\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}\\s*K`, 'i'),
        new RegExp(`Mean\\s*surface\\s*temp\\s*\\(Ts\\)\\s*,\\s*K\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i'),
        new RegExp(`Mean\\s*temp(?:erature)?\\s*,\\s*K\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'surface_gravity_m_s2',
    regexes: [
        new RegExp(`Equ\\.\\s*grav\\s*,\\s*ge\\s*\\(m\\/s\\^2\\)\\s*=\\s*${NUM_UNCERTAINTY_REGEX}`, 'i'),
        new RegExp(`Surface\\s*gravity\\s*=\\s*${NUM_UNCERTAINTY_REGEX}\\s*m\\/s\\^2`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'escape_speed_km_s',
    regexes: [
        new RegExp(`Escape\\s*speed\\s*,\\s*km\\/s\\s*=\\s*${NUM_REGEX}`, 'i'),
        new RegExp(`Escape\\s*velocity\\s*=\\s*${NUM_REGEX}\\s*km\\/s`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'albedo',
    regexes: [
        new RegExp(`Geometric\\s*Albedo\\s*=\\s*${NUM_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'visual_magnitude',
    regexes: [
        new RegExp(`Vis\\.\\s*magnitude\\s*V\\(1,0\\)\\s*=\\s*${NUM_REGEX}`, 'i'),
        new RegExp(`V\\(1,0\\)\\s*=\\s*${NUM_REGEX}`, 'i') // Satellite: V(1,0) = +11.8
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },

  // --- Orbital (Satellite) ---
  {
    key: 'semi_major_axis_km',
    regexes: [
        new RegExp(`Semi-major\\s*axis,\\s*a\\s*\\(km\\)\\s*=\\s*${NUM_REGEX}(?:\\(10\\^(\\d+)\\))?`, 'i')
    ],
    transform: (val, match) => {
        let v = parseFloat(val.replace('~', ''));
        if (match && match[2]) {
            v *= Math.pow(10, parseInt(match[2]));
        }
        return v;
    }
  },
  {
    key: 'orbital_period_days',
    regexes: [
        new RegExp(`Orbital\\s*period\\s*=\\s*${NUM_REGEX}\\s*d`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'eccentricity',
    regexes: [
        new RegExp(`Eccentricity,\\s*e\\s*=\\s*${NUM_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },
  {
    key: 'inclination_deg',
    regexes: [
        new RegExp(`Inclination,\\s*i\\s*\\(deg\\)\\s*=\\s*${NUM_REGEX}`, 'i')
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  },

  // --- Other ---

  {
    key: 'solar_constant_w_m2',
    regexes: [
        // For Sun: Solar constant (1 AU) = 1367.6 W/m^2
        new RegExp(`Solar\\s*constant\\s*\\(1\\s*AU\\)\\s*=\\s*${NUM_REGEX}`, 'i'),
        // For Planets: Solar Constant (W/m^2)         16.8        13.6        15.1
        // We'll handle the tabular one separately or try to catch the "Mean" value (3rd column usually)
        // Actually, let's handle the tabular one in a custom block below, as regex is hard for columns
    ],
    transform: (val) => parseFloat(val.replace('~', ''))
  }
];

function parsePhysicalProperties(text: string): Record<string, any> {
  const soeIndex = text.indexOf('$$SOE');
  const header = text.substring(0, soeIndex !== -1 ? soeIndex : text.length);
  
  const props: Record<string, any> = {};

  // 1. Process Definitions
  for (const def of PROPERTY_DEFINITIONS) {
      for (const regex of def.regexes) {
          const match = header.match(regex);
          if (match) {
              // If transform expects the full match array (for HMS parsing etc)
              if (def.transform) {
                  // If the regex has capture groups, match[1] is usually the value
                  // But for HMS, we need match[1], match[2], match[3]
                  // We pass the raw string of the first capture group as 'val' usually
                  // But let's pass the first capture group as val, and the full match as 2nd arg
                  props[def.key] = def.transform(match[1], match);
              } else {
                  props[def.key] = parseFloat(match[1].replace('~', ''));
              }
              break; // Found a match for this key, stop trying other regexes
          }
      }
  }

  // 2. Handle Tabular/Special Data
  
  // Solar Constant Table (Planets)
  //   Solar Constant (W/m^2)         16.8        13.6        15.1
  //                                 Perihelion  Aphelion    Mean
  // Sometimes headers are above or below.
  const solarTableMatch = header.match(/Solar\s*Constant\s*\(W\/m\^2\)\s*(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)/i);
  if (solarTableMatch) {
      // Usually Perihelion, Aphelion, Mean. But let's just grab the Mean (usually last?)
      // Wait, Saturn data: 16.8 (Peri), 13.6 (Aph), 15.1 (Mean). 
      // The headers "Perihelion Aphelion Mean" are ABOVE the values in Saturn raw data?
      // "Perihelion  Aphelion    Mean"
      // "Solar Constant (W/m^2)         16.8        13.6        15.1"
      // So 3rd value is Mean.
      props.solar_constant_w_m2 = parseFloat(solarTableMatch[3]);
  }

  // Planetary IR Table
  // Maximum Planetary IR (W/m^2)    4.7         4.5         4.6
  const irMatch = header.match(/Maximum\s*Planetary\s*IR\s*\(W\/m\^2\)\s*(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)/i);
  if (irMatch) {
      if (!props.planetary_ir) props.planetary_ir = {};
      props.planetary_ir.max = parseFloat(irMatch[3]); // Assuming Mean is last
  } else {
      // Try single value
      const maxIR = header.match(/Maximum\s*Planetary\s*IR\s*\(W\/m\^2\)\s*([~]?\d+(?:\.\d+)?)/i);
      if (maxIR) {
          if (!props.planetary_ir) props.planetary_ir = {};
          props.planetary_ir.max = parseFloat(maxIR[1].replace('~', ''));
      }
  }

  // Pole
  const poleMatch = header.match(/Pole\s*\(RA,DEC\),\s*deg\.\s*=\s*\(\s*([~]?\d+(?:\.\d+)?)\s*,\s*([~]?\d+(?:\.\d+)?)\s*\)/i);
  if (poleMatch) {
      props.pole_ra_deg = parseFloat(poleMatch[1].replace('~', ''));
      props.pole_dec_deg = parseFloat(poleMatch[2].replace('~', ''));
  }

  // Target primary  : Sun
  const primaryMatch = header.match(/Target\s*primary\s*:\s*(.*?)(?:\s*\{|$)/i);
  if (primaryMatch) {
      props.target_primary = primaryMatch[1].trim();
  }


  return props;
}


// --- JPL Date Parsing (TS port of physics-wasm/src/common/time.rs) ---

const MONTH_MAP: Record<string, number> = {
  Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6,
  Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12
};

function parseJplDate(dateStr: string): number | null {
  const cleaned = dateStr.trim()
    .replace(/^A\.D\.\s*/, '')
    .replace(/\s*TDB$/, '');
  const [datePart, timePart] = cleaned.split(' ');
  if (!datePart || !timePart) return null;
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const month = MONTH_MAP[monthStr];
  if (!month) return null;
  const [hStr, mStr, sStr] = timePart.split(':');
  let y = parseInt(yearStr), mo = month;
  if (mo <= 2) { y -= 1; mo += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const h = parseInt(hStr), mi = parseInt(mStr), s = parseFloat(sStr);
  const dayFrac = (h + mi / 60 + s / 3600) / 24;
  const jd = Math.floor(365.25 * (y + 4716))
           + Math.floor(30.6001 * (mo + 1))
           + parseInt(dayStr) + dayFrac + b - 1524.5;
  return jd;
}

function jdToUnixMs(jd: number): number {
  return (jd - 2440587.5) * 86400000;
}

// --- Snapshot Generation ---

async function generateJplSnapshot(): Promise<void> {
  const snapshotBodies: Record<string, { pos: number[]; vel: number[] }> = {};
  let epochDate: string | null = null;
  let epochJd: number | null = null;

  for (const body of ALL_BODIES) {
    if (!body.jplId) continue;
    try {
      const dataPath = path.join(FORMATTED_DATA_DIR, body.name, 'vector_data', 'data.json');
      const raw = await fs.readFile(dataPath, 'utf-8');
      const entries: Array<{ date: string; pos: number[]; vel: number[] }> = JSON.parse(raw);
      if (!entries.length) continue;
      const first = entries[0];
      snapshotBodies[body.name] = { pos: first.pos, vel: first.vel };
      if (!epochDate) {
        epochDate = first.date;
        epochJd = parseJplDate(first.date);
      }
    } catch {
      // body not yet pulled, skip
    }
  }

  if (!epochDate || epochJd === null || Object.keys(snapshotBodies).length === 0) {
    console.warn('No snapshot data found — skipping jplSnapshot.json generation.');
    return;
  }

  const snapshot = {
    epoch: {
      date: epochDate,
      jd: epochJd,
      unix_ms: jdToUnixMs(epochJd)
    },
    bodies: snapshotBodies
  };

  const outPath = path.join(__dirname, '../src/data/jplSnapshot.json');
  await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`jplSnapshot.json written: epoch=${epochDate}, bodies=${Object.keys(snapshotBodies).length}`);
}

// --- Main Processing ---

async function processBody(body: any) {
  if (!body.jplId) {
    console.warn(`Skipping ${body.name}: No JPL ID`);
    return;
  }

  const name = body.name;
  console.log(`Processing ${name}...`);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Define paths
  const dirs = {
    raw: {
      vector: path.join(RAW_DATA_DIR, name, 'vector_data'),
      observer: path.join(RAW_DATA_DIR, name, 'observer_data'),
    },
    formatted: {
      vector: path.join(FORMATTED_DATA_DIR, name, 'vector_data'),
      observer: path.join(FORMATTED_DATA_DIR, name, 'observer_data'),
      body: path.join(FORMATTED_DATA_DIR, name, 'body_data'),
    }
  };

  // Create directories
  for (const dir of Object.values(dirs.raw)) await fs.mkdir(dir, { recursive: true });
  for (const dir of Object.values(dirs.formatted)) await fs.mkdir(dir, { recursive: true });

  // 1. Vector Table Data (Trajectory)
  try {
    const raw = await fetchJPLData({
      format: 'text',
      COMMAND: `'${body.jplId}'`,
      OBJ_DATA: "'YES'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'VECTORS'",
      CENTER: "'@ssb'",
      START_TIME: `'${today}'`,
      STOP_TIME: `'${nextMonth}'`,
      STEP_SIZE: "'1h'",
      OUT_UNITS: "'KM-S'",
      REF_PLANE: "'ECLIPTIC'",
      CSV_FORMAT: "'NO'"
    });
    
    await fs.writeFile(path.join(dirs.raw.vector, 'raw.txt'), raw);
    const parsed = parseVectorTable(raw);
    await fs.writeFile(path.join(dirs.formatted.vector, 'data.json'), JSON.stringify(parsed, null, 2));
    
    // Extract Body Data from this response (it has the header)
    const bodyProps = parsePhysicalProperties(raw);
    await fs.writeFile(path.join(dirs.formatted.body, 'properties.json'), JSON.stringify(bodyProps, null, 2));

  } catch (e) {
    console.error(`Error fetching Vector data for ${name}:`, e);
  }

  // 2. Observer Table Data
  try {
    const raw = await fetchJPLData({
      format: 'text',
      COMMAND: `'${body.jplId}'`,
      OBJ_DATA: "'YES'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'OBSERVER'",
      CENTER: "'500'", // Geocentric (Earth)
      START_TIME: `'${today}'`,
      STOP_TIME: `'${nextMonth}'`,
      STEP_SIZE: "'1d'",
      QUANTITIES: "'1,9,20,23,24'", // RA/DEC, Mag, Dist, Sun-Obs-Targ angle, etc.
      CSV_FORMAT: "'NO'"
    });

    await fs.writeFile(path.join(dirs.raw.observer, 'raw.txt'), raw);
    const parsed = parseObserverTable(raw);
    await fs.writeFile(path.join(dirs.formatted.observer, 'data.json'), JSON.stringify(parsed, null, 2));

    // Also extract properties from Observer data header and merge
    const obsProps = parsePhysicalProperties(raw);
    
    // Read existing properties if any
    let existingProps = {};
    try {
      const existing = await fs.readFile(path.join(dirs.formatted.body, 'properties.json'), 'utf-8');
      existingProps = JSON.parse(existing);
    } catch (e) {
      // ignore
    }

    const mergedProps = { ...existingProps, ...obsProps };
    await fs.writeFile(path.join(dirs.formatted.body, 'properties.json'), JSON.stringify(mergedProps, null, 2));

  } catch (e) {
    console.error(`Error fetching Observer data for ${name}:`, e);
  }

  // 3. Elements Table Data (Orbital Elements)
  try {
    const raw = await fetchJPLData({
      format: 'text',
      COMMAND: `'${body.jplId}'`,
      OBJ_DATA: "'YES'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'ELEMENTS'",
      CENTER: "'@ssb'",
      START_TIME: `'${today}'`,
      STOP_TIME: `'${nextMonth}'`,
      STEP_SIZE: "'1d'",
      OUT_UNITS: "'KM-S'",
      CSV_FORMAT: "'NO'"
    });

    await fs.writeFile(path.join(dirs.raw.vector, 'elements_raw.txt'), raw); // Save in vector dir for now or new dir? Let's put in vector for simplicity or create elements dir.
    // Actually, let's just save the raw text and parse properties.
    // We can also parse the first line of elements to get current orbital parameters.
    
    // Extract properties from Elements data header and merge
    const elemProps = parsePhysicalProperties(raw);
    
    // Read existing properties
    let existingProps: Record<string, any> = {};
    try {
      const existing = await fs.readFile(path.join(dirs.formatted.body, 'properties.json'), 'utf-8');
      existingProps = JSON.parse(existing);
    } catch (e) {
      // ignore
    }

    // Parse actual elements from the table (just the first row for "current" elements)
    // ... (comments)
    
    const soeIndex = raw.indexOf('$$SOE');
    const eoeIndex = raw.indexOf('$$EOE');
    if (soeIndex !== -1 && eoeIndex !== -1) {
        const block = raw.substring(soeIndex, eoeIndex);
        // Simple regex to grab the first occurrence of each element
        const getElem = (key: string) => {
            const match = block.match(new RegExp(`${key}\\s*=\\s*([+-]?\\d+(?:\\.\\d+)?(?:E[+-]?\\d+)?)`, 'i'));
            return match ? parseFloat(match[1]) : null;
        };

        const elements = {
            eccentricity: getElem('EC'),
            periapsis_distance_km: getElem('QR'), // usually km if OUT_UNITS=KM-S
            inclination_deg: getElem('IN'),
            ascending_node_deg: getElem('OM'),
            argument_of_periapsis_deg: getElem('W'),
            mean_anomaly_deg: getElem('MA'),
            semi_major_axis_km: getElem('A'),
            apoapsis_distance_km: getElem('AD'),
            sidereal_period_days: getElem('PR'),
        };
        
        // Merge valid elements into orbital props
        if (!existingProps['orbital']) existingProps['orbital'] = {};
        Object.assign(existingProps['orbital'], Object.fromEntries(Object.entries(elements).filter(([_, v]) => v !== null)));
    }


    const mergedProps = { ...existingProps, ...elemProps };
    await fs.writeFile(path.join(dirs.formatted.body, 'properties.json'), JSON.stringify(mergedProps, null, 2));

  } catch (e) {
    console.error(`Error fetching Elements data for ${name}:`, e);
  }
}


async function main() {

  console.log(`Found ${ALL_BODIES.length} bodies.`);
  
  // Process in chunks
  const CHUNK_SIZE = 1;
  for (let i = 0; i < ALL_BODIES.length; i += CHUNK_SIZE) {
    const chunk = ALL_BODIES.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(processBody));
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await generateJplSnapshot();
  console.log('Done!');
}

main().catch(console.error);

