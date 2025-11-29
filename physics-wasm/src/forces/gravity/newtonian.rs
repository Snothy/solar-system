use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};

/// Calculate Newtonian gravitational force between two bodies.
///
/// # Formula
/// F = G * m1 * m2 / r²
pub fn apply_newtonian(
    b1: &PhysicsBody,
    b2: &PhysicsBody,
    r_vec: &Vector3,
    dist_sq: f64,
) -> Vector3 {
    let f_mag = (G * b1.mass * b2.mass) / dist_sq;
    let mut f = *r_vec;
    f.normalize();
    f.scale(f_mag);
    f
}
