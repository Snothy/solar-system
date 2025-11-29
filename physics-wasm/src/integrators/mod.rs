//! Numerical integrators for solving the equations of motion.
//!
//! This module provides multiple integration methods for the N-body problem,
//! each with different tradeoffs between accuracy, stability, and performance.
//!
//! # Available Integrators
//!
//! ## Symplectic (4th Order Yoshida)
//! [`step_symplectic_4`] - General-purpose symplectic integrator
//! - **Order**: 4th order
//! - **Pros**: Energy-conserving, good for long-term evolution
//! - **Cons**: Requires small timesteps for accuracy
//! - **Use case**: Asteroid dynamics, general N-body simulation
//!
//! ## Wisdom-Holman (Mixed-Variable Symplectic)
//! [`step_wisdom_holman`] - Hierarchical symplectic integrator
//! - **Method**: Splits Keplerian motion (drift) from perturbative forces (kick)
//! - **Pros**: Excellent for hierarchical systems (star-planet-moon)
//! - **Cons**: Requires identifying parent-child relationships
//! - **Use case**: Planetary systems, moon systems
//!
//! ## SABA4 (Symplectic 4th Order)
//! [`step_saba4`] - Optimized symplectic integrator
//! - **Order**: 4th order, composition method
//! - **Pros**: Superior stability, allows larger timesteps
//! - **Cons**: More substeps per iteration
//! - **Use case**: Long-term planetary evolution
//!
//! ## High Precision (DOP853)
//! [`step_high_precision`] - Adaptive Runge-Kutta method
//! - **Method**: Dormand-Prince 8(5,3) with adaptive stepping
//! - **Pros**: Highest accuracy, adaptive error control
//! - **Cons**: Not symplectic (energy drift), computationally expensive
//! - **Use case**: Short-term high-precision ephemeris, verification
//!
//! # Units
//! All integrators operate on SI base units:
//! - Position: meters (m)
//! - Velocity: meters per second (m/s)
//! - Time: seconds (s)
//!
//! # Integration Flow
//! 1. Update positions and velocities using the selected integrator
//! 2. Apply torques (tidal, YORP) to update angular velocities
//! 3. Update libration for the Moon
//! 4. Check for collisions (optional)

pub mod high_precision;
pub mod saba4;
pub mod symplectic;
pub mod wisdom_holman;
pub mod types;
pub mod traits;

pub use high_precision::step_high_precision;
pub use saba4::step_saba4;
pub use symplectic::step_symplectic_4;
pub use wisdom_holman::step_wisdom_holman;
pub use types::{IntegratorMode, IntegratorQuality};
