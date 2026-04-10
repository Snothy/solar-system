/// COORDINATE FRAME: Heliocentric Ecliptic J2000
/// - Origin: Center of the Sun.
/// - X-axis: Points toward the First Point of Aries.
/// - Z-axis: Normal to the Ecliptic Plane (Earth's orbital plane).
/// - Y-axis: Completes the right-handed system.
///
/// UNIT CONVENTIONS:
/// - Distances: Meters (m)
/// - Mass: Kilograms (kg)
/// - Time: Seconds (s)
/// - Angles (Precession): Radians (Converted from IAU degrees/arcseconds)
/// - Rotation Rates: Degrees/Day (wdot) or Degrees/Century (pole_rates) 
///   *Check specific implementation for rotational state integration.*

use serde::{Deserialize, Serialize};

pub use crate::math::Vector3;
use crate::common::units::{Kilograms, Meters, MetersPerSecond, Newtons};

/// Physical properties of a celestial body in the N-body simulation.
///
/// # Units Convention
/// All physical quantities use **SI base units** (meters, kilograms, seconds).
///
/// # Coordinate System
/// Position and velocity vectors are in the **heliocentric ecliptic J2000** frame.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsBody {
    /// Name of the celestial body (e.g., "Earth", "Mars")
    pub name: String,

    /// Mass in kilograms (kg)
    pub mass: Kilograms,

    /// Mean radius in meters (m)
    pub radius: Meters,

    /// Position vector in meters (m) - heliocentric ecliptic J2000
    pub pos: Vector3,

    /// Velocity vector in meters per second (m/s) - heliocentric ecliptic J2000
    pub vel: Vector3,

    /// Accumulated force vector in Newtons (N) [internal use]
    #[serde(default)]
    pub force: Option<Vector3>,

    #[serde(flatten, skip_serializing_if = "Option::is_none")]
    pub gravity_harmonics: Option<HarmonicsParams>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub tidal: Option<TidalParams>,

    #[serde(flatten)]
    pub rotation: Option<RotationalParams>,

    #[serde(flatten)]
    pub atmosphere: Option<AtmosphereParams>,

    #[serde(flatten)]
    pub thermal: Option<ThermalParams>,

    #[serde(flatten)]
    pub precession: Option<PrecessionParams>,

    #[serde(flatten)]
    pub moon: Option<MoonParams>,

    #[serde(flatten)]
    pub comet: Option<CometParams>,
}/// Gravitational harmonics parameters for non-spherical mass distributions.
///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HarmonicsParams {
    /// New: Generic zonal harmonic coefficients [J2, J3, J4, J5, ...]
    /// J2 is at index 0, J3 at index 1, etc.
    #[serde(default, alias = "J")]
    pub zonal_coeffs: Option<Vec<f64>>,

    /// Tesseral harmonics (C22, S22) - degree 2, order 2
    #[serde(default)]
    pub c22: Option<f64>,
    #[serde(default)]
    pub s22: Option<f64>,

    /// Pole vector (rotation axis) in Ecliptic J2000
    #[serde(default)]
    pub pole_vector: Option<Vector3>,
}

impl Default for HarmonicsParams {
    fn default() -> Self {
        Self {
            zonal_coeffs: None,
            c22: None,
            s22: None,
            pole_vector: None,
        }
    }
}

impl HarmonicsParams {
    /// Get the effective zonal coefficients.
    ///
    /// Returns a slice where index i contains J_{i+2}.
    pub fn get_zonal_coeffs(&self) -> &[f64] {
        if let Some(coeffs) = &self.zonal_coeffs {
            return coeffs.as_slice();
        }
        &[]
    }
}


#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct TidalParams {
    #[serde(default)]
    pub k2: Option<f64>,
    #[serde(default)]
    pub tidal_q: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct RotationalParams {
    #[serde(default)]
    pub angular_velocity: Option<Vector3>,
    #[serde(default)]
    pub moment_of_inertia: Option<f64>,
    #[serde(default)]
    pub torque: Option<Vector3>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct AtmosphereParams {
    #[serde(default)]
    pub has_atmosphere: Option<bool>,
    #[serde(default)]
    pub surface_pressure: Option<f64>,
    #[serde(default)]
    pub scale_height: Option<f64>,
    #[serde(default)]
    pub mean_temperature: Option<f64>,
    #[serde(default)]
    pub drag_coefficient: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThermalParams {
    #[serde(default)]
    pub albedo: Option<f64>,
    #[serde(default)]
    pub thermal_inertia: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PrecessionParams {
    #[serde(default, alias = "poleRA")]
    pub pole_ra0: Option<f64>,
    #[serde(default, alias = "poleDec")]
    pub pole_dec0: Option<f64>,
    
    // Precession rates (degrees/century)
    #[serde(default, alias = "poleRARate", alias = "poleRA_rate")]
    pub pole_ra_rate: Option<f64>,
    #[serde(default, alias = "poleDecRate", alias = "poleDec_rate")]
    pub pole_dec_rate: Option<f64>,

    #[serde(default)]
    pub precession_rate: Option<f64>,
    #[serde(default)]
    pub nutation_amplitude: Option<f64>,
    
    // Rotational elements for body orientation (IAU)
    #[serde(default, alias = "W0")]
    pub w0: Option<f64>,      // Prime meridian angle at J2000 (degrees)
    #[serde(default, alias = "Wdot")]
    pub wdot: Option<f64>,    // Rotation rate (degrees/day)
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct MoonParams {
    #[serde(default)]
    pub libration: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct CometParams {
    #[serde(default)]
    pub yorp_factor: Option<f64>,
    #[serde(default)]
    pub comet_a1: Option<f64>,
    #[serde(default)]
    pub comet_a2: Option<f64>,
    #[serde(default)]
    pub comet_a3: Option<f64>,
}
