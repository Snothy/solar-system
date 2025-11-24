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
    elements: null,
    rotationPeriod: 609.12,
    axialTilt: 7.25,
    meanTemperature: 5778, // Surface temperature K
    surfaceGravity: 274
  },
  {
    name: "Mercury",
    mass: 3.3011e23,
    radius: 2439.7e3,
    color: 0xaaaaaa,
    texture: "/Mercury.jpeg",
    elements: { a: 0.387098, e: 0.205630, i: 7.005, O: 48.331, w: 29.124, M: 174.796, n: 4.092317 },
    rotationPeriod: 1407.6,
    axialTilt: 0.03,
    meanTemperature: 440, // K
    surfaceGravity: 3.7
  },
  {
    name: "Venus",
    mass: 4.8675e24,
    radius: 6051.8e3,
    color: 0xe3bb76,
    texture: "/Venus.jpeg",
    elements: { a: 0.723332, e: 0.006772, i: 3.394, O: 76.680, w: 54.884, M: 50.115, n: 1.602136 },
    rotationPeriod: -5832.5,
    axialTilt: 177.3,
    meanTemperature: 737, // K
    surfaceGravity: 8.87
  },
  {
    name: "Earth",
    mass: 5.972e24,
    radius: 6371e3,
    color: 0x2233ff,
    texture: "/Earth.jpeg",
    elements: { a: 1.000000, e: 0.016708, i: 0.000, O: 174.873, w: 288.064, M: 357.517, n: 0.985600 },
    rotationPeriod: 23.9345,
    axialTilt: 23.44,
    meanTemperature: 288, // K
    surfaceGravity: 9.8
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
    surfaceGravity: 1.62
  },
  {
    name: "Mars",
    mass: 6.4171e23,
    radius: 3389.5e3,
    color: 0xff4500,
    texture: "/Mars.jpeg",
    elements: { a: 1.523679, e: 0.093405, i: 1.850, O: 49.558, w: 286.502, M: 19.412, n: 0.524021 },
    rotationPeriod: 24.6229,
    axialTilt: 25.19,
    meanTemperature: 210, // K
    surfaceGravity: 3.72
  },
  {
    name: "Jupiter",
    mass: 1.8982e27,
    radius: 69911e3,
    color: 0xd8ca9d,
    texture: "/Jupiter.jpeg",
    elements: { a: 5.20260, e: 0.048498, i: 1.303, O: 100.464, w: 273.867, M: 20.020, n: 0.083085 },
    rotationPeriod: 9.925,
    axialTilt: 3.13,
    meanTemperature: 165, // K
    surfaceGravity: 24.79
  },
  {
    name: "Saturn",
    mass: 5.6834e26,
    radius: 58232e3,
    color: 0xf4d03f,
    ringColor: 0xa89f91,
    hasRings: true,
    texture: "/Saturn.png",
    elements: { a: 9.554909, e: 0.055546, i: 2.485, O: 113.665, w: 339.392, M: 317.020, n: 0.033444 },
    rotationPeriod: 10.656,
    axialTilt: 26.73,
    meanTemperature: 134, // K
    surfaceGravity: 10.44
  },
  {
    name: "Uranus",
    mass: 8.6810e25,
    radius: 25362e3,
    color: 0xadd8e6,
    texture: "/Uranus.jpg",
    elements: { a: 19.218446, e: 0.046381, i: 0.773, O: 74.006, w: 96.998857, M: 142.590, n: 0.011728 },
    rotationPeriod: -17.24,
    axialTilt: 97.77,
    meanTemperature: 76, // K
    surfaceGravity: 8.69
  },
  {
    name: "Neptune",
    mass: 1.0241e26,
    radius: 24622e3,
    color: 0x00008b,
    texture: "/Neptune.jpg",
    elements: { a: 30.110387, e: 0.009456, i: 1.767, O: 131.784, w: 273.187, M: 260.247, n: 0.005981 },
    rotationPeriod: 16.11,
    axialTilt: 28.32,
    meanTemperature: 55, // K
    surfaceGravity: 11.15
  }
];
