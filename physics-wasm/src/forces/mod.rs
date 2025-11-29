//! Force calculations for celestial body dynamics.
//!
//! This module implements all force models used in the N-body simulation:
//!
//! ## Gravitational Forces
//! - **Newtonian**: Standard inverse-square law gravity ([`gravity`])
//! - **Gravitational Harmonics**: J2, J3, J4, C22, S22 for non-spherical bodies ([`gravity`])
//! - **Relativity**: Post-Newtonian corrections (PPN, EIH) ([`relativity`])
//!
//! ## Non-Gravitational Forces
//! - **Tidal**: Dissipative and conservative tidal effects ([`tidal`])
//! - **Solar Radiation**: SRP, PR drag, Yarkovsky ([`solar`])
//! - **Atmospheric Drag**: For bodies with atmospheres ([`drag`])
//! - **Cometary**: Non-gravitational outgassing forces ([`comet`])
//!
//! ## Central Function
//! The [`calculate_accelerations`] function combines all these forces to compute
//! total accelerations for each body in the simulation.
//!
//! # Units
//! All calculations use SI base units:
//! - Distance: meters (m)
//! - Mass: kilograms (kg)
//! - Time: seconds (s)
//!
//! Forces are in Newtons (N), accelerations in m/s².

pub mod types;

mod acceleration;
pub mod gravity;
pub mod relativity;
pub mod tidal;
pub mod solar;
pub mod drag;
pub mod comet;
mod sun_interactions;
mod body_interactions;

pub use types::{ForceConfig, AccelerationField, GravityMode};
pub use acceleration::calculate_accelerations;
