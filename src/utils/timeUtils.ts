import { J2000, MS_PER_DAY, TT_TAI_OFFSET } from './constants';

/**
 * Time conversion utilities for astronomical time scales
 * 
 * Time scales used:
 * - UTC: Coordinated Universal Time (civil time with leap seconds)
 * - TAI: International Atomic Time (continuous, no leap seconds)
 * - TT: Terrestrial Time (TAI + 32.184s)
 * - TDB: Barycentric Dynamical Time (proper time at solar system barycenter)
 * 
 * Relationship: UTC + leap_seconds = TAI
 *              TAI + 32.184s = TT
 *              TT + periodic terms ≈ TDB
 */

/**
 * Get number of leap seconds for a given UTC time
 * Based on IERS Bulletin C (hardcoded for simplicity, update as needed)
 */
export function getLeapSeconds(utcMs: number): number {
  const date = new Date(utcMs);
  const year = date.getUTCFullYear();
  
  // Leap second history (simplified - add more as IERS announces)
  if (year >= 2017) return 37; // 2017-01-01 onwards
  if (year >= 2015) return 36; // 2015-07-01 to 2016-12-31
  if (year >= 2012) return 35; // 2012-07-01 to 2015-06-30
  if (year >= 2009) return 34; // 2009-01-01 to 2012-06-30
  if (year >= 2006) return 33; // 2006-01-01 to 2008-12-31
  if (year >= 1999) return 32; // 1999-01-01 to 2005-12-31
  
  // For dates before 1999, return approximate value
  return 32;
}

/**
 * Get ΔT (TT - UT1) for a given time
 * UT1 ≈ UTC for modern dates (within 0.9s)
 * Returns value in seconds
 */
export function getDeltaT(utcMs: number): number {
  // For modern dates (post-1972), ΔT ≈ leap_seconds + 32.184
  // This is an approximation; for precise historical values, use polynomial fit
  const leapSeconds = getLeapSeconds(utcMs);
  return leapSeconds + TT_TAI_OFFSET;
}

/**
 * Convert UTC milliseconds to TAI milliseconds
 */
export function utcToTAI(utcMs: number): number {
  const leapSeconds = getLeapSeconds(utcMs);
  return utcMs + leapSeconds * 1000;
}

/**
 * Convert TAI milliseconds to TT milliseconds
 */
export function taiToTT(taiMs: number): number {
  return taiMs + TT_TAI_OFFSET * 1000;
}

/**
 * Convert UTC milliseconds to TT (Terrestrial Time) milliseconds
 */
export function utcToTT(utcMs: number): number {
  const taiMs = utcToTAI(utcMs);
  return taiToTT(taiMs);
}

/**
 * Convert TT to TDB (Barycentric Dynamical Time)
 * Uses simplified Fairhead & Bretagnon formula
 * 
 * TDB - TT ≈ 0.001657 sin(g) + 0.000022 sin(Ls - Lj)
 * where:
 *   g = Earth's mean anomaly
 *   Ls = Sun's mean longitude  
 *   Lj = Jupiter's mean longitude
 * 
 * @param ttMs - Terrestrial Time in milliseconds
 * @returns TDB in milliseconds
 */
export function ttToTDB(ttMs: number): number {
  // Days since J2000.0 TT
  const T = (ttMs - J2000) / MS_PER_DAY;
  
  // Earth's mean anomaly (degrees)
  const g = 357.53 + 0.9856003 * T;
  const gRad = (g * Math.PI) / 180.0;
  
  // Sun's mean longitude (degrees)  
  const Ls = 280.47 + 0.9856474 * T;
  const LsRad = (Ls * Math.PI) / 180.0;
  
  // Jupiter's mean longitude (degrees)
  // Approximate: 34.35 + 0.0830912 deg/day
  const Lj = 34.35 + 0.0830912 * T;
  const LjRad = (Lj * Math.PI) / 180.0;
  
  // TDB - TT in seconds (max ~1.6 ms)
  const tdbMinusTT = 0.001657 * Math.sin(gRad) + 0.000022 * Math.sin(LsRad - LjRad);
  
  return ttMs + tdbMinusTT * 1000;
}

/**
 * Convert UTC to TDB (one-step conversion)
 */
export function utcToTDB(utcMs: number): number {
  const ttMs = utcToTT(utcMs);
  return ttToTDB(ttMs);
}

/**
 * Convert TDB back to UTC (approximate inverse)
 * Useful for displaying simulation time to user
 */
export function tdbToUTC(tdbMs: number): number {
  // Approximate inverse (ignoring small TDB correction)
  const ttMs = tdbMs - 0.001657 * 1000; // Rough correction
  const leapSeconds = getLeapSeconds(ttMs); // Approximate
  return ttMs - (TT_TAI_OFFSET + leapSeconds) * 1000;
}

/**
 * Convert milliseconds to Julian Date
 */
export function msToJulianDate(ms: number): number {
  // Julian Date = (time in ms since Unix epoch) / ms_per_day + JD of Unix epoch
  const unixEpochJD = 2440587.5; // JD of 1970-01-01 00:00:00 UTC
  return ms / MS_PER_DAY + unixEpochJD;
}

/**
 * Convert Julian Date to milliseconds
 */
export function julianDateToMs(jd: number): number {
  const unixEpochJD = 2440587.5;
  return (jd - unixEpochJD) * MS_PER_DAY;
}

/**
 * Get current time in TDB for simulation
 */
export function getCurrentTDB(): number {
  return utcToTDB(Date.now());
}
