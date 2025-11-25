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
  }
];
