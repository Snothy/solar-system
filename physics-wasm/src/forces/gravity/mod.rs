//! Gravitational force calculations.

pub mod newtonian;
pub mod harmonics;

pub use newtonian::apply_newtonian;
pub use harmonics::{apply_j2, apply_j3, apply_j4, apply_c22_s22};
