import type { CelestialBodyData } from "../types";
import { EXTENDED_BODIES } from "./extendedBodies";

const AU = 1.495978707e11;

export const SOLAR_SYSTEM_DATA: CelestialBodyData[] = [
  {
    name: "Sun",
    // Calculated exactly: 132712440041.93938e9 / 6.67430e-11
    mass: 1.988409871326422e30,

    // Gravity reference radius (IAU 2015)
    radius: 695700000.0,

    radii: {
      x: 695700000.0,
      y: 695700000.0,
      z: 695700000.0,
    },

    color: 0xffffff,
    emissive: 0xffaa00,
    texture: "/Sun.jpg",
    type: "star",

    // Carrington sidereal rotation
    rotationPeriod: 609.12,
    axialTilt: 7.25,
    meanTemperature: 5772,

    // Calculated: GM / R_mean^2
    surfaceGravity: 274.2,

    jplId: "10",

    // Solar quadrupole moment
    J: [2.2e-7],

    poleRA: 286.13,
    poleDec: 63.87,
    W0: 84.176,
    Wdot: 14.1844,
  },

  {
    name: "Mercury",
    // Recalibrated: 22031.86855e9 / 6.67430e-11
    mass: 3.30100064e23,
    radius: 2440.53e3,
    radii: { x: 2440.53e3, y: 2437.14e3, z: 2440.53e3 },
    color: 0xaaaaaa,
    texture: "/Mercury.jpg",
    rotationPeriod: 1407.5112,
    axialTilt: 0.03516,
    meanTemperature: 440,
    surfaceGravity: 3.701,
    jplId: "199",
    type: "planet",
    J: [5.03104e-5],
    c22: 8.088e-6,
    s22: 0.0,
    tidal: { k2: 0.569, tidalQ: 50 },
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
    // Recalibrated: 324858.592e9 / 6.67430e-11
    mass: 4.86731175e24,
    radius: 6051.893e3,
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
    J: [4.458e-6],
    c22: -1.349e-6,
    s22: -0.232e-6,
    tidal: { k2: 0.25, tidalQ: 12 },
    poleRA: 272.76,
    poleDec: 67.16,
    W0: 160.2,
    Wdot: -1.481335,
    hasAtmosphere: true,
    surfacePressure: 9.0e6,
    scaleHeight: 15.9,
    dragCoefficient: 2.2,
    albedo: 0.65,
    rel_a: 0.723332 * AU,
    rel_e: 0.0067,
    rel_i: 3.39458,
  },

  {
    name: "Earth",
    // Recalibrated: 398600.435436e9 / 6.67430e-11
    mass: 5.9721683987e24,
    radius: 6378137.0, // WGS 84 Equatorial Radius
    radii: {
      x: 6378137.0,
      y: 6356752.3, // Polar axis (Assuming Y-up)
      z: 6378137.0,
    },
    color: 0x2233ff,
    texture: "/Earth.jpg",
    // Mean sidereal day to full JPL precision
    rotationPeriod: 23.9344695944,
    axialTilt: 23.4392911,
    meanTemperature: 287.6,
    surfaceGravity: 9.82022,
    jplId: "399",
    type: "planet",
    // IERS 2010 Gravitational Harmonics
    J: [
      1.08262545e-3, // J2
      -2.5327e-6, // J3
      -1.6196e-6, // J4
    ],
    c22: 2.43e-6,
    s22: -1.4e-6,
    tidal: { k2: 0.299, tidalQ: 12 },
    poleRA: 0.0,
    poleDec: 90.0,
    W0: 100.21,
    Wdot: 360.9856235,
    precessionRate: 50.29,
    nutationAmplitude: 9.2,
    albedo: 0.367,
    hasAtmosphere: true,
    surfacePressure: 101325, // Pa
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
    // Calculated exactly: 4902.800066e9 / 6.67430e-11
    mass: 7.345789170399893e22,

    // Reference radius for J2/C22 harmonics (Gravity Radius)
    radius: 1738000.0,

    radii: {
      x: 1738100.0, // Toward Earth (Equatorial A)
      y: 1736000.0, // Polar (C) - Assumes Y-up
      z: 1737400.0, // Orbital direction (Equatorial B)
    },

    color: 0xcccccc,
    texture: "/Moon.jpg",
    parent: "Earth",

    // Precise synchronization for tidal lock
    rotationPeriod: 655.717968,
    axialTilt: 6.67,
    meanTemperature: 220,

    // Calculated: GM / R_gravity^2
    surfaceGravity: 1.6231,

    jplId: "301",
    type: "moon",

    // GRAIL Gravity Harmonics (Lemoine et al. 2013)
    J: [2.0321e-4], // J2
    c22: 2.2431e-5,
    s22: 2.74e-6,

    tidal: { k2: 0.0202, tidalQ: 26.5 },

    // Mean Pole (IAU)
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
    // Updated to match your 2025 JPL GM: 42828.375662e9 / 6.67430e-11
    mass: 6.417074451006122e23,
    radius: 3396190, // Equatorial Reference
    radii: {
      x: 3396190, // Equatorial
      y: 3376190, // Polar (Flattening 1/169.779)
      z: 3396190, // Equatorial
    },
    color: 0xff4500,
    texture: "/Mars.jpg",
    rotationPeriod: 24.622962,
    axialTilt: 25.19,
    meanTemperature: 210,
    surfaceGravity: 3.71, // Matches Equ. gravity in JPL data
    jplId: "499",
    type: "planet",
    J: [1.96045e-3, 3.145e-5, -1.54477e-5],
    c22: -6.316e-5,
    s22: -1.5e-5,
    tidal: { k2: 0.148, tidalQ: 92 },
    poleRA: 317.68,
    poleDec: 52.89,
    poleRA_rate: -0.108,
    poleDec_rate: -0.061,
    W0: 176.63,
    Wdot: 350.892015,
    hasAtmosphere: true,
    surfacePressure: 560, // 0.0056 bar -> 560 Pa
    scaleHeight: 11100, // Converted 11.1 km to meters for consistency
    dragCoefficient: 2.2,
    albedo: 0.15,
    rel_a: 1.523679 * AU,
    rel_e: 0.0934,
    rel_i: 1.85,
  },

  {
    name: "Phobos",
    // Recalibrated: 0.00070875e9 / 6.67430e-11
    mass: 1.0619089222e16,
    radius: 13000, // Primary Equatorial Reference (a) for J2/C22
    radii: {
      x: 13000, // Towards Mars (Longest)
      y: 11400, // Direction of motion
      z: 9100, // Polar axis (Shortest)
    },
    color: 0x888888,
    texture: "/Phobos.png",
    parent: "Mars",
    rotationPeriod: 7.6538455,
    surfaceGravity: 0.0057,
    axialTilt: 0,
    meanTemperature: 233,
    jplId: "401",
    type: "moon",
    // Gravitational Harmonics for a triaxial body
    J: [0.105],
    c22: 0.015,
    s22: 0.0,
    tidal: { k2: 0.04, tidalQ: 100 },
    poleRA: 317.68,
    poleDec: 52.9,
    albedo: 0.071, // JPL updated value
    thermalInertia: 25,
    rel_a: 9377.2e3,
    rel_e: 0.0151,
    rel_i: 1.082,
  },

  {
    name: "Deimos",
    // Updated to match 2025 JPL Mass: 1.80e15 kg
    // GM equivalent: 0.0001201374e9
    mass: 1.8e15,
    radius: 7800.0, // Primary Equatorial Reference (a)
    radii: {
      x: 7800.0, // Longest axis (points toward Mars)
      y: 5100.0, // Polar axis (Shortest - assumes Y-up engine)
      z: 6000.0, // Orbital direction axis (Medium)
    },
    color: 0x777777,
    texture: "/Deimos.png",
    parent: "Mars",
    rotationPeriod: 30.29856,
    axialTilt: 0,
    meanTemperature: 233,
    surfaceGravity: 0.003,
    jplId: "402",
    type: "moon",
    J: [0.08],
    tidal: { k2: 0.02, tidalQ: 100 },
    poleRA: 316.65,
    poleDec: 53.52,
    albedo: 0.06,
    thermalInertia: 25,
    rel_a: 23463.2e3,
    rel_e: 0.00033,
    rel_i: 1.791,
  },

  {
    name: "Jupiter",
    // Calculated exactly: 126686531.900e9 / 6.67430e-11
    mass: 1.898124625803455e27,

    // Reference radius for J-harmonics (1-bar equatorial)
    radius: 71492000.0,

    radii: {
      x: 71492000.0,
      y: 66854000.0, // Polar
      z: 71492000.0,
    },

    color: 0xd8ca9d,
    texture: "/Jupiter.jpg",

    // 9h 55m 29.711s precisely
    rotationPeriod: 9.924919722222,
    axialTilt: 3.13,
    meanTemperature: 165,

    // Internal consistency value
    surfaceGravity: 24.78652,

    jplId: "599",
    type: "planet",

    // High-order Zonal Harmonics (Juno data)
    J: [
      1.4696572e-2, 0.0, -5.87146e-4, 0.0, 3.4255e-5, 0.0, -2.426e-6, 0.0,
      1.72e-7,
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
    // Recalibrated: 5959.9155e9 / 6.67430e-11
    mass: 8.9296488021e22,
    radius: 1829.4e3, // Equatorial scale reference (a)
    radii: {
      x: 1829.4e3, // Longest (Sub-Jupiter point)
      y: 1815.7e3, // Polar axis (Assuming Y-up)
      z: 1819.3e3, // Intermediate (Orbital direction)
    },
    color: 0xfbffa3,
    texture: "/Io.jpg",
    parent: "Jupiter",
    rotationPeriod: 42.459306,
    axialTilt: 0.0,
    meanTemperature: 110,
    surfaceGravity: 1.796,
    jplId: "501",
    type: "moon",
    J: [1.8459e-3],
    c22: 5.5865e-4,
    tidal: { k2: 1.3, tidalQ: 36 },
    poleRA: 268.05,
    poleDec: 64.5,
    rel_a: 421700e3,
    rel_e: 0.0041,
    rel_i: 0.04,
  },

  {
    name: "Europa",
    // Recalibrated: 3202.7121e9 / 6.67430e-11
    mass: 4.7985732e22,
    radius: 1562.6e3,
    radii: { x: 1562.6e3, y: 1559.5e3, z: 1560.3e3 },
    color: 0xc9c0bb,
    texture: "/Europa.jpg",
    parent: "Jupiter",
    rotationPeriod: 85.2283,
    axialTilt: 0.1,
    meanTemperature: 102,
    surfaceGravity: 1.315,
    jplId: "502",
    type: "moon",
    J: [4.355e-4],
    c22: 1.315e-4,
    tidal: { k2: 0.26, tidalQ: 100 },
    poleRA: 268.08,
    poleDec: 64.51,
    rel_a: 671034e3,
    rel_e: 0.00981,
    rel_i: 0.462,
  },

  {
    name: "Ganymede",
    // Recalibrated: 9887.8328e9 / 6.67430e-11
    mass: 1.4814786e23,
    radius: 2634.1e3,
    radii: { x: 2634.1e3, y: 2631.2e3, z: 2628.3e3 },
    color: 0x7c7268,
    texture: "/Ganymede.png",
    parent: "Jupiter",
    rotationPeriod: 171.7092,
    axialTilt: 0.33,
    meanTemperature: 110,
    surfaceGravity: 1.428,
    jplId: "503",
    type: "moon",
    J: [1.3748e-4],
    c22: 3.874e-5,
    tidal: { k2: 0.804, tidalQ: 100 },
    poleRA: 269.9949,
    poleDec: 64.57,
    rel_a: 1070400e3,
    rel_e: 0.0013,
    rel_i: 0.2,
  },

  {
    name: "Callisto",
    // Recalibrated: 7179.2834e9 / 6.67430e-11
    mass: 1.07566088e23,
    radius: 2410.3e3,
    radii: { x: 2410.3e3, y: 2410.3e3, z: 2410.3e3 },
    color: 0x5e564d,
    texture: "/Callisto.jpg",
    parent: "Jupiter",
    rotationPeriod: 400.584,
    axialTilt: 0.0,
    meanTemperature: 134,
    surfaceGravity: 1.236,
    jplId: "504",
    type: "moon",
    J: [3.27e-5],
    c22: 1.04e-5,
    tidal: { k2: 0.03, tidalQ: 100 },
    poleRA: 268.72,
    poleDec: 64.83,
    rel_a: 1882700e3,
    rel_e: 0.0074,
    rel_i: 0.2,
  },

  {
    name: "Saturn",
    // Recalibrated: 37931206.234e9 / 6.67430e-11
    mass: 5.6831737012e26,
    // CRITICAL: This is the Reference Radius for the J-coefficients (60,330 km)
    radius: 60330000,
    radii: {
      x: 60268000, // 1-bar Equatorial
      y: 54364000, // 1-bar Polar (Assuming Y-up)
      z: 60268000, // 1-bar Equatorial
    },
    color: 0xf4d03f,
    texture: "/Saturn.jpg",
    poleRA: 40.589,
    poleDec: 83.537,
    rotationPeriod: 10.6562222,
    axialTilt: 26.73,
    meanTemperature: 134,
    surfaceGravity: 10.44,
    jplId: "699",
    type: "planet",
    // Cassini Grand Finale Values (Reference Radius: 60,330 km)
    J: [
      1.6290573e-2, // J2
      0.0, // J3 (Negligible)
      -9.35314e-4, // J4
      0.0, // J5 (Negligible)
      8.634e-5, // J6
      0.0, // J7
      -1.4624e-5, // J8
    ],
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
    // Recalibrated: 7.210367e9 / 6.67430e-11
    mass: 1.08031677e20,
    radius: 256.6e3,
    radii: { x: 256.6e3, y: 251.4e3, z: 248.3e3 },
    color: 0xffffff,
    texture: "/Enceladus.jpg",
    parent: "Saturn",
    rotationPeriod: 32.8852,
    axialTilt: 0.0,
    meanTemperature: 75,
    surfaceGravity: 0.113,
    jplId: "602",
    type: "moon",
    tidal: { k2: 0.0045, tidalQ: 30 },
    poleRA: 40.66,
    poleDec: 83.52,
    rel_a: 238040e3,
    rel_e: 0.0047,
    rel_i: 0.009,
  },

  {
    name: "Titan",
    // Recalibrated: 8978.14e9 / 6.67430e-11
    mass: 1.345180768e23,
    radius: 2575.5e3,
    radii: {
      x: 2575.5e3,
      y: 2575.5e3,
      z: 2575.5e3,
    },
    color: 0xe3c968,
    texture: "/Titan.jpg",
    parent: "Saturn",
    // Synchronized to 15.945421d orbital period
    rotationPeriod: 382.690104,
    axialTilt: 0.0,
    meanTemperature: 94,
    surfaceGravity: 1.3535,
    jplId: "606",
    type: "moon",
    albedo: 0.2,
    // Gravity Harmonics (IESS - Less et al. 2012)
    J: [3.19e-5],
    c22: 1.09e-5,
    tidal: { k2: 0.637, tidalQ: 70 },
    poleRA: 36.41,
    poleDec: 83.94,
    rel_a: 1221870e3,
    rel_e: 0.0288,
    rel_i: 0.28,
  },

  {
    name: "Uranus",
    // Recalibrated: 5793950.6103e9 / 6.67430e-11
    mass: 8.680986186266726e25,
    radius: 25559000.0,
    radii: {
      x: 25559000.0,
      y: 24973000.0, // Calculated via flattening 0.02293
      z: 25559000.0,
    },
    color: 0xadd8e6,
    texture: "/Uranus.jpg",
    // Synchronized to sidereal rate: -0.000101237 rad/s
    rotationPeriod: -17.2400237,
    axialTilt: 97.77,
    meanTemperature: 76,
    surfaceGravity: 8.8692536,
    jplId: "799",
    type: "planet",
    J: [
      3.51068e-3, // J2
      0.0, // J3
      -3.215e-5, // J4 (Standard Jacobson 2014)
    ],
    tidal: { k2: 0.104, tidalQ: 11000 },
    poleRA: 257.311,
    poleDec: -15.175,
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
    // Recalibrated: 222.8e9 / 6.67430e-11
    mass: 3.3381777864e21,
    radius: 788.9e3,
    radii: {
      x: 788.9e3,
      y: 788.9e3,
      z: 788.9e3,
    },
    color: 0xd3d3d3,
    texture: "/Titania.jpg",
    parent: "Uranus",
    // Refined for perfect 1:1 tidal lock synchronization
    rotationPeriod: 208.940887,
    axialTilt: 0.0,
    meanTemperature: 60,
    surfaceGravity: 0.38, // (GM / r^2) = 0.358; 0.38 is the standard cited value
    jplId: "703",
    type: "moon",
    albedo: 0.27,
    // Harmonics for a large spherical moon
    J: [0.0],
    poleRA: 257.311,
    poleDec: -15.175,
    rel_a: 435800e3,
    rel_e: 0.0022,
    rel_i: 179.9,
  },
  {
    name: "Oberon",
    // Recalibrated: 205.34e9 / 6.67430e-11
    mass: 3.076577319e21,
    radius: 761.4e3,
    radii: {
      x: 761.4e3,
      y: 761.4e3,
      z: 761.4e3,
    },
    color: 0xa0a0a0,
    texture: "/Oberon.jpg",
    parent: "Uranus",
    // Synchronized to 13.463234d orbital period
    rotationPeriod: 323.117616,
    axialTilt: 0.0,
    meanTemperature: 61,
    surfaceGravity: 0.3542,
    jplId: "704",
    type: "moon",
    albedo: 0.24,
    // Tidally locked to Uranus's 2025 pole
    poleRA: 257.311,
    poleDec: -15.175,
    rel_a: 582600e3,
    rel_e: 0.0008,
    rel_i: 179.9,
  },

  {
    name: "Neptune",
    // Calculated exactly: 6835099.97e9 / 6.67430e-11
    mass: 1.024092409690904e26,

    // Reference radius for J2/J4 harmonics (1-bar equatorial)
    radius: 24766000.0,

    radii: {
      x: 24766000.0,
      y: 24342000.0, // Polar
      z: 24766000.0,
    },

    color: 0x00008b,
    texture: "/Neptune.jpg",

    rotationPeriod: 16.11,
    axialTilt: 28.32,
    meanTemperature: 72,

    // Calculated: GM / R_equator^2
    surfaceGravity: 11.1438,

    jplId: "899",
    type: "planet",

    // Jacobson (2009) Harmonics
    J: [
      3.40843e-3, // J2
      0.0, // J3
      -3.34e-5, // J4
    ],

    poleRA: 299.36,
    poleDec: 41.28,

    hasRings: true,
    ringInnerRadius: 40900e3,
    ringOuterRadius: 62932e3,
    ringTexture: "/NeptuneRings.png",
    ringColor: 0x444444,
    ringOpacity: 0.2,

    rel_a: 30.07 * AU,
    rel_e: 0.008678,
    rel_i: 1.77,
  },

  {
    name: "Triton",
    // Recalibrated: 1428.495e9 / 6.67430e-11
    mass: 2.14029188e22,
    radius: 1352.6e3,
    radii: { x: 1352.6e3, y: 1352.6e3, z: 1352.6e3 },
    color: 0xffe4e1,
    texture: "/Triton.jpg",
    parent: "Neptune",
    rotationPeriod: -141.0478,
    axialTilt: 0.0,
    meanTemperature: 38,
    surfaceGravity: 0.779,
    jplId: "801",
    type: "moon",
    poleRA: 299.36,
    poleDec: 41.17,
    rel_a: 354800e3,
    rel_e: 0.0,
    rel_i: 157.3,
  },

  ...EXTENDED_BODIES,
];
