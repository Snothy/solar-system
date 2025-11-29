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

    #[serde(flatten)]
    pub gravity_harmonics: Option<HarmonicsParams>,

    #[serde(flatten)]
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
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct HarmonicsParams {
    #[serde(default)]
    pub j2: Option<f64>,
    #[serde(default)]
    pub j3: Option<f64>,
    #[serde(default)]
    pub j4: Option<f64>,
    #[serde(default)]
    pub c22: Option<f64>,
    #[serde(default)]
    pub s22: Option<f64>,
    #[serde(default)]
    pub pole_vector: Option<Vector3>,
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
    #[serde(default)]
    pub pole_ra0: Option<f64>,
    #[serde(default)]
    pub pole_dec0: Option<f64>,
    #[serde(default)]
    pub precession_rate: Option<f64>,
    #[serde(default)]
    pub nutation_amplitude: Option<f64>,
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
