import * as THREE from 'three';
import { J2000, MS_PER_DAY } from './constants';

/**
 * Compute axial precession for a celestial body
 * Updates the pole vector based on precession rate
 * 
 * @param poleRA0 - Initial Right Ascension of pole at J2000 (degrees)
 * @param poleDec0 - Initial Declination of pole at J2000 (degrees)
 * @param precessionRate - Precession rate (arcseconds per year)
 * @param currentTime - Current time in milliseconds (TDB)
 * @returns Updated pole vector in ecliptic coordinates
 */
export function computePrecession(
  poleRA0: number,
  poleDec0: number,
  precessionRate: number,
  currentTime: number
): THREE.Vector3 {
  // Years since J2000
  const yearsSinceJ2000 = (currentTime - J2000) / (MS_PER_DAY * 365.25);
  
  // Precession angle in arcseconds
  const precessionArcsec = precessionRate * yearsSinceJ2000;
  
  // Convert to degrees (3600 arcsec = 1 degree)
  const precessionDeg = precessionArcsec / 3600.0;
  
  // Update RA (precession causes pole to trace a circle around ecliptic pole)
  // For Earth, this is a 26,000 year cycle
  const newRA = poleRA0 + precessionDeg;
  
  // Dec remains approximately constant for simple precession
  // (Nutation causes small variations)
  const newDec = poleDec0;
  
  return computePoleVector(newRA, newDec);
}

/**
 * Compute nutation (short-period oscillations in pole orientation)
 * Simplified model using dominant term (18.6 year lunar node cycle for Earth)
 * 
 * @param poleRA - Current pole RA (degrees)
 * @param poleDec - Current pole Dec (degrees)
 * @param nutationAmplitude - Nutation amplitude (arcseconds)
 * @param currentTime - Current time in milliseconds (TDB)
 * @returns Pole vector with nutation applied
 */
export function computeNutation(
  poleRA: number,
  poleDec: number,
  nutationAmplitude: number,
  currentTime: number
): THREE.Vector3 {
  // Years since J2000
  const yearsSinceJ2000 = (currentTime - J2000) / (MS_PER_DAY * 365.25);
  
  // Dominant nutation period (18.6 years for lunar node cycle)
  const nutationPeriod = 18.6;
  const phase = (2 * Math.PI * yearsSinceJ2000) / nutationPeriod;
  
  // Nutation in longitude (RA)
  const nutationRA = nutationAmplitude * Math.sin(phase) / 3600.0; // Convert to degrees
  
  // Nutation in obliquity (Dec)
  const nutationDec = (nutationAmplitude / 2) * Math.cos(phase) / 3600.0;
  
  const newRA = poleRA + nutationRA;
  const newDec = poleDec + nutationDec;
  
  return computePoleVector(newRA, newDec);
}

/**
 * Compute pole vector from RA/Dec in equatorial coordinates,
 * then convert to ecliptic coordinates (used by simulation)
 * 
 * @param ra - Right Ascension (degrees)
 * @param dec - Declination (degrees)
 * @returns Pole vector in ecliptic coordinates
 */
export function computePoleVector(ra: number, dec: number): THREE.Vector3 {
  const raRad = THREE.MathUtils.degToRad(ra);
  const decRad = THREE.MathUtils.degToRad(dec);
  
  // Convert from equatorial (RA/Dec) to Cartesian (equatorial)
  const x_eq = Math.cos(decRad) * Math.cos(raRad);
  const y_eq = Math.cos(decRad) * Math.sin(raRad);
  const z_eq = Math.sin(decRad);
  
  // Convert equatorial to ecliptic coordinates
  // Obliquity of the ecliptic at J2000: 23.43928 degrees
  const epsilon = THREE.MathUtils.degToRad(23.43928);
  const cosEps = Math.cos(epsilon);
  const sinEps = Math.sin(epsilon);
  
  const x_ecl = x_eq;
  const y_ecl = y_eq * cosEps + z_eq * sinEps;
  const z_ecl = -y_eq * sinEps + z_eq * cosEps;
  
  // Convert to Three.js coordinates (Y-up, Z-forward becomes Y-up, Z-backward)
  return new THREE.Vector3(x_ecl, z_ecl, -y_ecl).normalize();
}

/**
 * Update pole vector for a body based on precession and nutation
 * 
 * @param body - Physics body with pole orientation data
 * @param currentTime - Current simulation time in TDB (milliseconds)
 * @param enablePrecession - Whether to apply precession
 * @param enableNutation - Whether to apply nutation
 * @returns Updated pole vector
 */
export function updatePoleOrientation(
  poleRA0: number,
  poleDec0: number,
  precessionRate?: number,
  nutationAmplitude?: number,
  currentTime?: number,
  enablePrecession: boolean = true,
  enableNutation: boolean = true
): THREE.Vector3 {
  let ra = poleRA0;
  let dec = poleDec0;
  
  if (!currentTime) {
    return computePoleVector(ra, dec);
  }
  
  // Apply precession
  if (enablePrecession && precessionRate) {
    const precessed = computePrecession(poleRA0, poleDec0, precessionRate, currentTime);
    // Extract RA/Dec from vector for nutation calculation
    // (Simplified: just use computed vector if no nutation)
    if (!enableNutation || !nutationAmplitude) {
      return precessed;
    }
    
    // Calculate new RA/Dec from precessed vector
    const yearsSinceJ2000 = (currentTime - J2000) / (MS_PER_DAY * 365.25);
    const precessionArcsec = precessionRate * yearsSinceJ2000;
    const precessionDeg = precessionArcsec / 3600.0;
    ra = poleRA0 + precessionDeg;
  }
  
  // Apply nutation
  if (enableNutation && nutationAmplitude && currentTime) {
    return computeNutation(ra, dec, nutationAmplitude, currentTime);
  }
  
  return computePoleVector(ra, dec);
}
