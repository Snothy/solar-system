use crate::common::constants::{C_LIGHT, SOLAR_LUMINOSITY};
use crate::common::types::{PhysicsBody, Vector3};

/// Calculate solar radiation pressure (SRP) force.
pub fn apply_srp(_sun: &PhysicsBody, body: &PhysicsBody, r_vec: &Vector3, dist: f64) -> Vector3 {
    let area = std::f64::consts::PI * body.radius * body.radius;
    let cr = 1.3;
    let f_mag =
        (SOLAR_LUMINOSITY * cr * area) / (4.0 * std::f64::consts::PI * C_LIGHT * dist * dist);
    let mut f = *r_vec;
    f.normalize();
    f.scale(f_mag);
    f
}
