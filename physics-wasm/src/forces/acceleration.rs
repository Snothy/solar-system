//! Acceleration calculations combining all force types.
//!
//! This module coordinates the calculation of total accelerations  
//! by combining contributions from various force models.

use crate::common::types::{Vector3, PhysicsBody};
use crate::common::units::MetersPerSecondSquared;
use crate::forces::ForceConfig;
use super::sun_interactions::apply_sun_interactions;
use super::body_interactions::apply_body_interactions;

/// Calculate total accelerations for all bodies in the system.
///
/// This is the core function that combines all enabled force models to compute
/// the net acceleration on each body.
///
/// # Units
/// - All inputs use SI base units (meters, kilograms, seconds)
/// - Returns accelerations in m/s²
///
/// # Arguments
/// - `bodies`: Slice of all bodies in the simulation
/// - `config`: Configuration struct containing flags and parameters
///
/// # Returns
/// Vector of accelerations (m/s²) for each body.
pub fn calculate_accelerations(
    bodies: &Vec<PhysicsBody>, 
    config: &ForceConfig,
) -> Vec<Vector3> {
    let n = bodies.len();
    let mut accs = vec![Vector3::zero(); n];
    let sun_idx = bodies.iter().position(|b| b.name == "Sun");

    // 1. Sun-Body Interactions (Gravity + Solar Radiation)
    if let Some(s_idx) = sun_idx {
        apply_sun_interactions(bodies, &mut accs, config, s_idx);
    }

    // 2. Body-Body Interactions (Gravity, Harmonics, Relativity, Tidal, Drag)
    apply_body_interactions(bodies, &mut accs, config, sun_idx);

    if let Some(earth_idx) = bodies.iter().position(|b| b.name == "Earth") {
        if accs[earth_idx].len() == 0.0 {
             // println!("WARNING: Earth acceleration is ZERO");
        }
        // println!("Earth Acc: {:?}", accs[earth_idx]);
    }
    
    accs
}
