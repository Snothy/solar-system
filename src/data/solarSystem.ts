import type { CelestialBodyData } from "../types";
import { EXTENDED_BODIES } from "./extendedBodies";

const AU = 1.495978707e11;

export const SOLAR_SYSTEM_DATA: CelestialBodyData[] = [
  {
    name: "Sun",
    // GM from Horizons: 132712440041.93938 km³/s² -> m³/s²
    gm: 132712440041.93938e9,

    // IAU 2015 Nominal Solar Radius
    equatorialRadius: 695700000.0,
    jRefRadius: 695700000.0,

    radii: {
      x: 695700000.0,
      y: 695700000.0, // Sun is effectively spherical (Flatness = 0.00005)
      z: 695700000.0,
    },

    color: 0xffffff,
    emissive: 0xffaa00,
    texture: "/Sun.jpg",
    type: "star",

    // Carrington sidereal rotation (25.38 days * 24)
    rotationPeriod: 609.12,
    axialTilt: 7.25,
    meanTemperature: 5772,

    // Updated from your JPL snippet
    surfaceGravity: 274.0,

    jplId: "10",

    // Solar quadrupole moment (J2)
    J: [2.2e-7],

    poleRA: 286.13,
    poleDec: 63.87,
    W0: 84.176,
    Wdot: 14.1844,
  },
  {
    name: "Mercury",
    // GM from Horizons 2024: 22031.86855 km³/s² -> m³/s²
    gm: 22031.86855e9,
    // Equatorial radius (Re) used as primary radius
    equatorialRadius: 2440.53e3,
    // Reference radius specifically for J-harmonics (usually Re)
    jRefRadius: 2440.53e3,
    // Using Re for x/z and Volumetric Mean or calculated Polar for y
    radii: { x: 2440.53e3, y: 2439.4e3, z: 2440.53e3 },
    color: 0xaaaaaa,
    texture: "/Mercury.jpg",
    rotationPeriod: 1407.5112, // Hours (58.6463 days)
    axialTilt: 0.035, // 2.11 arcmin is approx 0.035 degrees
    meanTemperature: 440,
    surfaceGravity: 3.701,
    jplId: "199",
    type: "planet",
    // J2 value from MESSENGER data is approx 5.03104e-5
    J: [5.03104e-5],
    c22: 8.088e-6,
    s22: 0.0,
    tidal: { k2: 0.45, tidalQ: 50 }, // Updated k2 to more recent MESSENGER estimates (0.45-0.57)
    poleRA: 281.01,
    poleDec: 61.45,
    W0: 329.5469,
    Wdot: 6.138547,
    albedo: 0.106,
    rel_a: 0.387098 * AU,
    rel_e: 0.20563,
    rel_i: 7.005,
  },

  {
    name: "Venus",
    // GM from Horizons: 324858.592 km³/s² -> m³/s²
    gm: 324858.592e9,
    equatorialRadius: 6051.893e3,
    jRefRadius: 6051.893e3,
    // x/z = Equatorial, y = Volumetric Mean (6051.84 km)
    radii: { x: 6051.893e3, y: 6051.84e3, z: 6051.893e3 },
    color: 0xe3bb76,
    texture: "/Venus.jpg",
    cloudMap: "/VenusAtmosphere.jpg",
    cloudTransparency: 1.0,
    rotationPeriod: -5832.4436,
    axialTilt: 177.3,
    meanTemperature: 735,
    surfaceGravity: 8.87,
    jplId: "299",
    type: "planet",
    // J coefficients (Zonal Harmonics)
    J: [4.458e-6],
    c22: -1.349e-6,
    s22: -0.232e-6,
    tidal: { k2: 0.25, tidalQ: 12 },
    poleRA: 272.76,
    poleDec: 67.16,
    W0: 160.2,
    Wdot: -1.481335,
    hasAtmosphere: true,
    surfacePressure: 9.0e6, // 90 bar
    scaleHeight: 15.9,
    dragCoefficient: 2.2,
    albedo: 0.65,
    rel_a: 0.723332 * AU,
    rel_e: 0.0067,
    rel_i: 3.39458,
  },

  {
    name: "Earth",
    // GM from Horizons: 398600.435436 km³/s² -> m³/s²
    gm: 398600.435436e9,
    // Best-fit Equatorial Radius
    equatorialRadius: 6378137.0,
    // IERS 2010 standard reference radius for gravity harmonics
    jRefRadius: 6378136.3,
    radii: {
      x: 6378137.0,
      y: 6356752.0, // Polar axis (flattened)
      z: 6378137.0,
    },
    color: 0x2233ff,
    texture: "/Earth.jpg",
    // Mean sidereal day (hours)
    rotationPeriod: 23.9344695944,
    axialTilt: 23.4392911,
    meanTemperature: 287.6,
    surfaceGravity: 9.7803267715, // Using g_e (equatorial) for surface gravity
    jplId: "399",
    type: "planet",
    // IERS 2010 Zonal Harmonics
    J: [
      0.00108262545, // J2
      -2.5327e-6, // J3
      -1.6196e-6, // J4
    ],
    // Sectorial/Tesseral Harmonics
    c22: 2.439e-6,
    s22: -1.4e-6,
    tidal: { k2: 0.299, tidalQ: 12 },
    // Pole definitions relative to J2000
    poleRA: 0.0,
    poleDec: 90.0,
    W0: 100.21,
    Wdot: 360.9856235,
    precessionRate: 50.29,
    nutationAmplitude: 9.2,
    albedo: 0.367,
    hasAtmosphere: true,
    surfacePressure: 101325, // 1.0 bar in Pa
    scaleHeight: 8500,
    dragCoefficient: 2.2,
    normalMap: "/EarthNormal.jpg",
    emissiveMap: "/EarthNight.jpg",
    cloudMap: "/EarthClouds.jpg",
    cloudTransparency: 0.8,
    rel_a: 1.00000011 * AU,
    rel_e: 0.01671022,
    rel_i: 0.00005,
  },

  {
    name: "Moon",
    // GM from Horizons: 4902.800066 km³/s² -> m³/s²
    gm: 4902.800066e9,

    // Best-fit Equatorial Radius (IAU)
    equatorialRadius: 1738100.0,

    // Reference radius for Gravity Harmonics (Radius gravity from snippet)
    jRefRadius: 1738000.0,

    radii: {
      x: 1738100.0, // Toward Earth
      y: 1736000.0, // Polar (Assuming Y-up)
      z: 1737400.0, // Sideways (Orbital direction)
    },

    color: 0xcccccc,
    texture: "/Moon.jpg",
    parent: "Earth",

    // Precise rotation for tidal lock (~27.32 days)
    rotationPeriod: 655.7198,
    axialTilt: 6.67,
    meanTemperature: 220,

    // Surface acceleration from snippet
    surfaceGravity: 1.62,

    jplId: "301",
    type: "moon",

    // Zonal Harmonics (J2)
    J: [2.0321e-4],
    // Sectorial Harmonics
    c22: 2.2431e-5,
    s22: 2.74e-6,

    // Tidal parameters from GRAIL/Lunar Laser Ranging
    tidal: { k2: 0.0202, tidalQ: 26.5 },

    // Rotation parameters relative to J2000
    poleRA: 266.86,
    poleDec: 65.64,
    W0: 38.3213,
    Wdot: 13.17635815,
    albedo: 0.12,

    rel_a: 384400e3,
    rel_e: 0.0549,
    rel_i: 5.145,
  },
  {
    name: "Mars",
    // GM from Horizons 2025: 42828.375662 km³/s² -> m³/s²
    gm: 42828.375662e9,

    // Best-fit Equatorial Radius (km)
    equatorialRadius: 3396190.0,

    // Standard MRO110C/IAU Gravity Reference Radius
    jRefRadius: 3396000.0,

    radii: {
      x: 3396190.0,
      y: 3376190.0, // Calculated via Flattening: Re * (1 - f)
      z: 3396190.0,
    },

    color: 0xff4500,
    texture: "/Mars.jpg",
    rotationPeriod: 24.622962,
    axialTilt: 25.19,
    meanTemperature: 210,

    // Equatorial gravity from snippet
    surfaceGravity: 3.71,

    jplId: "499",
    type: "planet",

    // Zonal Harmonics: J2, J3, J4
    J: [1.960454e-3, 3.145e-5, -1.54477e-5],

    // Sectorial/Tesseral Harmonics
    c22: -6.3e-5,
    s22: 3e-5,

    tidal: { k2: 0.148, tidalQ: 92 },

    poleRA: 317.68143,
    poleDec: 52.88627,
    poleRA_rate: -0.10844326,
    poleDec_rate: -0.06134706,
    W0: 176.049863,
    Wdot: 350.891983,

    hasAtmosphere: true,
    surfacePressure: 560, // 0.0056 bar
    scaleHeight: 11100, // 11.1 km
    dragCoefficient: 2.2,
    albedo: 0.15,

    rel_a: 1.523679 * AU,
    rel_e: 0.0934,
    rel_i: 1.85,
  },

  {
    name: "Phobos",
    // GM from JPL (MAR097): 0.0007087 km³/s² -> m³/s²
    gm: 708700.0,

    // Primary Equatorial Reference (Longest Axis 'a')
    equatorialRadius: 13000.0,

    // Standard Gravity Reference Radius for Phobos Harmonics
    jRefRadius: 13000.0,

    radii: {
      x: 13000.0, // Towards Mars (Longest axis)
      y: 11400.0, // Direction of motion (Intermediate axis)
      z: 9100.0, // Polar axis (Shortest axis)
    },

    color: 0x888888,
    texture: "/Phobos.png",
    parent: "Mars",

    // Synchronous rotation (matches orbital period ~7.65 hours)
    rotationPeriod: 7.6538455,
    axialTilt: 0.01, // Nearly zero relative to Mars' equator
    meanTemperature: 233,

    // Average surface gravity (highly variable across the surface)
    surfaceGravity: 0.0057,

    jplId: "401",
    type: "moon",

    // Gravitational Harmonics (Note the very high values due to irregularity)
    J: [0.105],
    c22: 0.015,
    s22: 0.0,

    tidal: { k2: 0.04, tidalQ: 100 },

    // Pole follows Mars' orientation closely
    poleRA: 317.67071657,
    poleDec: 52.88627266,
    poleRA_rate: -0.10844326,
    poleDec_rate: -0.06134706,

    W0: 35.1877444,
    Wdot: 1128.84475928,

    albedo: 0.071,
    thermalInertia: 25,

    rel_a: 9377.2e3,
    rel_e: 0.0151,
    rel_i: 1.082,
  },

  {
    name: "Deimos",
    // GM from 2025 JPL Physical Data: 1.80e15 kg * G
    // 1.80e15 * 6.67430e-11 = 120137.4 m³/s²
    gm: 120137.4,

    // Primary Equatorial Reference (Longest Axis 'a')
    equatorialRadius: 7800.0,

    // Standard Gravity Reference Radius for Deimos
    jRefRadius: 7800.0,

    radii: {
      x: 7800.0, // Toward Mars (Longest)
      y: 5100.0, // Polar axis (Shortest axis - assuming Y-up)
      z: 6000.0, // Intermediate axis
    },

    color: 0x777777,
    texture: "/Deimos.png",
    parent: "Mars",

    // Synchronous rotation (~1.263 days)
    rotationPeriod: 30.312,
    axialTilt: 0,
    meanTemperature: 233,

    // Surface accel from JPL data
    surfaceGravity: 0.003,

    jplId: "402",
    type: "moon",

    // Gravitational Harmonics (J2)
    J: [0.1079],
    c22: 0.03081,
    s22: 0.0,

    tidal: { k2: 0.02, tidalQ: 100 },

    // Pole position
    poleRA: 316.65705808,
    poleDec: 53.50992033,
    poleRA_rate: -0.10518014,
    poleDec_rate: -0.05979094,

    W0: 79.39932954,
    Wdot: 285.16188899,

    albedo: 0.06,
    thermalInertia: 25,

    rel_a: 23463.2e3,
    rel_e: 0.00033,
    rel_i: 1.791,
  },

  {
    name: "Jupiter",
    // GM from Horizons 2025: 126686531.900 km³/s² -> m³/s²
    gm: 126686531.9e9,

    // Equatorial radius at 1-bar pressure level
    equatorialRadius: 71492000.0,

    // Standard Juno/IAU Reference for J-harmonics
    jRefRadius: 71492000.0,

    radii: {
      x: 71492000.0,
      y: 66854000.0, // Polar radius from snippet
      z: 71492000.0,
    },

    color: 0xd8ca9d,
    texture: "/Jupiter.jpg",

    // System III Sidereal rotation: 9h 55m 29.711s
    rotationPeriod: 9.924919722,
    axialTilt: 3.13,
    meanTemperature: 165,

    // Equatorial gravity (ge) from JPL data
    surfaceGravity: 24.78652,

    jplId: "599",
    type: "planet",

    // Juno High-order Zonal Harmonics (J2, J3, J4, J5, J6...)
    // Note: J3, J5, J7 etc. are non-zero but usually ignored in simple models
    J: [
      1.4696572e-2, // J2
      0.0, // J3
      -5.87146e-4, // J4
      0.0, // J5
      3.4255e-5, // J6
      0.0, // J7
      -2.426e-6, // J8
      0.0, // J9
      1.72e-7, // J10
    ],

    tidal: { k2: 0.565, tidalQ: 36000 },

    poleRA: 268.057,
    poleDec: 64.495,
    poleRA_rate: -0.006499,
    poleDec_rate: 0.0,
    W0: 284.95,
    Wdot: 870.536,

    rel_a: 5.204267 * AU,
    rel_e: 0.04839,
    rel_i: 1.305,
  },

  {
    name: "Io",
    // GM from Horizons: 5959.9155 km³/s² -> m³/s²
    gm: 5959.9155e9,

    // Primary Equatorial Reference (Longest axis 'a')
    equatorialRadius: 1829400.0,

    // Standard Gravity Reference Radius for Io harmonics
    jRefRadius: 1829400.0,

    radii: {
      x: 1829400.0, // Longest (Sub-Jupiter point)
      y: 1815700.0, // Polar axis (Assuming Y-up)
      z: 1819300.0, // Intermediate axis (Orbital direction)
    },

    color: 0xfbffa3,
    texture: "/Io.jpg",
    parent: "Jupiter",

    // Synchronous rotation (~1.769 days)
    rotationPeriod: 42.459306,
    axialTilt: 0.0,
    meanTemperature: 110,

    // Surface gravity matches GM/R_mean^2
    surfaceGravity: 1.796,

    jplId: "501",
    type: "moon",

    // Zonal and Sectorial Harmonics (high due to tidal stretching)
    J: [1.8459e-3],
    c22: 5.5865e-4,

    // High k2 value due to molten interior
    tidal: { k2: 1.3, tidalQ: 36 },

    // Pole aligns closely with Jupiter's pole
    poleRA: 268.05,
    poleDec: 64.5,

    // Updated orbital data for J2000
    rel_a: 422000e3,
    rel_e: 0.00472,
    rel_i: 0.0375,
  },

  {
    name: "Europa",
    // GM from Horizons: 3202.7121 km³/s² -> m³/s²
    gm: 3202.7121e9,

    // Best-fit Equatorial Radius (Longest axis 'a')
    equatorialRadius: 1562600.0,

    // Standard Gravity Reference Radius (Volumetric Mean)
    jRefRadius: 1560800.0,

    radii: {
      x: 1562600.0, // Longest axis (Sub-Jupiter point)
      y: 1559500.0, // Polar axis (Assuming Y-up)
      z: 1560300.0, // Intermediate axis (Orbital direction)
    },

    color: 0xc9c0bb,
    texture: "/Europa.jpg",
    parent: "Jupiter",

    // Synchronous rotation (~3.55 days)
    rotationPeriod: 85.2283,
    axialTilt: 0.1,
    meanTemperature: 102,

    // Surface gravity (GM / R_mean²)
    surfaceGravity: 1.315,

    jplId: "502",
    type: "moon",

    // Zonal Harmonics (J2)
    J: [4.355e-4],

    // Sectorial Harmonics (C22)
    c22: 1.315e-4,

    // Tidal parameters (k2 reflects the subsurface ocean)
    tidal: { k2: 0.26, tidalQ: 100 },

    // Pole aligns with Jupiter's spin axis
    poleRA: 268.08,
    poleDec: 64.51,

    // Updated orbital data from snippet
    rel_a: 671000e3,
    rel_e: 0.00947, // Refined from J2000 mean elements
    rel_i: 0.462,
  },

  {
    name: "Ganymede",
    // GM from Horizons: 9887.8328 km³/s² -> m³/s²
    gm: 9887.8328e9,

    // Best-fit Equatorial Radius (Longest axis 'a')
    equatorialRadius: 2634100.0,

    // Standard Gravity Reference Radius (Volumetric Mean)
    jRefRadius: 2631200.0,

    radii: {
      x: 2634100.0, // Longest (Sub-Jupiter point)
      y: 2631200.0, // Polar axis (Assuming Y-up)
      z: 2628300.0, // Intermediate (Orbital direction)
    },

    color: 0x7c7268,
    texture: "/Ganymede.png",
    parent: "Jupiter",

    // Synchronous rotation (~7.155 days)
    rotationPeriod: 171.7092,
    axialTilt: 0.33,
    meanTemperature: 110,

    // Surface gravity (GM / R_mean²)
    surfaceGravity: 1.428,

    jplId: "503",
    type: "moon",

    // Zonal Harmonics (J2)
    J: [1.3748e-4],

    // Sectorial Harmonics (C22)
    c22: 3.874e-5,

    // High k2 value suggests a significantly deformable interior (subsurface ocean)
    tidal: { k2: 0.804, tidalQ: 100 },

    // Pole positions
    poleRA: 269.9949,
    poleDec: 64.57,

    // Orbital data
    rel_a: 1070400e3,
    rel_e: 0.0013,
    rel_i: 0.2,
  },

  {
    name: "Callisto",
    // GM from Horizons: 7179.2834 km³/s² -> m³/s²
    gm: 7179.2834e9,

    // Best-fit Equatorial Radius (matching mean radius here)
    equatorialRadius: 2410300.0,

    // Standard Gravity Reference Radius (Volumetric Mean)
    jRefRadius: 2410300.0,

    radii: {
      x: 2410300.0,
      y: 2410300.0, // Callisto is nearly perfectly spherical
      z: 2410300.0,
    },

    color: 0x5e564d,
    texture: "/Callisto.jpg",
    parent: "Jupiter",

    // Synchronous rotation (~16.689 days)
    rotationPeriod: 400.536,
    axialTilt: 0.0,
    meanTemperature: 134,

    // Surface gravity (GM / R_mean²)
    surfaceGravity: 1.236,

    jplId: "504",
    type: "moon",

    // Zonal Harmonics (J2) - very small, reflecting low differentiation
    J: [3.27e-5],

    // Sectorial Harmonics (C22)
    c22: 1.04e-5,

    // Lower k2 suggests a much more rigid/undifferentiated interior than Ganymede
    tidal: { k2: 0.03, tidalQ: 100 },

    // Pole orientation
    poleRA: 268.72,
    poleDec: 64.83,

    // Updated orbital data for J2000
    rel_a: 1883000e3,
    rel_e: 0.00744,
    rel_i: 0.2,
  },

  {
    name: "Saturn",
    gm: 37931206.234e9,
    equatorialRadius: 60268000.0,
    jRefRadius: 60268000.0, // physical equatorial, J coefficients renormalized to match

    radii: {
      x: 60268000.0,
      y: 54364000.0, // polar
      z: 60268000.0,
    },

    color: 0xf4d03f,
    texture: "/Saturn.jpg",
    rotationPeriod: 10.6562222, // 10h 39m 22.4s
    axialTilt: 26.73,
    meanTemperature: 134,
    surfaceGravity: 10.44,
    jplId: "699",
    type: "planet",

    // Cassini J coefficients renormalized from 60330km to 60268km
    // Jn_new = Jn_old * (60330/60268)^n
    J: [
      1.63241e-2, // J2  renormalized from 60330km
      0.0, // J3
      -9.39168e-4, // J4  renormalized from 60330km
      0.0, // J5
      8.68745e-5, // J6  renormalized from 60330km
      0.0, // J7
      -1.47449e-5, // J8  renormalized from 60330km
    ],

    poleRA: 40.589,
    poleDec: 83.537,
    poleRA_rate: -0.036,
    poleDec_rate: -0.004,
    W0: 38.9,
    Wdot: 810.7939024,
    albedo: 0.47,

    hasRings: true,
    ringInnerRadius: 66900e3,
    ringOuterRadius: 140220e3,
    ringTexture: "/SaturnRings.png",
    ringOpacity: 0.9,

    rel_a: 9.53707 * AU,
    rel_e: 0.05415,
    rel_i: 2.484,
  },

  {
    name: "Enceladus",
    // GM from Horizons 2022: 7.210367 km³/s²
    gm: 7.210367e9,

    // SYNC: Gravity Reference MUST be the Mean Radius (252.3 km)
    jRefRadius: 252300.0,

    // Equatorial Radius for visuals and collision detection
    equatorialRadius: 256600.0,

    radii: {
      x: 256600.0, // Sub-Saturnian (a)
      y: 248300.0, // Polar (c) - (Note: swapped Y/Z from your snippet to match standard c < b < a)
      z: 251400.0, // Leading/Trailing (b)
    },

    color: 0xffffff,
    texture: "/Enceladus.jpg",
    parent: "Saturn",

    // Perfect sync to 1.370218d
    rotationPeriod: 32.885232,
    axialTilt: 0.0,
    meanTemperature: 75,

    // GM / R_mean²
    surfaceGravity: 0.113,

    jplId: "602",
    type: "moon",
    albedo: 1.04, // Fresh ice is incredibly reflective

    // Normalized to 252.3 km
    J: [5.4352e-3],
    c22: 1.5598e-3,
    s22: 0.0,

    // Tidal Q is low (30) because of high dissipation in the southern polar plumes
    tidal: { k2: 0.0045, tidalQ: 30 },

    poleRA: 40.66,
    poleDec: 83.52,

    rel_a: 238040e3,
    rel_e: 0.0047,
    rel_i: 0.009,
  },

  {
    name: "Titan",
    // GM from Horizons: 8978.14 km³/s² -> m³/s²
    gm: 8978.14e9,

    // Best-fit Equatorial Radius
    equatorialRadius: 2575500.0,

    // Standard Gravity Reference Radius (Volumetric Mean)
    jRefRadius: 2575500.0,

    radii: {
      x: 2575500.0,
      y: 2575500.0, // Titan is remarkably spherical
      z: 2575500.0,
    },

    color: 0xe3c968,
    texture: "/Titan.jpg",
    parent: "Saturn",

    // Synchronized to 15.945421d orbital period
    rotationPeriod: 382.690104,
    axialTilt: 0.0,
    meanTemperature: 94,

    // Surface gravity (GM / R_mean²)
    surfaceGravity: 1.3535,

    jplId: "606",
    type: "moon",
    albedo: 0.2,

    // Gravity Harmonics (IESS - Less et al. 2012)
    J: [3.19e-5],
    c22: 1.09e-5,

    // High k2 suggests a global subsurface ocean
    tidal: { k2: 0.637, tidalQ: 70 },

    poleRA: 36.41,
    poleDec: 83.94,

    // Updated orbital data
    rel_a: 1221870e3,
    rel_e: 0.0288,
    rel_i: 0.28,
  },

  {
    name: "Uranus",
    // GM from Horizons 2025: 5793950.6103 km³/s² -> m³/s²
    gm: 5793950.6103e9,

    // 1-bar Equatorial Radius
    equatorialRadius: 25559000.0,

    // Standard Gravity Reference Radius (Jacobson 2014)
    jRefRadius: 25559000.0,

    radii: {
      x: 25559000.0,
      y: 24973000.0, // Polar radius from snippet
      z: 25559000.0,
    },

    color: 0xadd8e6,
    texture: "/Uranus.jpg",

    // Sidereal rotation: 17.24h (Negative for retrograde rotation)
    rotationPeriod: -17.24,
    axialTilt: 97.77,
    meanTemperature: 76,

    // Equatorial gravity (ge) from snippet
    surfaceGravity: 8.87,

    jplId: "799",
    type: "planet",

    // Zonal Harmonics (Jacobson 2014)
    J: [
      3.51068e-3, // J2
      0.0, // J3
      -3.215e-5, // J4
    ],

    tidal: { k2: 0.104, tidalQ: 11000 },

    poleRA: 257.311,
    poleDec: -15.175,
    W0: 203.81,
    Wdot: -501.1600928,
    albedo: 0.51,

    hasRings: true,
    ringInnerRadius: 38000e3,
    ringOuterRadius: 51149e3,

    // Orbital precision update
    rel_a: 19.19126393 * AU,
    rel_e: 0.04717,
    rel_i: 0.772,
  },
  {
    name: "Titania",
    // GM from Horizons 2025: 222.8 km³/s² -> m³/s²
    gm: 222.8e9,

    // Mean radius used as equatorial and gravity reference
    equatorialRadius: 788900.0,
    jRefRadius: 788900.0,

    radii: {
      x: 788900.0,
      y: 788900.0,
      z: 788900.0,
    },

    color: 0xd3d3d3,
    texture: "/Titania.jpg",
    parent: "Uranus",

    // Synchronized to 8.706d orbital period
    rotationPeriod: 208.944,
    axialTilt: 0.0, // Aligned with Uranus' equatorial plane
    meanTemperature: 60,

    // Calculated: GM / r^2 ≈ 0.358 m/s² (using your standard 0.38)
    surfaceGravity: 0.38,

    jplId: "703",
    type: "moon",
    albedo: 0.27,

    // J Harmonics (Simplified for Titania)
    J: [0.0],

    // Pole aligns with Uranus' pole
    poleRA: 257.311,
    poleDec: -15.175,

    rel_a: 435800e3,
    rel_e: 0.0022,
    // Orbital inclination is retrograde (179.9°) relative to ecliptic
    rel_i: 179.9,
  },
  {
    name: "Oberon",
    // GM from Horizons 2025: 205.34 km³/s² -> m³/s²
    gm: 205.34e9,

    // Mean radius used as equatorial and gravity reference
    equatorialRadius: 761400.0,
    jRefRadius: 761400.0,

    radii: {
      x: 761400.0,
      y: 761400.0,
      z: 761400.0,
    },

    color: 0xa0a0a0,
    texture: "/Oberon.jpg",
    parent: "Uranus",

    // Synchronized to 13.463d orbital period
    rotationPeriod: 323.112,
    axialTilt: 0.0, // Aligned with Uranus' equatorial plane
    meanTemperature: 61,

    // Calculated: GM / r^2 ≈ 0.3542 m/s²
    surfaceGravity: 0.3542,

    jplId: "704",
    type: "moon",
    albedo: 0.24,

    // Pole aligns with Uranus' pole
    poleRA: 257.311,
    poleDec: -15.175,

    rel_a: 582600e3,
    rel_e: 0.0008,
    // Retrograde orbit relative to ecliptic (plane of Uranus' equator)
    rel_i: 179.9,
  },

  {
    name: "Neptune",
    // GM from Horizons 2021/2025: 6835099.97 km³/s² -> m³/s²
    gm: 6835099.97e9,

    // 1-bar Equatorial Radius
    equatorialRadius: 24766000.0,

    // Standard Gravity Reference Radius (Jacobson 2009)
    jRefRadius: 24766000.0,

    radii: {
      x: 24766000.0,
      y: 24342000.0, // Polar radius from snippet
      z: 24766000.0,
    },

    color: 0x00008b,
    texture: "/Neptune.jpg",

    // Sidereal rotation: 16.11h
    rotationPeriod: 16.11,
    axialTilt: 28.32,
    meanTemperature: 72,

    // Equatorial gravity (ge) from snippet
    surfaceGravity: 11.15,

    jplId: "899",
    type: "planet",

    // Zonal Harmonics (Jacobson 2009)
    J: [
      3.40843e-3, // J2
      0.0, // J3
      -3.34e-5, // J4
    ],

    poleRA: 299.36,
    poleDec: 41.28,
    W0: 253.18,
    Wdot: 536.3128492,

    hasRings: true,
    ringInnerRadius: 40900e3,
    ringOuterRadius: 62932e3,
    ringTexture: "/NeptuneRings.png",
    ringColor: 0x444444,
    ringOpacity: 0.2,

    // Orbital parameters
    rel_a: 30.07 * AU,
    rel_e: 0.008678,
    rel_i: 1.77,
  },

  {
    name: "Triton",
    // GM from Horizons 2021/2025: 1428.495 km³/s² -> m³/s²
    gm: 1428.495e9,

    // Mean radius used as equatorial and gravity reference
    equatorialRadius: 1352600.0,
    jRefRadius: 1352600.0,

    radii: {
      x: 1352600.0,
      y: 1352600.0, // Modeled as spherical
      z: 1352600.0,
    },

    color: 0xffe4e1,
    texture: "/Triton.jpg",
    parent: "Neptune",

    // Retrograde Synchronous rotation (~5.877 days)
    rotationPeriod: -141.047856,
    axialTilt: 0.0,
    meanTemperature: 38,

    // Calculated: GM / r^2 ≈ 0.779 m/s²
    surfaceGravity: 0.779,

    jplId: "801",
    type: "moon",
    albedo: 0.7,

    // Gravity Harmonics (Voyager 2 / Jacobson 2009)
    J: [0.0],

    // Pole aligns closely with Neptune's rotational axis
    poleRA: 299.36,
    poleDec: 41.17,

    // Orbital data
    rel_a: 354800e3,
    rel_e: 0.0,
    // Retrograde orbit (157.3°)
    rel_i: 157.3,
  },

  ...EXTENDED_BODIES,
];
