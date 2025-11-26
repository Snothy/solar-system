// Physical constants
export const G = 6.67430e-11;  // Gravitational constant (m^3 kg^-1 s^-2)
export const AU = 149.6e9;     // Astronomical Unit (meters)
export const SCALE = 1e-9;     // Scene scale: 1 unit = 1 million km
export const C_LIGHT = 299792458; // Speed of light (m/s)

// Time constants
export const J2000 = new Date('2000-01-01T12:00:00Z').getTime();
export const MS_PER_DAY = 86400000;  // Milliseconds per day
export const START_DATE = new Date();

// Time conversion constants (for TDB)
export const TT_TAI_OFFSET = 32.184;    // TT - TAI in seconds
export const LEAP_SECONDS_2024 = 37;    // UTC - TAI as of 2024-01-01 (update periodically)
export const J2000_JD = 2451545.0;      // Julian Date of J2000 epoch

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

// Atmospheric scale heights (km) - for drag calculations
export const SCALE_HEIGHTS = {
  Earth: 8.5,
  Mars: 11.1,
  Venus: 15.9,
  Titan: 40.0
} as const;

// Tidal dissipation factors (dimensionless)
export const TIDAL_Q = {
  Earth: 12,      // Earth's Q for lunar tides
  Moon: 30,       // Moon's Q
  Mars: 100,      // Mars' Q for Phobos
  Phobos: 100,
  Deimos: 100
} as const;

// Solar properties
export const SOLAR_LUMINOSITY = 3.828e26; // Watts
export const SOLAR_MASS_LOSS = 4.26e9;    // kg/s (from fusion + solar wind)
