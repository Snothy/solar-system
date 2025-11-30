//! Gravitational force calculations.

pub mod newtonian;
pub mod harmonics;
pub mod legendre;

pub use newtonian::apply_newtonian;
pub use harmonics::{apply_zonal_harmonics, apply_sectorial_harmonics};
