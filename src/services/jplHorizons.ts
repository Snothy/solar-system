import * as THREE from "three";

export interface JPLData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  gm?: number;
  equatorialRadius?: number;
  jRefRadius?: number;
  radii?: { x: number; y: number; z: number };
  rotationPeriod?: number;
  meanTemperature?: number;
  axialTilt?: number;
  surfaceGravity?: number;
  refDate?: string; // The exact date of the data point

  // Extended Properties
  escapeSpeed?: number;

  massLayers?: Record<string, number>;
  gravityField?: Record<string, number>;
  orbital?: Record<string, any>;
  surface?: Record<string, any>;

  // New Properties from Enhanced Extraction
  meanDensity?: number;
  volumeKm3?: number;
  albedo?: number;
  photosphereTemperature?: number;
  rotationPeriodHours?: number;

  flatness?: number;
  obliquity?: number;
  poleRA?: number;
  poleDec?: number;

  // Exhaustive Properties
  targetPrimary?: string;
  angularDiameter1AUArcsec?: number;
  visualMagnitude?: number;
  meanDailyMotionDegD?: number;
  rotationRateRadS?: number;
  arocheIceRp?: number;

  // Nested Structures
  planetaryIR?: {
    max?: number;
    min?: number;
  };

  solar?: {
    solar_constant?: number;
    luminosity?: number;
    mass_energy_conversion_rate_kg_s?: number;
    sunspot_cycle_years?: number;
    sunspot_min_year?: string;
    radius_km?: number;
  };

  motion?: {
    speed_kms?: number;
    nearby_stars_speed_kms?: number;
    nearby_stars_apex_ra?: number;
    nearby_stars_apex_dec?: number;
    cbr_speed_kms?: number;
    cbr_apex_l?: number;
    cbr_apex_b?: number;
    apex_ra?: number;
    apex_dec?: number;
  };

  atmosphere?: {
    photosphere_temperature_bottom?: number;
    photosphere_temperature_top?: number;
    photospheric_depth_km?: number;
    chromospheric_depth_km?: number;
  };
}

import { SOLAR_SYSTEM_DATA } from "../data/solarSystem";
import { EXTENDED_BODIES } from "../data/extendedBodies";

// Create a map for ID -> Name lookup
const BODY_ID_MAP = new Map<string, string>();
[...SOLAR_SYSTEM_DATA, ...EXTENDED_BODIES].forEach((b) => {
  if (b.jplId) BODY_ID_MAP.set(b.jplId, b.name);
});

async function fetchLocalData(
  name: string,
  date: Date,
): Promise<JPLData | null> {
  try {
    // Fetch vector data
    // CHANGED: Fetch from /formatted_data/
    const vecRes = await fetch(`/formatted_data/${name}/vector_data/data.json`);
    if (!vecRes.ok) return null;
    const vecData = await vecRes.json();

    // Fetch properties
    // CHANGED: Fetch from /formatted_data/
    const propsRes = await fetch(
      `/formatted_data/${name}/body_data/properties.json`,
    );
    let props: Record<string, any> = {};
    if (propsRes.ok) {
      props = await propsRes.json();
    }

    // Find closest data point (Exact Match Strategy)
    // The data is sorted by date.
    // We need to parse the dates.
    // Format: "A.D. 2025-Nov-28 00:00:00.0000 TDB"

    let closestPoint = null;
    let minDiff = Infinity;
    const targetTime = date.getTime();

    for (const point of vecData) {
      // Parse date string manually or use Date.parse if format allows
      // "A.D. 2025-Nov-28 00:00:00.0000 TDB" -> "2025-Nov-28 00:00:00"
      const cleanDate = point.date.replace("A.D. ", "").replace(" TDB", "");
      const pointTime = new Date(cleanDate).getTime();

      const diff = Math.abs(pointTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }

    if (!closestPoint) return null;

    const pos = new THREE.Vector3(
      closestPoint.pos[0],
      closestPoint.pos[1],
      closestPoint.pos[2],
    );
    const vel = new THREE.Vector3(
      closestPoint.vel[0],
      closestPoint.vel[1],
      closestPoint.vel[2],
    );

    // Convert to scene frame
    const scenePos = new THREE.Vector3(pos.x, pos.z, -pos.y);
    const sceneVel = new THREE.Vector3(vel.x, vel.z, -vel.y);

    return {
      pos: scenePos,
      vel: sceneVel,

      // Physical Properties
      // gm: props["gm_km3_s2"],
      // Use mean radius for generic radius, convert km -> m
      // equatorialRadius:
      //   (props["mean_radius_km"] ||
      //     props["vol_mean_radius_km"] ||
      //     props["equatorial_radius_km"]) * 1000,

      meanTemperature: props["mean_temperature_k"],
      surfaceGravity: props["surface_gravity_m_s2"],
      refDate: closestPoint.date,

      // Extended Properties

      escapeSpeed: props["escape_speed_km_s"]
        ? props["escape_speed_km_s"] * 1000
        : undefined,

      massLayers: props["mass_layers"],
      gravityField: props["gravity_field"],
      orbital: {
        ...props["orbital"],
        // Prioritize root properties (Header data, usually planetocentric for moons)
        semi_major_axis_km:
          props["semi_major_axis_km"] || props["orbital"]?.semi_major_axis_km,
        sidereal_period_days:
          props["orbital_period_days"] ||
          props["orbital"]?.sidereal_period_days,
        eccentricity: props["eccentricity"] || props["orbital"]?.eccentricity,
        inclination_deg:
          props["inclination_deg"] || props["orbital"]?.inclination_deg,
      },

      surface: props["surface"],

      // New Properties
      meanDensity: props["density_g_cm3"],
      volumeKm3: props["volume_km3"], // or vol_mean_radius_km derived? props has volume_km3 if parsed
      albedo: props["albedo"],
      photosphereTemperature: props["photosphere_temperature"],
      rotationPeriodHours: props["sidereal_rotation_period_hours"],
      flatness: props["flattening"],
      obliquity: props["obliquity_deg"],
      poleRA: props["pole_ra_deg"],
      poleDec: props["pole_dec_deg"],

      // Exhaustive Properties
      targetPrimary: props["target_primary"],
      angularDiameter1AUArcsec: props["angular_diameter_1au_arcsec"],
      visualMagnitude: props["visual_magnitude"],
      meanDailyMotionDegD: props["mean_daily_motion_deg_d"],
      rotationRateRadS: props["rotation_rate_rad_s"],
      arocheIceRp: props["aroche_ice_rp"],

      // Nested Structures
      planetaryIR: props["planetary_ir"],
      solar: props["solar"],
      motion: props["motion"],
      atmosphere: props["atmosphere"],
    } as JPLData;
  } catch (e) {
    console.warn(`Failed to fetch local data for ${name}`, e);
    return null;
  }
}

export async function fetchMultipleBodies(
  ids: string[],
  date: Date = new Date(),
  onProgress?: (id: string, status: "loading" | "complete" | "error") => void,
  concurrency: number = 5,
): Promise<Record<string, JPLData>> {
  const results: Record<string, JPLData> = {};
  const queue = [...ids];
  const CONCURRENCY_LIMIT = concurrency;
  let activeRequests = 0;

  return new Promise((resolve) => {
    const processQueue = async () => {
      if (queue.length === 0 && activeRequests === 0) {
        resolve(results);
        return;
      }

      while (queue.length > 0 && activeRequests < CONCURRENCY_LIMIT) {
        const id = queue.shift()!;

        activeRequests++;
        onProgress?.(id, "loading");

        // Try local fetch first
        const name = BODY_ID_MAP.get(id);
        let localData = null;
        if (name) {
          localData = await fetchLocalData(name, date);
        }

        if (localData) {
          results[id] = localData;
          onProgress?.(id, "complete");
        } else {
          console.warn(`No local data found for ${id} (${name})`);
          onProgress?.(id, "error");
        }
        activeRequests--;
        processQueue();
      }
    };

    processQueue();
  });
}
