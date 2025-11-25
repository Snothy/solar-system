import type { CelestialBodyData } from '../types';

export const SOLAR_SYSTEM_DATA: CelestialBodyData[] = [
  {
    name: "Sun",
    mass: 1.989e30,
    radius: 696340e3,
    color: 0xffdd00,
    emissive: 0xffaa00,
    texture: "/Sun.jpeg",
    type: "star",
    rotationPeriod: 609.12,
    axialTilt: 7.25,
    meanTemperature: 5778, // Surface temperature K
    surfaceGravity: 274,
    jplId: "10"
  },
  {
    name: "Mercury",
    mass: 3.3011e23,
    radius: 2439.7e3,
    color: 0xaaaaaa,
    texture: "/Mercury.jpeg",
    rotationPeriod: 1407.6,
    axialTilt: 0.03,
    meanTemperature: 440, // K
    surfaceGravity: 3.7,
    jplId: "199"
  },
  {
    name: "Venus",
    mass: 4.8675e24,
    radius: 6051.8e3,
    color: 0xe3bb76,
    texture: "/Venus.jpeg",
    rotationPeriod: -5832.5,
    axialTilt: 177.3,
    meanTemperature: 737, // K
    surfaceGravity: 8.87,
    jplId: "299"
  },
  {
    name: "Earth",
    mass: 5.972e24,
    radius: 6371e3,
    color: 0x2233ff,
    texture: "/Earth.jpeg",
    rotationPeriod: 23.9345,
    axialTilt: 23.44,
    meanTemperature: 288, // K
    surfaceGravity: 9.8,
    jplId: "399"
  },
  {
    name: "Moon",
    mass: 7.342e22,
    radius: 1737.4e3,
    color: 0xcccccc,
    texture: "/Moon.jpeg",
    parent: "Earth",
    rel_a: 384400e3,
    rel_v: 1022,
    rotationPeriod: 655.7,
    axialTilt: 6.68,
    meanTemperature: 220, // K
    surfaceGravity: 1.62,
    jplId: "301"
  },
  {
    name: "Mars",
    mass: 6.4171e23,
    radius: 3389.5e3,
    color: 0xff4500,
    texture: "/Mars.jpeg",
    rotationPeriod: 24.6229,
    axialTilt: 25.19,
    meanTemperature: 210, // K
    surfaceGravity: 3.72,
    jplId: "499"
  },
  {
    name: "Phobos",
    mass: 1.0659e16,
    radius: 11.26e3,
    color: 0x888888,
    texture: "/Phobos.png",
    parent: "Mars",
    rotationPeriod: 7.65,
    axialTilt: 0,
    meanTemperature: 233,
    surfaceGravity: 0.0057,
    jplId: "401"
  },
  {
    name: "Deimos",
    mass: 1.4762e15,
    radius: 6.2e3,
    color: 0x777777,
    texture: "/Deimos.png",
    parent: "Mars",
    rotationPeriod: 30.35,
    axialTilt: 0,
    meanTemperature: 233,
    surfaceGravity: 0.003,
    jplId: "402"
  },
  {
    name: "Jupiter",
    mass: 1.8982e27,
    radius: 69911e3,
    color: 0xd8ca9d,
    texture: "/Jupiter.jpeg",
    rotationPeriod: 9.925,
    axialTilt: 3.13,
    meanTemperature: 165, // K
    surfaceGravity: 24.79,
    jplId: "599"
  },
  {
    name: "Io",
    mass: 8.9319e22,
    radius: 1821.6e3,
    color: 0xfbffa3,
    texture: "/Io.jpg",
    parent: "Jupiter",
    rotationPeriod: 42.46,
    axialTilt: 0,
    meanTemperature: 110,
    surfaceGravity: 1.796,
    jplId: "501"
  },
  {
    name: "Europa",
    mass: 4.7998e22,
    radius: 1560.8e3,
    color: 0xc9c0bb,
    texture: "/Europa.jpg",
    parent: "Jupiter",
    rotationPeriod: 85.23,
    axialTilt: 0.1,
    meanTemperature: 102,
    surfaceGravity: 1.314,
    jplId: "502"
  },
  {
    name: "Ganymede",
    mass: 1.4819e23,
    radius: 2634.1e3,
    color: 0x7c7268,
    texture: "/Ganymede.png",
    parent: "Jupiter",
    rotationPeriod: 171.71,
    axialTilt: 0.33,
    meanTemperature: 110,
    surfaceGravity: 1.428,
    jplId: "503"
  },
  {
    name: "Callisto",
    mass: 1.0759e23,
    radius: 2410.3e3,
    color: 0x5e564d,
    texture: "/Callisto.jpg",
    parent: "Jupiter",
    rotationPeriod: 400.55,
    axialTilt: 0,
    meanTemperature: 134,
    surfaceGravity: 1.235,
    jplId: "504"
  },
  {
    name: "Saturn",
    mass: 5.6834e26,
    radius: 58232e3,
    color: 0xf4d03f,
    ringColor: 0xa89f91,
    hasRings: true,
    texture: "/Saturn.png",
    rotationPeriod: 10.656,
    axialTilt: 26.73,
    meanTemperature: 134, // K
    surfaceGravity: 10.44,
    jplId: "699"
  },
  {
    name: "Titan",
    mass: 1.3452e23,
    radius: 2574.7e3,
    color: 0xe3c968,
    texture: "/Titan.jpg",
    parent: "Saturn",
    rotationPeriod: 382.69,
    axialTilt: 0,
    meanTemperature: 94,
    surfaceGravity: 1.352,
    jplId: "606"
  },
  {
    name: "Enceladus",
    mass: 1.0802e20,
    radius: 252.1e3,
    color: 0xffffff,
    texture: "/Enceladus.jpg",
    parent: "Saturn",
    rotationPeriod: 32.88,
    axialTilt: 0,
    meanTemperature: 75,
    surfaceGravity: 0.113,
    jplId: "602"
  },
  {
    name: "Uranus",
    mass: 8.6810e25,
    radius: 25362e3,
    color: 0xadd8e6,
    texture: "/Uranus.jpg",
    rotationPeriod: -17.24,
    axialTilt: 97.77,
    meanTemperature: 76, // K
    surfaceGravity: 8.69,
    jplId: "799"
  },
  {
    name: "Titania",
    mass: 3.527e21,
    radius: 788.4e3,
    color: 0xd3d3d3,
    texture: "/Titania.jpg",
    parent: "Uranus",
    rotationPeriod: 208.94,
    axialTilt: 0,
    meanTemperature: 60,
    surfaceGravity: 0.379,
    jplId: "703"
  },
  {
    name: "Oberon",
    mass: 3.014e21,
    radius: 761.4e3,
    color: 0xa0a0a0,
    texture: "/Oberon.jpg",
    parent: "Uranus",
    rotationPeriod: 323.11,
    axialTilt: 0,
    meanTemperature: 61,
    surfaceGravity: 0.346,
    jplId: "704"
  },
  {
    name: "Neptune",
    mass: 1.0241e26,
    radius: 24622e3,
    color: 0x00008b,
    texture: "/Neptune.jpg",
    rotationPeriod: 16.11,
    axialTilt: 28.32,
    meanTemperature: 55, // K
    surfaceGravity: 11.15,
    jplId: "899"
  },
  {
    name: "Triton",
    mass: 2.14e22,
    radius: 1353.4e3,
    color: 0xffe4e1,
    texture: "/Triton.jpg",
    parent: "Neptune",
    rotationPeriod: -141.04,
    axialTilt: 0,
    meanTemperature: 38,
    surfaceGravity: 0.779,
    jplId: "801"
  }
];
