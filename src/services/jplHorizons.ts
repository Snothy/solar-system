import * as THREE from 'three';
import { dataCache } from './dataCache';

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

const BASE_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

export interface JPLData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  mass?: number;
  radius?: number;
  rotationPeriod?: number;
  meanTemperature?: number;
  axialTilt?: number;
  surfaceGravity?: number;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return response;
        console.warn(`Proxy ${proxy} failed with status ${response.status}`);
      } catch (e) {
        console.warn(`Proxy ${proxy} failed:`, e);
        lastError = e;
      }
    }
    // Wait before retrying (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
  throw lastError || new Error('All proxies failed');
}

export async function fetchBodyData(id: string, date: Date = new Date()): Promise<JPLData> {
  // Format date as YYYY-MM-DD
  const startTime = date.toISOString().split('T')[0];
  const stopTime = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${id}'`,
    OBJ_DATA: "'YES'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'@ssb'", // Solar System Barycenter
    START_TIME: `'${startTime}'`,
    STOP_TIME: `'${stopTime}'`,
    STEP_SIZE: "'1d'",
    OUT_UNITS: "'KM-S'",
    REF_PLANE: "'ECLIPTIC'" // Use Ecliptic plane (XY is orbit plane, Z is North)
  });

  const targetUrl = `${BASE_URL}?${params.toString()}`;

  try {
    const response = await fetchWithRetry(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const resultText = data.result;

    // Parse the result text to find the vector data
    // Look for $$SOE and $$EOE markers
    const soeIndex = resultText.indexOf('$$SOE');
    const eoeIndex = resultText.indexOf('$$EOE');

    if (soeIndex === -1 || eoeIndex === -1) {
      throw new Error('Ephemeris data not found in response');
    }

    const ephemBlock = resultText.substring(soeIndex, eoeIndex);
    
    // Extract X, Y, Z, VX, VY, VZ
    // Regex explanation:
    // X\s*=\s* : Match "X =" with optional whitespace
    // ( ... )  : Capture group
    // [+-]?    : Optional sign
    // \d+      : One or more digits
    // (?:\.\d+)? : Optional decimal part
    // (?:E[+-]?\d+)? : Optional exponent part
    const numRegex = /([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)/;
    
    const xMatch = ephemBlock.match(new RegExp(`X\\s*=\\s*${numRegex.source}`, 'i'));
    const yMatch = ephemBlock.match(new RegExp(`Y\\s*=\\s*${numRegex.source}`, 'i'));
    const zMatch = ephemBlock.match(new RegExp(`Z\\s*=\\s*${numRegex.source}`, 'i'));
    
    const vxMatch = ephemBlock.match(new RegExp(`VX\\s*=\\s*${numRegex.source}`, 'i'));
    const vyMatch = ephemBlock.match(new RegExp(`VY\\s*=\\s*${numRegex.source}`, 'i'));
    const vzMatch = ephemBlock.match(new RegExp(`VZ\\s*=\\s*${numRegex.source}`, 'i'));

    if (!xMatch || !yMatch || !zMatch || !vxMatch || !vyMatch || !vzMatch) {
      console.error('JPL Parse Error: Missing vector components', { resultText });
      throw new Error('Failed to parse vector data');
    }

    // Convert from km to meters (multiply by 1000)
    const pos = new THREE.Vector3(
      parseFloat(xMatch[1]) * 1000,
      parseFloat(yMatch[1]) * 1000,
      parseFloat(zMatch[1]) * 1000
    );

    const vel = new THREE.Vector3(
      parseFloat(vxMatch[1]) * 1000,
      parseFloat(vyMatch[1]) * 1000,
      parseFloat(vzMatch[1]) * 1000
    );

    // Check for NaNs
    if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z) || isNaN(vel.x) || isNaN(vel.y) || isNaN(vel.z)) {
      throw new Error('Parsed vectors contain NaN');
    }

    // Convert from J2000 Ecliptic frame (Horizons default) to our scene frame
    // x_scene = x_horizons, y_scene = z_horizons, z_scene = -y_horizons
    const scenePos = new THREE.Vector3(pos.x, pos.z, -pos.y);
    const sceneVel = new THREE.Vector3(vel.x, vel.z, -vel.y);

    // --- Parse Physical Properties ---
    // These are in the text BEFORE the $$SOE marker.
    const headerText = resultText.substring(0, soeIndex);
    
    const result: JPLData = { pos: scenePos, vel: sceneVel };

    // 1. Mass
    // Pattern: "Mass x10^24 (kg)= 5.972" or "Mass, 10^24 kg = 5.97"
    const massExpMatch = headerText.match(/Mass\s*x?10\^(\d+)\s*\(?kg\)?\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (massExpMatch) {
      const exponent = parseInt(massExpMatch[1]);
      const base = parseFloat(massExpMatch[2].replace('~', ''));
      result.mass = base * Math.pow(10, exponent);
    }

    // 2. Radius
    // Pattern: "Vol. Mean Radius (km) = 6371.01" or "Mean Radius (km) = ..."
    const radiusMatch = headerText.match(/(?:Vol\.\s*)?Mean\s*Radius\s*\(km\)\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (radiusMatch) {
      // Convert km to meters
      result.radius = parseFloat(radiusMatch[1].replace('~', '')) * 1000;
    }

    // 3. Rotation Period
    // Pattern: "Mean sidereal day, hr = 23.934" or "Rot. Rate (rad/s) = ..."
    // Let's look for "Mean sidereal day, hr" first.
    const rotPeriodMatch = headerText.match(/Mean\s*sidereal\s*day,\s*hr\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (rotPeriodMatch) {
      result.rotationPeriod = parseFloat(rotPeriodMatch[1].replace('~', ''));
    } else {
        // Try Rot Rate in rad/s
        const rotRateMatch = headerText.match(/Rot\.\s*Rate\s*\(rad\/s\)\s*=\s*([~]?\d+(?:\.\d+)?E?[+-]?\d*)/i);
        if (rotRateMatch) {
            const rads = parseFloat(rotRateMatch[1].replace('~', ''));
            // Convert rad/s to hours per rotation
            // T = 2*pi / w
            // Period in seconds = 2*pi / rads
            // Period in hours = (2*pi / rads) / 3600
            if (rads !== 0) {
                result.rotationPeriod = ((2 * Math.PI) / rads) / 3600;
            }
        }
    }

    // 4. Temperature
    // Pattern: "Mean surface temp (Ts), K= 287.6"
    const tempMatch = headerText.match(/Mean\s*surface\s*temp\s*\(Ts\),\s*K\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (tempMatch) {
      result.meanTemperature = parseFloat(tempMatch[1].replace('~', ''));
    }

    // 5. Axial Tilt (Obliquity)
    // Pattern: "Obliquity to orbit, deg = 23.439"
    // Match "Obliquity to orbit" OR just "Obliquity"
    const tiltMatch = headerText.match(/Obliquity(?:.*?)deg\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (tiltMatch) {
      result.axialTilt = parseFloat(tiltMatch[1].replace('~', ''));
    }

    // 6. Surface Gravity
    // Pattern: "g_e, m/s^2 (equatorial) = 9.78"
    const gravMatch = headerText.match(/g_e,\s*m\/s\^2\s*\(equatorial\)\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (gravMatch) {
      result.surfaceGravity = parseFloat(gravMatch[1].replace('~', ''));
    }

    return result;

  } catch (error) {
    console.error(`Error fetching data for object ${id}:`, error);
    throw error;
  }
}



export async function fetchMultipleBodies(
  ids: string[], 
  date: Date = new Date(),
  onProgress?: (id: string, status: 'loading' | 'complete' | 'error') => void
): Promise<Record<string, JPLData>> {
  const results: Record<string, JPLData> = {};
  const dateStr = date.toISOString().split('T')[0];
  const queue = [...ids];
  const CONCURRENCY_LIMIT = 5;
  let activeRequests = 0;

  return new Promise((resolve) => {
    const processQueue = async () => {
      if (queue.length === 0 && activeRequests === 0) {
        resolve(results);
        return;
      }

      while (queue.length > 0 && activeRequests < CONCURRENCY_LIMIT) {
        const id = queue.shift()!;
        
        // Check cache first
        const cached = dataCache.get(id, dateStr);
        if (cached) {
          // Reconstruct Vectors because JSON.parse makes them plain objects
          const reconstructed: JPLData = {
            ...cached,
            pos: new THREE.Vector3(cached.pos.x, cached.pos.y, cached.pos.z),
            vel: new THREE.Vector3(cached.vel.x, cached.vel.y, cached.vel.z)
          };
          
          results[id] = reconstructed;
          onProgress?.(id, 'complete');
          // Process next immediately without taking up a request slot
          processQueue(); 
          continue;
        }

        activeRequests++;
        onProgress?.(id, 'loading');

        fetchBodyData(id, date)
          .then(data => {
            results[id] = data;
            dataCache.set(id, dateStr, data);
            onProgress?.(id, 'complete');
          })
          .catch(() => {
            onProgress?.(id, 'error');
          })
          .finally(() => {
            activeRequests--;
            processQueue();
          });
      }
    };

    processQueue();
  });
}

function parseHorizonsText(text: string): JPLData {
    const soeIndex = text.indexOf('$$SOE');
    const eoeIndex = text.indexOf('$$EOE');

    if (soeIndex === -1 || eoeIndex === -1) {
      throw new Error('Ephemeris data not found');
    }

    const ephemBlock = text.substring(soeIndex, eoeIndex);
    const headerText = text.substring(0, soeIndex);

    const numRegex = /([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)/;
    
    const xMatch = ephemBlock.match(new RegExp(`X\\s*=\\s*${numRegex.source}`, 'i'));
    const yMatch = ephemBlock.match(new RegExp(`Y\\s*=\\s*${numRegex.source}`, 'i'));
    const zMatch = ephemBlock.match(new RegExp(`Z\\s*=\\s*${numRegex.source}`, 'i'));
    
    const vxMatch = ephemBlock.match(new RegExp(`VX\\s*=\\s*${numRegex.source}`, 'i'));
    const vyMatch = ephemBlock.match(new RegExp(`VY\\s*=\\s*${numRegex.source}`, 'i'));
    const vzMatch = ephemBlock.match(new RegExp(`VZ\\s*=\\s*${numRegex.source}`, 'i'));

    if (!xMatch || !yMatch || !zMatch || !vxMatch || !vyMatch || !vzMatch) {
      throw new Error('Failed to parse vector data');
    }

    const pos = new THREE.Vector3(
      parseFloat(xMatch[1]) * 1000,
      parseFloat(yMatch[1]) * 1000,
      parseFloat(zMatch[1]) * 1000
    );

    const vel = new THREE.Vector3(
      parseFloat(vxMatch[1]) * 1000,
      parseFloat(vyMatch[1]) * 1000,
      parseFloat(vzMatch[1]) * 1000
    );

    // Convert frame
    const scenePos = new THREE.Vector3(pos.x, pos.z, -pos.y);
    const sceneVel = new THREE.Vector3(vel.x, vel.z, -vel.y);

    const result: JPLData = { pos: scenePos, vel: sceneVel };

    // Physical properties
    const massExpMatch = headerText.match(/Mass\s*x?10\^(\d+)\s*\(?kg\)?\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (massExpMatch) {
      const exponent = parseInt(massExpMatch[1]);
      const base = parseFloat(massExpMatch[2].replace('~', ''));
      result.mass = base * Math.pow(10, exponent);
    }

    const radiusMatch = headerText.match(/(?:Vol\.\s*)?Mean\s*Radius\s*\(km\)\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (radiusMatch) {
      result.radius = parseFloat(radiusMatch[1].replace('~', '')) * 1000;
    }

    const rotPeriodMatch = headerText.match(/Mean\s*sidereal\s*day,\s*hr\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (rotPeriodMatch) {
      result.rotationPeriod = parseFloat(rotPeriodMatch[1].replace('~', ''));
    } else {
        const rotRateMatch = headerText.match(/Rot\.\s*Rate\s*\(rad\/s\)\s*=\s*([~]?\d+(?:\.\d+)?E?[+-]?\d*)/i);
        if (rotRateMatch) {
            const rads = parseFloat(rotRateMatch[1].replace('~', ''));
            if (rads !== 0) {
                result.rotationPeriod = ((2 * Math.PI) / rads) / 3600;
            }
        }
    }

    const tempMatch = headerText.match(/Mean\s*surface\s*temp\s*\(Ts\),\s*K\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (tempMatch) {
      result.meanTemperature = parseFloat(tempMatch[1].replace('~', ''));
    }

    const tiltMatch = headerText.match(/Obliquity(?:.*?)deg\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (tiltMatch) {
      result.axialTilt = parseFloat(tiltMatch[1].replace('~', ''));
    }

    const gravMatch = headerText.match(/g_e,\s*m\/s\^2\s*\(equatorial\)\s*=\s*([~]?\d+(?:\.\d+)?)/i);
    if (gravMatch) {
      result.surfaceGravity = parseFloat(gravMatch[1].replace('~', ''));
    }

    return result;
}
