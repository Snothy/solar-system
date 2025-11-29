//! # Physical Units
//!
//! Type aliases for physical quantities using SI base units.
//!
//! This module defines semantic types to improve code clarity and documentation,
//! making it explicit what units are expected throughout the physics engine.
//!
//! **All calculations use SI base units:**
//! - Distance: meters (m)
//! - Mass: kilograms (kg)
//! - Time: seconds (s)
//!
//! **Coordinate System:**
//! - Heliocentric (Sun-centered)
//! - Ecliptic J2000 reference frame

// ============================================================================
// Base SI Units
// ============================================================================

/// Distance in meters (m)
pub type Meters = f64;

/// Area in square meters (m²)
pub type MetersSquared = f64;

/// Volume in cubic meters (m³)
pub type MetersCubed = f64;

/// Mass in kilograms (kg)
pub type Kilograms = f64;

/// Time in seconds (s)
pub type Seconds = f64;

// ============================================================================
// Derived Kinematic Units
// ============================================================================

/// Linear velocity in meters per second (m/s)
pub type MetersPerSecond = f64;

/// Linear acceleration in meters per second squared (m/s²)
pub type MetersPerSecondSquared = f64;

/// Angular velocity in radians per second (rad/s)
pub type RadiansPerSecond = f64;

/// Angular acceleration in radians per second squared (rad/s²)
pub type RadiansPerSecondSquared = f64;

/// Angle in radians (rad)
pub type Radians = f64;

// ============================================================================
// Force, Energy, and Power
// ============================================================================

/// Force in Newtons (N = kg·m/s²)
pub type Newtons = f64;

/// Energy in Joules (J = kg·m²/s²)
pub type Joules = f64;

/// Power in Watts (W = J/s = kg·m²/s³)
pub type Watts = f64;

// ============================================================================
// Physical Constants with Units
// ============================================================================

/// Gravitational constant G in m³/(kg·s²)
pub type GravitationalConstant = f64;

/// Speed of light in m/s
pub type SpeedOfLight = f64;

/// Solar luminosity in Watts (W)
pub type Luminosity = f64;

/// Mass loss rate in kg/s
pub type MassLossRate = f64;

// ============================================================================
// Specialized Physical Quantities
// ============================================================================

/// Pressure in Pascals (Pa = N/m² = kg/(m·s²))
pub type Pascals = f64;

/// Temperature in Kelvin (K)
pub type Kelvin = f64;

/// Thermal inertia in J/(m²·K·s^(1/2))
pub type ThermalInertia = f64;

/// Moment of inertia in kg·m²
pub type MomentOfInertia = f64;

/// Torque in Newton-meters (N·m = kg·m²/s²)
pub type NewtonMeters = f64;

/// Density in kg/m³
pub type KilogramsPerMeterCubed = f64;

/// Dimensionless quantity (unitless ratios, coefficients, etc.)
pub type Dimensionless = f64;
