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
  }
];
