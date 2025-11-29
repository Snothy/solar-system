use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};

/// Calculate tidal torque acting on primary body due to satellite.
/// Calculate tidal torque acting on primary body due to satellite.
pub fn calculate_tidal_torque(
    primary: &PhysicsBody,
    satellite: &PhysicsBody,
    r_vec: &Vector3,
    dist: f64,
) -> Vector3 {
    if let (Some(tidal), Some(rotation)) = (&primary.tidal, &primary.rotation) {
        if let (Some(k2), Some(q), Some(_inertia), Some(ang_vel)) = (
            tidal.k2,
            tidal.tidal_q,
            rotation.moment_of_inertia,
            rotation.angular_velocity,
        ) {
            let mut rel_vel = satellite.vel;
            rel_vel.sub(&primary.vel);
            let mut orbital_ang_vel = r_vec.cross(&rel_vel);
            orbital_ang_vel.scale(1.0 / (dist * dist));

            let mut diff = orbital_ang_vel;
            diff.sub(&ang_vel);

            let factor = 1.5 * (k2 / q) * G * satellite.mass * satellite.mass * primary.radius.powi(5)
                / dist.powi(6);

            let mut torque = diff;
            if torque.len_sq() > 1e-16 {
                torque.normalize();
                torque.scale(factor);
                return torque;
            }
        }
    }
    Vector3::zero()
}
