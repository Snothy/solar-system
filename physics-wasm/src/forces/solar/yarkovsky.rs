use crate::common::constants::{C_LIGHT, SOLAR_LUMINOSITY};
use crate::common::types::{PhysicsBody, Vector3};

/// Calculate Yarkovsky effect force.
pub fn apply_yarkovsky(
    _sun: &PhysicsBody,
    body: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
) -> Vector3 {
    // Check for thermal parameters
    if let (Some(thermal), Some(rotation)) = (&body.thermal, &body.rotation) {
        if let (Some(albedo), Some(_inertia), Some(_ang_vel), Some(pole)) = (
            thermal.albedo,
            thermal.thermal_inertia,
            rotation.angular_velocity,
            body.gravity_harmonics.as_ref().and_then(|h| h.pole_vector),
        ) {
            let solar_flux = SOLAR_LUMINOSITY / (4.0 * std::f64::consts::PI * dist * dist);
            let absorbed =
                (1.0 - albedo) * solar_flux * std::f64::consts::PI * body.equatorial_radius * body.equatorial_radius;
            let lag = std::f64::consts::PI / 4.0;
            let f_mag = (absorbed / C_LIGHT) * lag.sin() * 0.1;

            let mut dir = *r_vec;
            dir.normalize();
            let mut v = body.vel;
            v.normalize();
            let cross1 = dir.cross(&v);
            let mut tan = cross1.cross(&dir);
            tan.normalize();

            let mut direction = 1.0;
            let orb_norm = r_vec.cross(&body.vel);
            if orb_norm.dot(&pole) < 0.0 {
                direction = -1.0;
            }

            tan.scale(f_mag * direction / (body.gm / crate::common::constants::G));
            return tan;
        }
    }
    Vector3::zero()
}
