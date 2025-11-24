// Physical constants
export const G = 6.67430e-11;  // Gravitational constant (m^3 kg^-1 s^-2)
export const AU = 149.6e9;     // Astronomical Unit (meters)
export const SCALE = 1e-9;     // Scene scale: 1 unit = 1 million km

// Time constants
export const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
export const MS_PER_DAY = 86400000;  // Milliseconds per day
export const START_DATE = new Date();

// Simulation defaults
export const DEFAULT_VISUAL_SCALE = 1000;
export const DEFAULT_TIME_STEP = 1;  // Simulation seconds per frame
export const TRAIL_LENGTH = 3000;    // Number of trail points

// UI constants
export const SPEED_PRESETS = {
  REALTIME: 0,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
} as const;
