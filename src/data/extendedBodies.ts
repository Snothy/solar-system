/* extendedBodies_fixed.ts 
   Cleaned/validated extended bodies and small bodies list.
*/

import type { CelestialBodyData } from "../types";

export const EXTENDED_BODIES: CelestialBodyData[] = [
  {
    name: "Ceres",
    // Recalibrated: 62.6284e9 / 6.67430e-11
    mass: 9.3835158743e20,
    radius: 482e3, // Set to Equatorial
    radii: { x: 482e3, y: 446e3, z: 482e3 },
    color: 0x888888,
    texture: "/Ceres.jpg",
    rotationPeriod: 9.07417,
    axialTilt: 4,
    meanTemperature: 168,
    surfaceGravity: 0.27,
    jplId: "1",
    type: "dwarf planet",
    shape: "sphere",
    poleRA: 291.41,
    poleDec: 66.76,
    rel_a: 2.76928929 * 1.495978707e11,
    rel_e: 0.07687465,
    rel_i: 10.591277,
  },

  {
    name: "Vesta",
    // Recalibrated: 17.29e9 / 6.67430e-11
    mass: 2.59053385e20,
    radius: 286.3e3, // Set to Equatorial
    radii: { x: 286.3e3, y: 223.2e3, z: 279.1e3 },
    color: 0x999999,
    texture: "/Vesta.png",
    rotationPeriod: 5.342,
    axialTilt: 29,
    meanTemperature: 143,
    surfaceGravity: 0.22,
    jplId: "4",
    type: "asteroid",
    shape: "sphere",
    poleRA: 301.04,
    poleDec: 42.23,
  },

  {
    name: "Pallas",
    // Recalibrated: 14.3e9 / 6.67430e-11
    mass: 2.142546e20,
    radius: 272.5e3, // Set to Equatorial
    radii: { x: 272.5e3, y: 258.5e3, z: 282.5e3 },
    color: 0xaaaaaa,
    texture: "/Pallas.png",
    rotationPeriod: 7.813,
    axialTilt: 84,
    meanTemperature: 164,
    surfaceGravity: 0.21,
    jplId: "2",
    type: "asteroid",
    shape: "sphere",
    poleRA: 34.83,
    poleDec: -2.93,
  },

  {
    name: "Hygiea",
    // Recalibrated: 5.4e9 / 6.67430e-11
    mass: 8.090736e19,
    radius: 216e3,
    radii: { x: 216e3, y: 216e3, z: 216e3 },
    color: 0x333333,
    texture: "/Hygiea.jpg",
    rotationPeriod: 13.82,
    axialTilt: 60,
    meanTemperature: 164,
    surfaceGravity: 0.09,
    jplId: "10",
    type: "asteroid",
    shape: "sphere",
    poleRA: 308.57,
    poleDec: 41.65,
  },

  {
    name: "1P/Halley",
    mass: 2.2e14,
    radius: 5.5e3,
    color: 0x444444,
    texture: "/1P_Halley.jpg",
    rotationPeriod: 52.8,
    axialTilt: 0,
    meanTemperature: 200,
    surfaceGravity: 0.001,
    jplId: "90000030",
    type: "comet",
    shape: "sphere",
    poleRA: 0,
    poleDec: 0,
  },

  {
    name: "Pluto",
    // Recalibrated: 869.326e9 / 6.67430e-11
    mass: 1.30249764e22,
    radius: 1188.3e3,
    radii: { x: 1188.3e3, y: 1188.3e3, z: 1188.3e3 },
    color: 0xe3c9a6,
    texture: "/Pluto.jpg",
    rotationPeriod: -153.29335,
    axialTilt: 122.53,
    meanTemperature: 44,
    surfaceGravity: 0.611,
    jplId: "999",
    type: "dwarf planet",
    shape: "sphere",
    poleRA: 132.99,
    poleDec: -6.16,
    albedo: 0.52,
    rel_a: 39.482 * 1.495978707e11,
    rel_e: 0.2488,
    rel_i: 17.16,
  },

  {
    name: "Charon",
    // Recalibrated: 106.10e9 / 6.67430e-11
    mass: 1.58967982e21,
    radius: 606.0e3,
    radii: { x: 606.0e3, y: 606.0e3, z: 606.0e3 },
    color: 0x888888,
    texture: "/Charon.jpg",
    parent: "Pluto",
    rotationPeriod: 153.2933,
    axialTilt: 0,
    meanTemperature: 53,
    surfaceGravity: 0.288,
    jplId: "901",
    type: "moon",
    poleRA: 132.99,
    poleDec: -6.16,
    rel_a: 19600e3,
    rel_e: 0.0,
    rel_i: 0.0,
  },

  {
    name: "Eris",
    // Recalibrated: 1108e9 / 6.67430e-11
    mass: 1.66010068e22,
    radius: 1163e3,
    radii: { x: 1163e3, y: 1163e3, z: 1163e3 },
    color: 0xffffff,
    texture: "/Eris.jpg",
    rotationPeriod: 25.9,
    axialTilt: 78,
    meanTemperature: 42,
    surfaceGravity: 0.82,
    jplId: "136199",
    type: "dwarf planet",
    albedo: 0.96,
  },

  {
    name: "Haumea",
    // Recalibrated: 267.4e9 / 6.67430e-11
    mass: 4.006412e21,
    radius: 980e3, // Set to Equatorial
    radii: { x: 980e3, y: 498e3, z: 759e3 },
    color: 0x999999,
    texture: "/Haumea.jpg",
    rotationPeriod: 3.915,
    axialTilt: 28,
    meanTemperature: 50,
    surfaceGravity: 0.4,
    jplId: "136108",
    type: "dwarf planet",
    shape: "model",
    albedo: 0.7,
  },

  {
    name: "Makemake",
    // Recalibrated: 207e9 / 6.67430e-11
    mass: 3.101449e21,
    radius: 715e3,
    radii: { x: 715e3, y: 715e3, z: 715e3 },
    color: 0xddbb99,
    texture: "/Makemake.jpg",
    rotationPeriod: 22.83,
    axialTilt: 29,
    meanTemperature: 30,
    surfaceGravity: 0.4,
    jplId: "136472",
    type: "dwarf planet",
    albedo: 0.8,
  },

  {
    name: "Quaoar",
    mass: 1.4e21,
    radius: 555e3,
    color: 0x884422,
    texture: "/Quaoar.jpg",
    rotationPeriod: 8.84,
    axialTilt: 0,
    meanTemperature: 44,
    surfaceGravity: 0.3,
    jplId: "50000;",
    type: "asteroid",
    albedo: 0.1,
  },

  {
    name: "Sedna",
    // Standard mass for 90377 Sedna ~1e21
    mass: 1e21,
    radius: 498e3,
    color: 0xff3300,
    texture: "/Sedna.jpg",
    rotationPeriod: 10.27,
    axialTilt: 0,
    meanTemperature: 12,
    surfaceGravity: 0.3,
    jplId: "90377",
    type: "asteroid",
    albedo: 0.32,
  },

  {
    name: "Mimas",
    // Recalibrated: 2.503489e9 / 6.67430e-11
    mass: 3.7509386752e19,
    radius: 207400.0, // Reference radius for J calculations
    radii: {
      x: 207400.0, // Toward Saturn
      y: 190600.0, // Polar (Shortest)
      z: 196200.0, // Orbital direction
    },
    color: 0xaaaaaa,
    texture: "/Mimas.jpg",
    parent: "Saturn",
    // Perfect sync to 0.9424218d period
    rotationPeriod: 22.6181232,
    axialTilt: 0,
    meanTemperature: 64,
    surfaceGravity: 0.063345, // Calibrated to GM / R_mean^2
    jplId: "601",
    type: "moon",
    albedo: 0.6,
    // Gravity harmonics calibrated to R = 207.4km
    J: [0.0125],
    c22: 0.0031,
    tidal: { k2: 0.023, tidalQ: 1000 },
    // Saturn's Pole alignment
    poleRA: 40.589,
    poleDec: 83.537,
    rel_a: 185540e3,
    rel_e: 0.0196,
    rel_i: 1.572,
  },

  {
    name: "Tethys",
    // Recalibrated: 41.210e9 / 6.67430e-11
    mass: 6.1744302773e20,
    radius: 538.8e3, // Primary Equatorial Reference (a) for J2/C22
    radii: {
      x: 538.8e3, // Longest (Towards Saturn)
      y: 534.0e3, // Polar axis (Shortest - assumes Y-up)
      z: 536.1e3, // Intermediate (Direction of motion)
    },
    color: 0xcccccc,
    texture: "/Tethys.jpg",
    parent: "Saturn",
    // Refined for perfect 1:1 tidal lock synchronization
    rotationPeriod: 45.307248,
    axialTilt: 0,
    meanTemperature: 86,
    surfaceGravity: 0.1432, // Calibrated to GM/r^2
    jplId: "603",
    type: "moon",
    albedo: 0.8,
    J: [1.088e-3],
    tidal: { k2: 0.032, tidalQ: 400 },
    // Saturn's Pole (Tethys is locked to the Laplace plane/Equator)
    poleRA: 40.589,
    poleDec: 83.537,
    rel_a: 294670e3,
    rel_e: 0.0001,
    rel_i: 1.091,
  },

  {
    name: "Dione",
    // Recalibrated: 73.116e9 / 6.67430e-11
    mass: 1.095485e21,
    radius: 563.8e3, // Set to Equatorial
    radii: { x: 563.8e3, y: 561.0e3, z: 559.6e3 },
    color: 0x999999,
    texture: "/Dione.jpg",
    parent: "Saturn",
    rotationPeriod: 65.68596,
    axialTilt: 0,
    meanTemperature: 87,
    surfaceGravity: 0.232,
    jplId: "604",
    type: "moon",
    J: [0.0014],
    tidal: { k2: 0.034, tidalQ: 600 },
    poleRA: 40.66,
    poleDec: 83.52,
    rel_a: 377420e3,
    rel_e: 0.0022,
    rel_i: 0.028,
  },

  {
    name: "Rhea",
    // Recalibrated: 153.94e9 / 6.67430e-11
    mass: 2.306456e21,
    radius: 766.5e3, // Set to Equatorial
    radii: { x: 766.5e3, y: 764.5e3, z: 762.5e3 },
    color: 0xaaaaaa,
    texture: "/Rhea.jpg",
    parent: "Saturn",
    rotationPeriod: 108.432,
    axialTilt: 0,
    meanTemperature: 76,
    surfaceGravity: 0.264,
    jplId: "605",
    type: "moon",
    J: [7.947e-4],
    tidal: { k2: 0.032, tidalQ: 400 },
    rel_a: 527070e3,
    rel_e: 0.001,
    rel_i: 0.331,
  },

  {
    name: "Iapetus",
    // Recalibrated: 120.51e9 / 6.67430e-11
    mass: 1.8055826e21,
    radius: 746e3, // Set to Equatorial
    radii: { x: 746e3, y: 712e3, z: 746e3 },
    color: 0xdddddd,
    texture: "/Iapetus.jpg",
    parent: "Saturn",
    rotationPeriod: 1903.6,
    axialTilt: 0,
    meanTemperature: 110,
    surfaceGravity: 0.223,
    jplId: "608",
    type: "moon",
  },

  {
    name: "Miranda",
    // Recalibrated: 4.3e9 / 6.67430e-11
    mass: 6.4426231964e19,
    radius: 240e3, // Primary Equatorial Reference (a)
    radii: {
      x: 240.0e3, // Longest (Towards Uranus)
      y: 232.9e3, // Polar axis (Shortest - assumes Y-up)
      z: 234.2e3, // Intermediate (Direction of motion)
    },
    color: 0xcccccc,
    texture: "/Miranda.png",
    parent: "Uranus",
    rotationPeriod: 33.923424, // Refined to match 1.413476d sidereal period
    axialTilt: 0,
    meanTemperature: 60,
    surfaceGravity: 0.079,
    jplId: "705",
    type: "moon",
    albedo: 0.27,
    J: [5.25e-3],
    tidal: { k2: 0.01, tidalQ: 200 },
    poleRA: 257.43,
    poleDec: -15.1,
    rel_a: 129800e3,
    rel_e: 0.0027,
    rel_i: 175.78,
  },

  {
    name: "Ariel",
    // Recalibrated: 83.43e9 / 6.67430e-11
    mass: 1.250026e21,
    radius: 581.1e3, // Set to Equatorial
    radii: { x: 581.1e3, y: 577.9e3, z: 577.7e3 },
    color: 0xdddddd,
    texture: "/Ariel.png",
    parent: "Uranus",
    rotationPeriod: 60.4891,
    axialTilt: 0,
    meanTemperature: 60,
    surfaceGravity: 0.249,
    jplId: "701",
    type: "moon",
    poleRA: 257.43,
    poleDec: -15.1,
    rel_a: 191200e3,
    rel_e: 0.0034,
    rel_i: 179.69,
  },

  {
    name: "Umbriel",
    // Recalibrated: 85.40e9 / 6.67430e-11
    mass: 1.279535e21,
    radius: 584.7e3,
    radii: { x: 584.7e3, y: 584.7e3, z: 584.7e3 },
    color: 0x888888,
    texture: "/Umbriel.webp",
    parent: "Uranus",
    rotationPeriod: 99.4602,
    axialTilt: 0,
    meanTemperature: 60,
    surfaceGravity: 0.23,
    jplId: "702",
    type: "moon",
    poleRA: 257.43,
    poleDec: -15.1,
    rel_a: 266000e3,
    rel_e: 0.005,
    rel_i: 179.64,
  },
];
