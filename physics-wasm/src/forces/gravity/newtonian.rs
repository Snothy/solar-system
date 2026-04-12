use crate::common::types::{PhysicsBody, Vector3};

/// Calculate Newtonian gravitational acceleration of b1 due to b2.
/// This returns the acceleration vector to be added to b1.velocity.
pub fn apply_newtonian(
    _b1: &PhysicsBody, // Prefixed with _ if unused to silence compiler warnings
    b2: &PhysicsBody,
    r_vec: &Vector3,
    dist_sq: f64,
) -> Vector3 {
    // a = GM_source / r^2
    let a_mag = b2.gm / dist_sq;
    
    let mut a = *r_vec;
    a.normalize();
    a.scale(a_mag);
    a
}