import type { CelestialBodyData } from '../types';

export const EXTENDED_BODIES: CelestialBodyData[] = [
  // Dwarf Planets / Asteroids
  {
    name: "Ceres",
    mass: 9.393e20,
    radius: 473e3,
    color: 0x888888,
    texture: "/Ceres.jpg", // Placeholder
    rotationPeriod: 9.07,
    axialTilt: 4,
    meanTemperature: 168,
    surfaceGravity: 0.27,
    jplId: "1;", // 1 Ceres
    type: "dwarf planet",
    shape: 'sphere', // Can be updated to 'model' if we have one
    poleRA: 291.41,
    poleDec: 66.76
  },
  {
    name: "Vesta",
    mass: 2.59e20,
    radius: 262.7e3,
    color: 0x999999,
    texture: "/Vesta.jpg",
    rotationPeriod: 5.34,
    axialTilt: 29,
    meanTemperature: 143,
    surfaceGravity: 0.22,
    jplId: "4;", // 4 Vesta
    type: "asteroid",
    shape: 'sphere',
    poleRA: 301.04,
    poleDec: 42.23
  },
  {
    name: "Pallas",
    mass: 2.11e20,
    radius: 256e3,
    color: 0xaaaaaa,
    texture: "/Pallas.jpg",
    rotationPeriod: 7.81,
    axialTilt: 84,
    meanTemperature: 164,
    surfaceGravity: 0.21,
    jplId: "2;", // 2 Pallas
    type: "asteroid",
    shape: 'sphere',
    poleRA: 34.83,
    poleDec: -2.93
  },
  {
    name: "Hygiea",
    mass: 8.67e19,
    radius: 216e3,
    color: 0x333333,
    texture: "/Hygiea.jpg",
    rotationPeriod: 13.8,
    axialTilt: 60,
    meanTemperature: 164,
    surfaceGravity: 0.09,
    jplId: "10;", // 10 Hygiea
    type: "asteroid",
    shape: 'sphere',
    poleRA: 308.57,
    poleDec: 41.65
  },
  // Comets (Halley)
  {
    name: "1P/Halley",
    mass: 2.2e14,
    radius: 5.5e3, // Mean radius approx
    color: 0x444444,
    texture: "/Halley.jpg",
    rotationPeriod: 52.8, // Approx 2.2 days
    axialTilt: 0,
    meanTemperature: 200, // Varies wildly
    surfaceGravity: 0.001, // Tiny
    jplId: "90000030", // 1P/Halley
    type: "comet",
    shape: 'sphere', // Reverted to sphere as requested
    poleRA: 0,
    poleDec: 0
  },

  // Dwarf Planets
  {
    name: "Pluto",
    mass: 1.309e22,
    radius: 1188.3e3,
    color: 0xe3c9a6,
    texture: "/Pluto.jpg",
    rotationPeriod: -153.29,
    axialTilt: 122.53,
    meanTemperature: 44,
    surfaceGravity: 0.62,
    jplId: "999",
    type: "dwarf planet",
    shape: 'sphere',
    poleRA: 132.99,
    poleDec: -6.16,
    albedo: 0.52
  },
  {
    name: "Charon",
    mass: 1.586e21,
    radius: 606e3,
    color: 0x888888,
    texture: "/Charon.jpg",
    parent: "Pluto",
    rotationPeriod: 153.29, // Locked
    axialTilt: 0,
    meanTemperature: 53,
    surfaceGravity: 0.288,
    jplId: "901",
    type: "moon",
    poleRA: 132.99,
    poleDec: -6.16
  },
  {
    name: "Eris",
    mass: 1.66e22,
    radius: 1163e3,
    color: 0xffffff,
    texture: "/Eris.jpg",
    rotationPeriod: 25.9,
    axialTilt: 78, // Uncertain
    meanTemperature: 42,
    surfaceGravity: 0.82,
    jplId: "136199;",
    type: "dwarf planet",
    albedo: 0.96
  },
  {
    name: "Haumea",
    mass: 4.006e21,
    radius: 816e3, // Mean
    radii: { x: 1050e3, y: 840e3, z: 575e3 }, // Tri-axial
    color: 0x999999,
    texture: "/Haumea.jpg",
    rotationPeriod: 3.915,
    axialTilt: 28, // Approx
    meanTemperature: 50,
    surfaceGravity: 0.4, // Varies
    jplId: "136108;",
    type: "dwarf planet",
    shape: 'sphere', // Will use radii scaling
    albedo: 0.7
  },
  {
    name: "Makemake",
    mass: 3.1e21,
    radius: 715e3,
    color: 0xddbb99,
    texture: "/Makemake.jpg",
    rotationPeriod: 22.83,
    axialTilt: 29,
    meanTemperature: 30,
    surfaceGravity: 0.4,
    jplId: "136472;",
    type: "dwarf planet",
    albedo: 0.8
  },
  // TNOs
  {
    name: "Sedna",
    mass: 1e21, // Est
    radius: 500e3,
    color: 0xff3300, // Very red
    texture: "/Sedna.jpg",
    rotationPeriod: 10.27,
    axialTilt: 0,
    meanTemperature: 12,
    surfaceGravity: 0.3, // Est
    jplId: "90377;",
    type: "asteroid",
    albedo: 0.32
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
    albedo: 0.1
  },
  // Additional Moons
  {
    name: "Mimas",
    mass: 3.75e19,
    radius: 198e3,
    color: 0xaaaaaa,
    texture: "/Mimas.jpg",
    parent: "Saturn",
    rotationPeriod: 22.6,
    axialTilt: 0,
    meanTemperature: 64,
    surfaceGravity: 0.064,
    jplId: "601",
    type: "moon"
  },
  {
    name: "Iapetus",
    mass: 1.8e21,
    radius: 734e3,
    color: 0xdddddd, // Two-tone actually
    texture: "/Iapetus.jpg",
    parent: "Saturn",
    rotationPeriod: 1903.6,
    axialTilt: 0,
    meanTemperature: 110,
    surfaceGravity: 0.22,
    jplId: "608",
    type: "moon"
  },
  {
    name: "Miranda",
    mass: 6.59e19,
    radius: 235.8e3,
    color: 0xcccccc,
    texture: "/Miranda.jpg",
    parent: "Uranus",
    rotationPeriod: 33.9,
    axialTilt: 0,
    meanTemperature: 60,
    surfaceGravity: 0.079,
    jplId: "705",
    type: "moon"
  },
  {
    name: "Ariel",
    mass: 1.35e21,
    radius: 578.9e3,
    color: 0xdddddd,
    texture: "/Ariel.jpg",
    parent: "Uranus",
    rotationPeriod: 60.5,
    axialTilt: 0,
    meanTemperature: 60,
    surfaceGravity: 0.27,
    jplId: "701",
    type: "moon"
  },
  {
    name: "Umbriel",
    mass: 1.17e21,
    radius: 584.7e3,
    color: 0x888888,
    texture: "/Umbriel.jpg",
    parent: "Uranus",
    rotationPeriod: 99.5,
    axialTilt: 0,
    meanTemperature: 60,
    surfaceGravity: 0.23,
    jplId: "702",
    type: "moon"
  }
];

