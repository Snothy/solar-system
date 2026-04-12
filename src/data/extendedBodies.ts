/* extendedBodies_fixed.ts 
   Cleaned/validated extended bodies and small bodies list.
*/

import type { CelestialBodyData } from "../types";

const AU = 1.495978707e11;

export const EXTENDED_BODIES: CelestialBodyData[] = [
  {
    name: "Ceres",
    // GM from Horizons 2021/2026: 62.6284 km³/s² -> m³/s²
    gm: 62.6284e9,

    // Equatorial Radius (from Dawn mission results)
    equatorialRadius: 482000.0,

    // Standard Gravity Reference Radius (Mean radius from snippet)
    jRefRadius: 469700.0,

    radii: {
      x: 482000.0, // Equatorial
      y: 446000.0, // Polar (Shortest axis)
      z: 482000.0, // Equatorial
    },

    color: 0x888888,
    texture: "/Ceres.jpg",

    // Sidereal rotation: 9.07417 hours
    rotationPeriod: 9.07417,
    axialTilt: 4.0,
    meanTemperature: 168,

    // Calculated: GM / R_mean^2
    surfaceGravity: 0.27,

    jplId: "1",
    type: "dwarf planet",

    // Zonal Harmonics (Dawn Mission data: Konopliv et al. 2018)
    // Normalized to 469.7 km
    J: [
      1.286e-2, // J2
      0.0, // J3
      -1.4e-4, // J4
    ],

    poleRA: 291.41,
    poleDec: 66.76,

    albedo: 0.09,

    // Orbital data from 2020 Epoch
    rel_a: 2.76928929 * AU,
    rel_e: 0.07687465,
    rel_i: 10.591277,
  },

  {
    name: "Vesta",
    // GM from Horizons 2026 update: 17.28828 km³/s² -> m³/s²
    gm: 17.28828e9,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 286300.0,

    // Standard Dawn Mission Reference Radius for Harmonics
    jRefRadius: 265000.0,

    radii: {
      x: 286300.0, // Longest equatorial axis
      y: 223200.0, // Polar axis (Assuming Y-up)
      z: 279100.0, // Intermediate equatorial axis
    },

    color: 0x999999,
    texture: "/Vesta.png",

    // Sidereal rotation: 5.342128 hours
    rotationPeriod: 5.342128,
    axialTilt: 29.0,
    meanTemperature: 143,

    // Calculated average surface gravity
    surfaceGravity: 0.22,

    jplId: "4",
    type: "asteroid",

    // Zonal & Sectorial Harmonics (Park et al. 2014)
    // Vesta's shape is so irregular that J2 is massive.
    J: [
      3.175e-2, // J2 (Very high due to non-spherical shape)
      0.0,
      -1.3e-3, // J4
    ],
    c22: 4.0e-4,

    poleRA: 301.04,
    poleDec: 42.23,

    albedo: 0.4228,

    // Orbital data (Epoch 2020)
    rel_a: 2.36190865 * AU,
    rel_e: 0.08857261,
    rel_i: 7.141815,
  },

  {
    name: "Pallas",
    // GM from Horizons 2026 solution: 13.63 km³/s² -> m³/s²
    gm: 13.63e9,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 282500.0,

    // Standard Gravity Reference Radius (Volumetric mean from snippet)
    jRefRadius: 256500.0,

    radii: {
      x: 282500.0, // a-axis
      y: 250500.0, // c-axis (Polar - Assuming Y-up)
      z: 258500.0, // b-axis
    },

    color: 0xaaaaaa,
    texture: "/Pallas.png",

    // Sidereal rotation: 7.813221 hours
    rotationPeriod: 7.813221,

    // Extreme axial tilt (84°) - Pallas is essentially on its side
    axialTilt: 84.0,
    meanTemperature: 164,

    // Calculated average surface gravity
    surfaceGravity: 0.18,

    jplId: "2",
    type: "asteroid",

    // Estimated Harmonics (Pallas is not in hydrostatic equilibrium)
    J: [
      0.051, // J2 (Higher than Vesta due to more irregular mass distribution)
    ],

    poleRA: 34.83,
    poleDec: -2.93,

    albedo: 0.155,

    // High-inclination Orbit Data
    rel_a: 2.7730231 * AU,
    rel_e: 0.2306545,
    rel_i: 34.8397,
  },

  {
    name: "Hygiea",
    // GM from Horizons 2026: 7.0 km³/s² -> m³/s²
    gm: 7.0e9,

    // Equatorial Radius (from SPHERE/VLT measurements)
    equatorialRadius: 216000.0,

    // Standard Gravity Reference Radius (Volumetric mean from snippet)
    jRefRadius: 203560.0,

    radii: {
      x: 216000.0,
      y: 195000.0, // Slight polar flattening (~203.6 mean)
      z: 216000.0,
    },

    color: 0x333333,
    texture: "/Hygiea.jpg",

    // Sidereal rotation: 13.828 hours
    rotationPeriod: 13.828,

    // Substantial axial tilt
    axialTilt: 60.0,
    meanTemperature: 164,

    // Average surface gravity
    surfaceGravity: 0.091,

    jplId: "10",
    type: "asteroid",

    // Zonal Harmonics (Theoretical based on high sphericity)
    J: [
      0.012, // J2
    ],

    poleRA: 308.57,
    poleDec: 41.65,

    albedo: 0.0717,

    // Orbital data (Outer Main Belt)
    rel_a: 3.1404987 * AU,
    rel_e: 0.11265498,
    rel_i: 3.8316,
  },
  {
    name: "1P/Halley",
    // Mass is ~2.2e14 kg. GM is too small to be listed in JPL physical params (n.a.)
    // Standard estimate: 1.468e-7 km³/s²
    gm: 1.468e2,

    // Volumetric Mean Radius (5.5 km)
    equatorialRadius: 5500.0,
    jRefRadius: 5500.0,

    radii: {
      x: 7500.0, // Halley is peanut-shaped (~15x8x8 km)
      y: 4000.0,
      z: 4000.0,
    },

    color: 0x444444,
    texture: "/1P_Halley.jpg",
    parent: "Sun",

    // Complex rotation: 52.8 hours is the primary nutation period
    rotationPeriod: 52.8,
    axialTilt: 18.0,
    meanTemperature: 200,

    // Extremely low gravity (~1/10000th of Earth)
    surfaceGravity: 0.001,

    jplId: "90000030",
    type: "comet",

    // Halley's pole is not well-defined but often estimated near:
    poleRA: 39.0,
    poleDec: -54.0,

    // Highly Eccentric Retrograde Orbit
    rel_a: 17.928635 * AU,
    rel_e: 0.967936,
    rel_i: 162.1905,

    // Last Perihelion (TP): 1986-Feb-08
    // Next Perihelion: 2061-Jul-28
  },

  {
    name: "Pluto",
    // GM from Brozovic & Jacobson (2024): 869.326 km³/s² -> m³/s²
    gm: 869.326e9,

    // IAU 2015/Horizons Volumetric Mean Radius
    equatorialRadius: 1188300.0,
    jRefRadius: 1188300.0,

    radii: {
      x: 1188300.0,
      y: 1188300.0, // Pluto is very nearly spherical
      z: 1188300.0,
    },

    color: 0xe3c9a6,
    texture: "/Pluto.jpg",

    // Retrograde rotation (~6.387 days)
    rotationPeriod: -153.293352,
    axialTilt: 122.53,
    meanTemperature: 44,

    // Surface gravity from 2024 solution
    surfaceGravity: 0.611,

    jplId: "999",
    type: "dwarf planet",

    // Gravity Harmonics (Small for Pluto, but used in PLU060)
    J: [0.0],

    poleRA: 132.99,
    poleDec: -6.16,
    albedo: 0.52,

    // Orbital parameters (Mean values)
    rel_a: 39.4821 * AU,
    rel_e: 0.2488,
    rel_i: 17.16,
  },
  {
    name: "Charon",
    // GM from Brozovic & Jacobson (2024): 106.10 km³/s² -> m³/s²
    gm: 106.1e9,

    // IAU 2015 Volumetric Mean Radius
    equatorialRadius: 606000.0,
    jRefRadius: 606000.0,

    radii: {
      x: 606000.0,
      y: 606000.0, // Charon is remarkably spherical for its size
      z: 606000.0,
    },

    color: 0x888888,
    texture: "/Charon.jpg",
    parent: "Pluto",

    // Tidally locked to Pluto (~6.387 days)
    // Matches Pluto's rotation magnitude
    rotationPeriod: 153.293328,
    axialTilt: 0.0,
    meanTemperature: 53,

    // Calculated: GM / r^2 ≈ 0.288 m/s²
    surfaceGravity: 0.288,

    jplId: "901",
    type: "moon",

    // Gravity Harmonics (Negligible for general simulation)
    J: [0.0],

    // Pole aligns with Pluto's pole
    poleRA: 132.99,
    poleDec: -6.16,

    // Orbital data (Planet-centered equatorial)
    rel_a: 19600e3,
    rel_e: 0.0,
    rel_i: 0.0,
  },

  {
    name: "Eris",
    // GM mid-range (1069.1 - 1089.3): ~1108e9 m³/s² (system barycenter)
    // Primary body GM is roughly 1095e9 m³/s²
    gm: 1095.0e9,

    // Volumetric Mean Radius (1163 km)
    equatorialRadius: 1163000.0,
    jRefRadius: 1163000.0,

    radii: {
      x: 1163000.0,
      y: 1163000.0,
      z: 1163000.0,
    },

    color: 0xffffff,
    texture: "/Eris.jpg",

    // Sidereal rotation: 25.9 hours
    rotationPeriod: 25.9,

    // Extreme axial tilt (78°)
    axialTilt: 78.0,
    meanTemperature: 42,

    // Calculated: GM / r^2 ≈ 0.81 m/s²
    surfaceGravity: 0.82,

    jplId: "136199",
    type: "dwarf planet",

    // Eris is highly reflective due to frozen nitrogen/methane (Albedo 0.97)
    albedo: 0.97,

    // Zonal Harmonics (Not currently mapped by flyby)
    J: [0.0],

    // Approximate pole for current TNO solutions
    poleRA: 43.0,
    poleDec: -1.0,

    // Orbital data (Scattered Disc)
    rel_a: 67.864 * AU,
    rel_e: 0.436,
    rel_i: 44.0,
  },

  {
    name: "Haumea",
    // GM from 2022 TNO solution: 264.413 km³/s² -> m³/s²
    gm: 264.413e9,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 1050000.0,

    // Standard Gravity Reference Radius (Volumetric Mean ~780km)
    jRefRadius: 780000.0,

    radii: {
      x: 1050000.0, // Longest axis (a)
      y: 537000.0, // Shortest axis / Polar (c)
      z: 840000.0, // Intermediate axis (b)
    },

    color: 0xdbdbdb,
    texture: "/Haumea.jpg",

    // Extreme high-speed rotation: 3.915341 hours
    rotationPeriod: 3.915341,
    axialTilt: 28.2,
    meanTemperature: 50,

    // Calculated average surface gravity
    surfaceGravity: 0.401,

    jplId: "136108",
    type: "dwarf planet",

    // Haumea's J2 is enormous due to its extreme elongation
    J: [
      0.24, // Estimated J2 based on triaxial shape
    ],

    poleRA: 249.0,
    poleDec: 28.0,

    albedo: 0.66,

    // Orbital data (Classical Kuiper Belt)
    rel_a: 43.116 * AU,
    rel_e: 0.196,
    rel_i: 28.21,
  },

  {
    name: "Makemake",
    // GM derived from MK2 satellite dynamics: ~195-210 km³/s²
    gm: 207.0e9,

    // Equatorial Radius (~715–739 km)
    equatorialRadius: 739000.0,

    // Standard Gravity Reference Radius (Volumetric mean)
    jRefRadius: 715000.0,

    radii: {
      x: 739000.0, // Equatorial
      y: 715000.0, // Polar (c-axis)
      z: 739000.0, // Equatorial
    },

    color: 0xddbb99,
    texture: "/Makemake.jpg",

    // Sidereal rotation from 2026 snippet: 22.8266 hours
    rotationPeriod: 22.8266,

    // Axial tilt is poorly constrained; 29° is a common placeholder
    axialTilt: 29.0,
    meanTemperature: 30,

    // Calculated: GM / r_mean²
    surfaceGravity: 0.404,

    jplId: "136472",
    type: "dwarf planet",

    // Highly reflective methane ice (Albedo ~0.77 - 0.81)
    albedo: 0.81,

    poleRA: 290.0,
    poleDec: 29.0,

    // Orbital data (Classical Kuiper Belt / Cubewano)
    rel_a: 45.60378 * AU,
    rel_e: 0.157058,
    rel_i: 28.9811,
  },

  {
    name: "Quaoar",
    // GM from 2022 TNO solution: 95.6 km³/s² -> m³/s²
    gm: 95.6e9,

    // Effective Radius (R_eff)
    equatorialRadius: 569000.0,

    // Standard Gravity Reference Radius (R_eff from snippet)
    jRefRadius: 555000.0,

    radii: {
      x: 569000.0, // Equatorial
      y: 518000.0, // Polar
      z: 569000.0, // Equatorial
    },

    color: 0x884422,
    texture: "/Quaoar.jpg",

    // Sidereal rotation: 8.8394 hours
    rotationPeriod: 8.8394,
    axialTilt: 0.0,
    meanTemperature: 44,

    // Calculated: GM / R_eff² ≈ 0.31 m/s²
    surfaceGravity: 0.31,

    jplId: "50000",
    type: "dwarf planet", // Often classified as candidate dwarf planet

    // Low albedo (0.109) makes it much darker than Pluto or Eris
    albedo: 0.109,

    // Quaoar has a unique ring system located at ~4000 km
    hasRings: true,
    ringInnerRadius: 4000000.0,
    ringOuterRadius: 4100000.0,

    // Orbital data (Classical Kuiper Belt)
    rel_a: 43.69 * AU,
    rel_e: 0.038,
    rel_i: 7.99,
  },

  {
    name: "Sedna",
    // Estimated mass for ~1000km diameter body: ~1e21 kg
    // GM estimated: 66.7 km³/s² -> m³/s²
    gm: 66.7e9,

    // Volumetric Mean Radius (approx. 498 km from occultation/Herschel)
    equatorialRadius: 498000.0,
    jRefRadius: 498000.0,

    radii: {
      x: 498000.0,
      y: 498000.0,
      z: 498000.0,
    },

    color: 0xff3300, // Sedna is one of the reddest objects in the solar system
    texture: "/Sedna.jpg",

    // Sidereal rotation from 2026 snippet: 10.273 hours
    rotationPeriod: 10.273,
    axialTilt: 0.0,
    meanTemperature: 12, // Extremely cold; far from the Sun

    // Calculated: GM / r² ≈ 0.27 m/s²
    surfaceGravity: 0.27,

    jplId: "90377",
    type: "dwarf planet", // Candidate dwarf planet

    // Albedo estimate (Herschel/Spitzer): ~0.32
    albedo: 0.32,

    // Orbital data (Extreme Trans-Neptunian Object / Sednoid)
    rel_a: 479.9527 * AU,
    rel_e: 0.8414,
    rel_i: 11.9295,

    // Perihelion is approaching! (August 2076)
  },

  {
    name: "Mimas",
    gm: 2.503489e9,

    // SYNC: Set jRefRadius to the Mean Radius (198.8km) to match J2 normalization
    jRefRadius: 198800.0,

    // Equatorial radius (a) remains 207.4km for geometry/collisions
    equatorialRadius: 207400.0,

    radii: {
      x: 207400.0,
      y: 190600.0,
      z: 196200.0,
    },

    color: 0xaaaaaa,
    texture: "/Mimas.jpg",
    parent: "Saturn",

    rotationPeriod: 22.6181232, // (0.9424218 * 24)
    axialTilt: 0.0,
    meanTemperature: 64,

    // Matches JPL ge precisely
    surfaceGravity: 0.063345,

    jplId: "601",
    type: "moon",
    albedo: 0.6,

    // These coefficients are typically normalized to Mean Radius (198.8km)
    J: [0.0125],
    c22: 0.0031,

    tidal: { k2: 0.023, tidalQ: 1000 },

    poleRA: 40.589,
    poleDec: 83.537,

    rel_a: 185540e3,
    rel_e: 0.0196,
    rel_i: 1.572,
  },

  {
    name: "Tethys",
    // GM from Horizons 2022: 41.210681 km³/s² -> m³/s²
    gm: 41.210681e9,

    // SYNC: Reference Radius set to Volumetric Mean (531.1 km)
    jRefRadius: 531100.0,

    // Equatorial Radius (a-axis) remains 536.3 km
    equatorialRadius: 536300.0,

    radii: {
      x: 536300.0, // Sub-Saturnian (a)
      y: 528300.0, // Polar (c)
      z: 531100.0, // Leading/Trailing (b)
    },

    color: 0xcccccc,
    texture: "/Tethys.jpg",
    parent: "Saturn",

    // Synchronous rotation (~1.887 days)
    rotationPeriod: 45.30888,
    axialTilt: 0.0,
    meanTemperature: 86,

    // Calculated: GM / R_mean² ≈ 0.146 m/s²
    surfaceGravity: 0.146,

    jplId: "603",
    type: "moon",
    albedo: 0.8,

    // Harmonics scaled to Mean Radius (531.1 km)
    J: [0.0071],
    c22: 0.0019,

    // High ice content; low dissipation
    tidal: { k2: 0.03, tidalQ: 500 },

    poleRA: 40.589,
    poleDec: 83.537,

    rel_a: 294660e3,
    rel_e: 0.0001,
    rel_i: 1.12,
  },

  {
    name: "Dione",
    // GM from Horizons 2022: 73.116 km³/s² -> m³/s²
    gm: 73.116e9,

    // Reference radius for J calculations (Equatorial a-axis)
    jRefRadius: 563800.0,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 563800.0,

    radii: {
      x: 563800.0, // Sub-Saturnian (a)
      y: 559600.0, // Polar (c) - Adjusted to standard triaxiality
      z: 561000.0, // Leading/Trailing (b)
    },

    color: 0x999999,
    texture: "/Dione.jpg",
    parent: "Saturn",

    // Synchronized to 2.736915d period
    rotationPeriod: 65.68596,
    axialTilt: 0.0,
    meanTemperature: 87,

    // Calculated: GM / R_mean² ≈ 0.231 m/s²
    surfaceGravity: 0.231,

    jplId: "604",
    type: "moon",
    albedo: 0.6,

    // Gravity Harmonics (scaled to R = 563.8 km)
    J: [0.0014],

    // Stronger rock core implied by density (1.469 g/cm³)
    tidal: { k2: 0.034, tidalQ: 600 },

    // Aligned to Saturn's IAU Pole
    poleRA: 40.66,
    poleDec: 83.52,

    // Orbital Data
    rel_a: 377420e3,
    rel_e: 0.0022,
    rel_i: 0.028,
  },

  {
    name: "Rhea",
    // GM from Horizons 2022: 153.94 km³/s² -> m³/s²
    gm: 153.94e9,

    // Reference radius for gravity harmonics (Equatorial a-axis)
    jRefRadius: 766500.0,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 766500.0,

    radii: {
      x: 766500.0, // Sub-Saturnian (a)
      y: 762500.0, // Polar (c) - Standard Shortest
      z: 764500.0, // Leading/Trailing (b)
    },

    color: 0xaaaaaa,
    texture: "/Rhea.jpg",
    parent: "Saturn",

    // Synchronized to 4.518d orbital period
    rotationPeriod: 108.432,
    axialTilt: 0.0,
    meanTemperature: 76,

    // Calculated: GM / R_mean² ≈ 0.264 m/s²
    surfaceGravity: 0.264,

    jplId: "605",
    type: "moon",
    albedo: 0.6,

    // Gravity Harmonics (scaled to R = 766.5 km)
    J: [7.947e-4],

    // Interior: Mostly water ice with ~25% silicate rock
    tidal: { k2: 0.032, tidalQ: 400 },

    // Aligned to Saturn's IAU Pole
    poleRA: 40.589,
    poleDec: 83.537,

    // Orbital Data
    rel_a: 527070e3,
    rel_e: 0.001,
    rel_i: 0.331,
  },

  {
    name: "Iapetus",
    // GM from Horizons 2022: 120.52 km³/s² -> m³/s²
    gm: 120.52e9,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 746000.0,

    // Standard Gravity Reference Radius (Volumetric Mean)
    jRefRadius: 734500.0,

    radii: {
      x: 746000.0, // Equatorial (Bulge)
      y: 712000.0, // Polar
      z: 746000.0, // Equatorial
    },

    color: 0x666666, // Darker base color due to Cassini Regio
    texture: "/Iapetus.jpg",
    parent: "Saturn",

    // Synchronized to 79.33d period
    rotationPeriod: 1903.92,
    axialTilt: 0.0,
    meanTemperature: 110,

    // Calculated: GM / R_mean² ≈ 0.223 m/s²
    surfaceGravity: 0.223,

    jplId: "608",
    type: "moon",

    // Extreme Albedo variation: 0.04 (dark) to 0.6 (bright)
    albedo: 0.32,

    // Gravity Harmonics (scaled to R = 734.5 km)
    J: [0.033], // High J2 due to fossil bulge

    // Aligned to the local Laplace plane
    poleRA: 40.58,
    poleDec: 83.54,

    // Orbital Data (Distant and Inclined)
    rel_a: 3560840e3,
    rel_e: 0.0283,
    rel_i: 7.489,
  },

  {
    name: "Miranda",
    // GM from Horizons 2025: 4.3 km³/s² -> m³/s²
    gm: 4.3e9,

    // Reference radius for J calculations (Equatorial a-axis)
    jRefRadius: 240000.0,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 240000.0,

    radii: {
      x: 240000.0, // Sub-Uranian (a)
      y: 232900.0, // Polar (c)
      z: 234200.0, // Leading/Trailing (b)
    },

    color: 0xcccccc,
    texture: "/Miranda.png",
    parent: "Uranus",

    // Synchronized to 1.413476d period
    rotationPeriod: 33.912,
    axialTilt: 0.0,
    meanTemperature: 60,

    // Calculated: GM / R_mean² ≈ 0.077 m/s²
    surfaceGravity: 0.079,

    jplId: "705",
    type: "moon",
    albedo: 0.27,

    // Gravity Harmonics (scaled to R = 240.0 km)
    J: [5.25e-3],

    // Highly irregular interior; tidal heating history
    tidal: { k2: 0.01, tidalQ: 200 },

    // Aligned to Uranus IAU Pole
    poleRA: 257.43,
    poleDec: -15.1,

    // Orbital Data
    rel_a: 129800e3,
    rel_e: 0.0027,
    // Note: Retrograde relative to the ecliptic (175.78°)
    rel_i: 175.78,
  },

  {
    name: "Ariel",
    // GM from Horizons 2025: 83.43 km³/s² -> m³/s²
    gm: 83.43e9,

    // Reference radius for gravity (Equatorial a-axis)
    jRefRadius: 581100.0,

    // Equatorial Radius (Longest axis 'a')
    equatorialRadius: 581100.0,

    radii: {
      x: 581100.0, // Sub-Uranian (a)
      y: 577700.0, // Polar (c) - Standard shortest for Y-up
      z: 577900.0, // Leading/Trailing (b)
    },

    color: 0xdddddd,
    texture: "/Ariel.png",
    parent: "Uranus",

    // Synchronized to 2.520d period
    rotationPeriod: 60.48,
    axialTilt: 0.0,
    meanTemperature: 60,

    // Calculated: GM / R_mean² ≈ 0.249 m/s²
    surfaceGravity: 0.249,

    jplId: "701",
    type: "moon",
    albedo: 0.34,

    // Estimated Harmonics (scaled to R = 581.1 km)
    J: [0.0012],

    // Interior: ~50% rock core, 50% ice (Density 1.54 g/cm³)
    tidal: { k2: 0.04, tidalQ: 150 },

    // Aligned to Uranus IAU Pole
    poleRA: 257.43,
    poleDec: -15.1,

    // Orbital Data
    rel_a: 191200e3,
    rel_e: 0.0034,
    // Retrograde orbit relative to the ecliptic (179.69°)
    rel_i: 179.69,
  },

  {
    name: "Umbriel",
    // GM from Horizons 2025: 85.40 km³/s² -> m³/s²
    gm: 85.4e9,

    // Volumetric Mean Radius (584.7 km)
    equatorialRadius: 584700.0,
    jRefRadius: 584700.0,

    radii: {
      x: 584700.0, // Sub-Uranian (a)
      y: 584700.0, // Polar (c)
      z: 584700.0, // Leading/Trailing (b)
    },

    color: 0x555555, // Darker charcoal grey compared to Ariel
    texture: "/Umbriel.webp",
    parent: "Uranus",

    // Synchronized to 4.144d orbital period
    rotationPeriod: 99.456,
    axialTilt: 0.0,
    meanTemperature: 60,

    // Calculated: GM / r² ≈ 0.25 m/s²
    surfaceGravity: 0.25,

    jplId: "702",
    type: "moon",

    // Low Albedo (0.18): Much darker than its neighbors
    albedo: 0.18,

    // Gravity Harmonics (scaled to R = 584.7 km)
    J: [0.001],

    // Interior: Rock/Ice mix (Density 1.52 g/cm³)
    tidal: { k2: 0.03, tidalQ: 300 },

    // Aligned to Uranus IAU Pole
    poleRA: 257.43,
    poleDec: -15.1,

    // Orbital Data
    rel_a: 266000e3,
    rel_e: 0.005,
    // Retrograde orbit relative to the ecliptic (179.64°)
    rel_i: 179.64,
  },
];
