//! Configuration structures for the physics engine.
//!
//! Centralizes all boolean flags and parameters into strongly-typed configuration structs,
//! reducing function parameter counts and improving code readability.

use serde::{Serialize, Deserialize};

/// Main configuration for the physics simulation step.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsConfig {
    /// Enable post-Newtonian relativistic corrections
    pub relativity: bool,
    
    /// Enable J2, J3, J4, C22, S22 gravitational harmonics
    pub gravitational_harmonics: bool,
    
    /// Enable tidal forces (dissipative and conservative)
    pub tidal_forces: bool,
    
    /// Enable solar radiation pressure
    pub solar_radiation_pressure: bool,
    
    /// Enable Yarkovsky thermal recoil effect
    pub yarkovsky_effect: bool,
    
    /// Enable atmospheric drag
    pub atmospheric_drag: bool,
    
    /// Use Einstein-Infeld-Hoffmann (EIH) higher-order relativity
    /// (If false, uses standard PPN)
    pub use_eih: bool,
    
    /// Enable Poynting-Robertson drag
    pub poynting_robertson_drag: bool,
    
    /// Enable YORP rotational acceleration
    pub yorp_effect: bool,
    
    /// Enable cometary non-gravitational forces
    pub comet_forces: bool,
    
    /// Enable precession of the equinoxes
    pub precession: bool,
    
    /// Enable nutation
    pub nutation: bool,
    
    /// Enable solar mass loss over time
    pub solar_mass_loss: bool,

    /// Enable collision detection and resolution
    pub collisions: bool,
}

impl Default for PhysicsConfig {
    fn default() -> Self {
        Self {
            relativity: true,
            gravitational_harmonics: true,
            tidal_forces: true,
            solar_radiation_pressure: true,
            yarkovsky_effect: true,
            atmospheric_drag: true,
            use_eih: false,
            poynting_robertson_drag: true,
            yorp_effect: true,
            comet_forces: true,
            precession: true,
            nutation: true,
            solar_mass_loss: true,
            collisions: true,
        }
    }
}

