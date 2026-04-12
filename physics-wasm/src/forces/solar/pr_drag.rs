use crate::common::constants::{C_LIGHT, SOLAR_LUMINOSITY};
use crate::common::types::{PhysicsBody, Vector3};

/// Calculate Poynting-Robertson (PR) drag force.
pub fn apply_pr_drag(
    sun: &PhysicsBody,
    body: &PhysicsBody,
    _r_vec: &Vector3,
    dist: f64,
) -> Vector3 {
    let area = std::f64::consts::PI * body.equatorial_radius * body.equatorial_radius;
    let solar_flux = SOLAR_LUMINOSITY / (4.0 * std::f64::consts::PI * dist * dist);
    let w = solar_flux * area;
    let factor = w / (C_LIGHT * C_LIGHT);
    let mut rel_vel = body.vel;
    rel_vel.sub(&sun.vel);
    let mut a = rel_vel;
    a.scale(-factor / (body.gm / crate::common::constants::G));
    a
}
