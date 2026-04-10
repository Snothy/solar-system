import type { CelestialBodyData } from '../types';
import { EXTENDED_BODIES } from './extendedBodies';

const AU = 1.495978707e11; 

export const SOLAR_SYSTEM_DATA: CelestialBodyData[] = [
  {
    name: "Sun",
    mass: 1.98840987e30, // GM: 1.3271244004193938e20 / 6.67430e-11 
    radius: 695700e3,
    radii: { x: 695700e3, y: 695700e3, z: 695700e3 },
    color: 0xffffff,
    emissive: 0xffaa00,
    texture: "/Sun.jpg",
    type: "star",
    rotationPeriod: 609.12,
    axialTilt: 7.25,
    meanTemperature: 5772,
    surfaceGravity: 274.0,
    jplId: "10",
    J: [2.2e-7],
    poleRA: 286.13,
    poleDec: 63.87,
    W0: 84.176,
    Wdot: 14.1844000
  },

  {
    name: "Mercury",
    mass: 3.3009871e23, // GM: 22031.78e9 / 6.67430e-11
    radius: 2439.4e3,
    radii: { x: 2440.5e3, y: 2439.7e3, z: 2440.5e3 },
    color: 0xaaaaaa,
    texture: "/Mercury.jpg",
    rotationPeriod: 1407.6,
    axialTilt: 0.034,
    meanTemperature: 440,
    surfaceGravity: 3.7,
    jplId: "199",
    type: "planet",
    // Mazarico et al. 2014, JGR (MESSENGER HgM008) — R_ref = 2439.4 km
    J: [5.0328e-5],
    c22: 8.088e-6,
    s22: 0.0,
    tidal: {
      k2: 0.569, // Verma & Margot 2016
      tidalQ: 50  // Padovan et al. 2014
    },
    poleRA: 281.01,
    poleDec: 61.45,
    W0: 329.5469,
    Wdot: 6.1385025,
    albedo: 0.142,
    
    rel_a: 0.38709893 * AU,
    rel_e: 0.20563069,
    rel_i: 7.00487,
    
  },

  {
    name: "Venus",
    mass: 4.8673118e24, // GM: 324858.592e9 / 6.67430e-11
    radius: 6051.8e3,
    radii: { x: 6051.8e3, y: 6051.8e3, z: 6051.8e3 },
    color: 0xe3bb76,
    texture: "/Venus.jpg",
    cloudMap: "/VenusAtmosphere.jpg",
    cloudTransparency: 1.0,
    rotationPeriod: -5832.6,
    axialTilt: 177.36,
    meanTemperature: 737,
    surfaceGravity: 8.87,
    jplId: "299",
    type: "planet",
    // Konopliv & Sjogren 1996 (MGNP180U) — R_ref = 6051.8 km
    J: [4.458e-6],
    c22: -1.349e-6,
    s22: -0.232e-6,
    tidal: {
      k2: 0.295,
      tidalQ: 12 // Bills et al. 2005
    },
    poleRA: 272.76,
    poleDec: 67.16,
    W0: 160.20,
    Wdot: -1.4813688,
    hasAtmosphere: true,
    surfacePressure: 9.2e6,
    scaleHeight: 15.9,
    dragCoefficient: 2.2,
    albedo: 0.76,
    
    rel_a: 0.723332 * AU,
    rel_e: 0.006772,
    rel_i: 3.39458
  },

  {
    name: "Earth",
    mass: 5.9721686e24, // GM: 398600.435436e9 / 6.67430e-11
    radius: 6371.0e3,
    radii: { x: 6378.1e3, y: 6356.8e3, z: 6378.1e3 },
    color: 0x2233ff,
    texture: "/Earth.jpg",
    rotationPeriod: 23.9345,
    axialTilt: 23.439281,
    meanTemperature: 288,
    surfaceGravity: 9.807,
    jplId: "399",
    type: "planet",
    J: [1.08263e-3, -2.53e-6, -1.62e-6],
    c22: 2.43e-6,
    s22: -1.40e-6,
    tidal: {
      k2: 0.299,
      tidalQ: 12
    },
    
    poleRA: 0.0,
    poleDec: 90.0,
    W0: 100.21,
    Wdot: 360.9856235,
    precessionRate: 50.29,
    nutationAmplitude: 9.2,
    hasAtmosphere: true,
    surfacePressure: 101325,
    scaleHeight: 8.5,
    dragCoefficient: 2.2,
    albedo: 0.306,
    normalMap: "/EarthNormal.jpg",
    emissiveMap: "/EarthNight.jpg", 
    cloudMap: "/EarthClouds.jpg",
    cloudTransparency: 0.8,
    
    rel_a: 1.0 * AU,
    rel_e: 0.01671123,
    rel_i: 0.00005
  },

  {
    name: "Moon",
    mass: 7.3457904e22, // GM: 4902.800066e9 / 6.67430e-11
    radius: 1737.4e3,
    radii: { x: 1738.1e3, y: 1736.0e3, z: 1738.1e3 },
    color: 0xcccccc,
    texture: "/Moon.jpg",
    parent: "Earth",
    rel_a: 384400e3,
    rel_e: 0.0549,
    rel_i: 5.145,
    rel_v: 1022,
    rotationPeriod: 655.728,
    axialTilt: 6.68,
    meanTemperature: 220,
    surfaceGravity: 1.62,
    jplId: "301",
    type: "moon",
    // GRAIL GRGM900C model (Zuber et al. 2013) — R_ref = 1737.4 km
    J: [2.0321e-4],
    c22: 2.2431e-5,
    s22: 2.74e-6,
    tidal: {
      k2: 0.0202,
      tidalQ: 26.5
    },
    poleRA: 266.86,
    poleDec: 65.64,
    W0: 38.3213,
    Wdot: 13.17635815,
    albedo: 0.12
  },

{
    name: "Mars",
    mass: 6.4171167e23, // GM: 42828.375214e9 / 6.67430e-11
    radius: 3396200.0,
    radii: { x: 3396.2e3, y: 3376.2e3, z: 3396.2e3 },
    color: 0xff4500,
    texture: "/Mars.jpg",
    rotationPeriod: 24.6229,
    axialTilt: 25.19,
    meanTemperature: 210,
    surfaceGravity: 3.721,
    jplId: "499",
    type: "planet",
    // Scaled to Mean Radius (3389.9km): J_new = J_old * (3389.9/3396.2)^2 = J_old * 0.9963
    // J: [1.9532e-3, 3.138e-5, -1.544e-5],
    // REVERTED to Standard J2 for Equatorial Radius 3396.2 km
    J: [1.96045e-3, 3.138e-5, -1.544e-5],
    c22: -6.316e-5,
    s22: -1.5e-5,
    tidal: {
      k2: 0.148,
      tidalQ: 92
    },
    poleRA: 317.68,
    poleDec: 52.89,
    poleRA_rate: -0.108,
    poleDec_rate: -0.061,    
    W0: 176.630,
    Wdot: 350.89198226,
    hasAtmosphere: true,
    surfacePressure: 610,
    scaleHeight: 11.1,
    dragCoefficient: 2.2,
    albedo: 0.250,
    rel_a: 1.523679 * AU,
    rel_e: 0.0934,
    rel_i: 1.850
  },

{
    name: "Phobos",
    mass: 1.0659e16,
    radius: 11266.7, // FIXED: Removed e3 for meters
    radii: { x: 13000.0, y: 11400.0, z: 9100.0 }, // FIXED: Removed e3 for meters
    color: 0x888888,
    texture: "/Phobos.png",
    parent: "Mars",
    rotationPeriod: 7.6538,
    axialTilt: 0,
    meanTemperature: 233,
    surfaceGravity: 0.0057,
    jplId: "401",
    type: "moon",
    J: [0.105],
    c22: 0.015,
    s22: 0.0,
    tidal: {
      k2: 0.04, // Rubble-pile estimate; Nimmo et al. 2010 range 0.03–0.05
      tidalQ: 100
    },
    poleRA: 317.68,
    poleDec: 52.90,
    albedo: 0.071,
    thermalInertia: 25,
    rel_a: 9376e3,
    rel_e: 0.0151,
    rel_i: 1.093
  },

 {
    name: "Deimos",
    mass: 1.4762e15,
    radius: 6200.0, // FIXED: Removed e3 for meters
    radii: { x: 7500.0, y: 6100.0, z: 5200.0 }, // FIXED: Removed e3 for meters
    color: 0x777777,
    texture: "/Deimos.png",
    parent: "Mars",
    rotationPeriod: 30.312,
    axialTilt: 0,
    meanTemperature: 233,
    surfaceGravity: 0.003,
    jplId: "402",
    type: "moon",
    J: [0.08],
    tidal: {
      k2: 0.02, // Conservative estimate for more rigid/distant body
      tidalQ: 100
    },
    poleRA: 316.65,
    poleDec: 53.52,
    albedo: 0.068,
    thermalInertia: 25,
    rel_a: 23463.2e3,
    rel_e: 0.0002,
    rel_i: 0.93
  },

  {
    name: "Jupiter",
    mass: 1.898125e27, // GM: 126686531.9 (System GM - Baseline)
    radius: 71492e3,
    radii: { x: 71492e3, y: 66854e3, z: 71492e3 },
    color: 0xd8ca9d,
    texture: "/Jupiter.jpg",
    rotationPeriod: 9.9258,
    axialTilt: 3.13,
    meanTemperature: 165,
    surfaceGravity: 24.79,
    jplId: "599",
    type: "planet",
    // Bolton et al. 2022 (Juno) — R_ref = 71492 km; J3/J5/J7/J9 ≈ 0 (symmetric oblate)
    J: [1.4696572e-2, 0.0, -5.87146e-4, 0.0, 3.4255e-5, 0.0, -2.426e-6, 0.0, 1.72e-7],
    tidal: {
      k2: 0.565, // Lainey et al. 2020 (Juno)
      tidalQ: 36000
    },
    poleRA: 268.057,
    poleDec: 64.495,
    poleRA_rate: -0.006499, // Added
    poleDec_rate: 0.0,      // Added
    W0: 284.95,
    Wdot: 870.5360000,
    hasRings: true,
    ringInnerRadius: 92000e3,
    ringOuterRadius: 129000e3,
    ringTexture: "/JupiterRings.png",
    ringColor: 0x554433,
    ringOpacity: 0.15,
    rel_a: 5.20260 * AU,
    rel_e: 0.0489,
    rel_i: 1.303
  },

  {
    name: "Io",
    mass: 8.929638e22, // GM: 5959.91e9 / 6.67430e-11
    radius: 1821.6e3,
    radii: { x: 1829.4e3, y: 1815.7e3, z: 1820.6e3 },
    color: 0xfbffa3,
    texture: "/Io.jpg",
    parent: "Jupiter",
    rotationPeriod: 42.459,
    axialTilt: 0.0,
    meanTemperature: 110,
    surfaceGravity: 1.796,
    jplId: "501",
    type: "moon",
    // Anderson et al. 2001, JGR (Galileo flybys) — R_ref = 1821.6 km
    J: [1.8459e-3],
    c22: 5.5865e-4,
    tidal: {
      k2: 1.3,   // highly tidally active (Lainey et al. 2009)
      tidalQ: 36
    },
    poleRA: 268.05,
    poleDec: 64.50
  },

  {
    name: "Europa",
    mass: 4.798585e22, // GM: 3202.72e9 / 6.67430e-11
    radius: 1560.8e3,
    radii: { x: 1564.1e3, y: 1559.5e3, z: 1560.8e3 },
    color: 0xc9c0bb,
    texture: "/Europa.jpg",
    parent: "Jupiter",
    rotationPeriod: 85.228,
    axialTilt: 0.1,
    meanTemperature: 102,
    surfaceGravity: 1.315,
    jplId: "502",
    type: "moon",
    // Anderson et al. 1998, Science (Galileo flybys) — R_ref = 1560.8 km
    J: [4.355e-4],
    c22: 1.315e-4,
    tidal: {
      k2: 0.26, // Moore & Schubert 2000
      tidalQ: 100
    },
    poleRA: 268.08,
    poleDec: 64.51
  },

  {
    name: "Ganymede",
    mass: 1.4814737e23, // GM: 9887.8e9 / 6.67430e-11
    radius: 2634.1e3,
    radii: { x: 2634.1e3, y: 2634.1e3, z: 2634.1e3 },
    color: 0x7c7268,
    texture: "/Ganymede.png",
    parent: "Jupiter",
    rotationPeriod: 171.714,
    axialTilt: 0.33,
    meanTemperature: 110,
    surfaceGravity: 1.428,
    jplId: "503",
    type: "moon",
    // Schubert et al. 2004, JGR (Galileo flybys) — R_ref = 2634.1 km
    J: [1.3748e-4],
    c22: 3.874e-5,
    tidal: {
      k2: 0.804, // Harada et al. 2019
      tidalQ: 100
    },
    poleRA: 269.9949,
    poleDec: 64.57
  },

  {
    name: "Callisto",
    mass: 1.0756608e23, // GM: 7179.2834e9 / 6.67430e-11
    radius: 2410.3e3,
    radii: { x: 2410.3e3, y: 2410.3e3, z: 2410.3e3 },
    color: 0x5e564d,
    texture: "/Callisto.jpg",
    parent: "Jupiter",
    rotationPeriod: 400.536,
    axialTilt: 0.0,
    meanTemperature: 134,
    surfaceGravity: 1.236,
    jplId: "504",
    type: "moon",
    // Anderson et al. 2001, Icarus (Galileo flybys) — R_ref = 2410.3 km
    J: [3.27e-5],
    c22: 1.04e-5,
    tidal: {
      k2: 0.03, // Undifferentiated ice/rock; Castillo-Rogez et al. 2019 estimate
      tidalQ: 100
    },
    poleRA: 268.72,
    poleDec: 64.83
  },

{
    name: "Saturn",
    mass: 5.68317e26, // GM: 37931206.234 (System GM - Baseline)
    radius: 60330e3,  // R_ref = IAU conventional equatorial radius — matches Jn literature
    radii: { x: 60268e3, y: 54364e3, z: 60268e3 }, // physical shape
    color: 0xf4d03f,
    ringColor: 0xa89f91,
    hasRings: true,
    texture: "/Saturn.jpg",
    poleRA: 40.589,
    poleDec: 83.537,
    poleRA_rate: -0.036, // deg/century
    poleDec_rate: -0.004, // deg/century
    tidal: {
      k2: 0.341,
      tidalQ: 10000.0
    },    rotationPeriod: 10.656,
    W0: 38.90,
    Wdot: 810.7939024,
    axialTilt: 26.73,
    meanTemperature: 134,
    surfaceGravity: 10.44,
    jplId: "699",
    type: "planet",
    // Iess et al. 2019 (Cassini Grand Finale) — R_ref = 60330 km
    J: [1.629071e-2, 0.0, -9.3583e-4, 0.0, 8.614e-5, 0.0, -1.467e-5, 0.0, 4.597e-6],
    ringInnerRadius: 74500e3,
    ringOuterRadius: 140220e3,
    ringTexture: "/SaturnRings.png",
    ringOpacity: 0.9,
    rel_a: 9.5549 * AU,
    rel_e: 0.055723,
    rel_i: 2.485
  },

  {
    name: "Titan",
    mass: 1.3451807e23, // GM: 8978.14e9 / 6.67430e-11
    radius: 2574.7e3,
    radii: { x: 2574.7e3, y: 2574.7e3, z: 2574.7e3 },
    color: 0xe3c968,
    texture: "/Titan.jpg",
    parent: "Saturn",
    rotationPeriod: 382.687,
    axialTilt: 0.0,
    meanTemperature: 94,
    surfaceGravity: 1.352,
    jplId: "606",
    type: "moon",
    // Iess et al. 2012, Science (Cassini) — R_ref = 2574.7 km
    J: [3.19e-5],
    c22: 1.09e-5,
    tidal: {
      k2: 0.637, // Lainey et al. 2020
      tidalQ: 70
    },
    poleRA: 36.41,
    poleDec: 83.94
  },

  {
    name: "Enceladus",
    mass: 1.080263e20, // GM: 7.21e9 / 6.67430e-11
    radius: 252.1e3,
    radii: { x: 256.6e3, y: 248.3e3, z: 251.4e3 },
    color: 0xffffff,
    texture: "/Enceladus.jpg",
    parent: "Saturn",
    rotationPeriod: 32.885,
    axialTilt: 0.0,
    meanTemperature: 75,
    surfaceGravity: 0.113,
    jplId: "602",
    type: "moon",
    tidal: {
      k2: 0.0045, // Nimmo et al. 2018 (Cassini); k2/Q ≈ 1.5e-4
      tidalQ: 30
    },
    poleRA: 40.66,
    poleDec: 83.52
  },
// tests/fixtures/bodies.json



  {
    name: "Uranus",
    mass: 8.6809842e25, // GM: 5793951.3e9 / 6.67430e-11 (Planet Only)
    radius: 25559e3,
    radii: { x: 25559e3, y: 24973e3, z: 25559e3 },
    color: 0xadd8e6,
    texture: "/Uranus.jpg",
    rotationPeriod: -17.24,
    axialTilt: 97.77,
    meanTemperature: 76,
    surfaceGravity: 8.69,
    jplId: "799",
    type: "planet",
    // Anderson et al. 1987 / Jacobson 2014 — R_ref = 25559 km
    J: [3.343e-3, -4.2e-6, -3.4e-5],
    tidal: {
      k2: 0.104, // Gavrilov & Zharkov 1977
      tidalQ: 11000
    },
    // FIXED: Use JPL Ephemeris Pole (Jacobson 2014) to match moon positions
    poleRA: 257.43,
    poleDec: -15.10,
    W0: 203.81,
    Wdot: -501.1600928,
    hasRings: true,
    ringInnerRadius: 38000e3,
    ringOuterRadius: 51000e3,
    ringTexture: "/UranusRings.png",
    ringColor: 0x333333,
    ringOpacity: 0.25,
    rel_a: 19.2184 * AU,
    rel_e: 0.047167,
    rel_i: 0.772
  },

{
    name: "Titania",
    mass: 3.399607e21, // GM: 226.9e9 / 6.67430e-11 
    radius: 788.4e3,
    radii: { x: 788.4e3, y: 788.4e3, z: 788.4e3 },
    color: 0xd3d3d3,
    texture: "/Titania.jpg",
    parent: "Uranus",
    rotationPeriod: 208.93,
    axialTilt: 0.0,
    meanTemperature: 60,
    surfaceGravity: 0.380,
    jplId: "703",
    type: "moon",
    poleRA: 257.43, 
    poleDec: -15.10,
  },

{
    name: "Oberon",
    mass: 3.075985e21, // GM: 205.3e9 / 6.67430e-11 
    radius: 761.4e3,
    radii: { x: 761.4e3, y: 761.4e3, z: 761.4e3 },
    color: 0xa0a0a0,
    texture: "/Oberon.jpg",
    parent: "Uranus",
    rotationPeriod: 323.11,
    axialTilt: 0.0,
    meanTemperature: 61,
    surfaceGravity: 0.346,
    jplId: "704",
    type: "moon",
    poleRA: 257.43, 
    poleDec: -15.10,
  },

  {
    name: "Neptune",
    mass: 1.0240915e26, // GM: 6835098.6e9 / 6.67430e-11 (Planet Only)
    radius: 24622e3,
    radii: { x: 24764e3, y: 24341e3, z: 24764e3 },
    color: 0x00008b,
    texture: "/Neptune.jpg",
    rotationPeriod: 16.11,
    axialTilt: 28.32,
    meanTemperature: 55,
    surfaceGravity: 11.15,
    jplId: "899",
    type: "planet",
    J: [3.411e-3, -4.0e-6, -3.3e-5],
    poleRA: 299.36,
    poleDec: 41.28,
    W0: 253.18,
    Wdot: 536.3128492,
    hasRings: true,
    ringInnerRadius: 41000e3,
    ringOuterRadius: 63000e3,
    ringTexture: "/NeptuneRings.png",
    ringColor: 0x444444,
    ringOpacity: 0.2,
    rel_a: 30.110387 * AU,
    rel_e: 0.00859,
    rel_i: 1.770
  },

  {
    name: "Triton",
    mass: 2.14030e22, // GM: 1428.495e9 / 6.67430e-11
    radius: 1353.4e3,
    radii: { x: 1353.4e3, y: 1353.4e3, z: 1353.4e3 },
    color: 0xffe4e1,
    texture: "/Triton.jpg",
    parent: "Neptune",
    rotationPeriod: -141.044,
    axialTilt: 0.0,
    meanTemperature: 38,
    surfaceGravity: 0.779,
    jplId: "801",
    type: "moon",
    poleRA: 299.36,
    poleDec: 41.17
  },

  ...EXTENDED_BODIES
];