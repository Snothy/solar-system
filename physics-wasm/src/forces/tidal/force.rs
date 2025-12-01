use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};

/// Calculate tidal force acting on satellite due to primary body.
pub fn apply_tidal(b1: &PhysicsBody, b2: &PhysicsBody, r_vec: &Vector3, dist: f64, angular_velocity: Vector3) -> Vector3 {
    if let Some(tidal) = &b1.tidal {
        if let (Some(k2), Some(q)) = (tidal.k2, tidal.tidal_q) {
            let mut orb_vel = b2.vel;
            orb_vel.sub(&b1.vel);
            
            // Safety check: if inside Roche limit or radius, clamp or return zero
            if dist < b1.radius {
                return Vector3::zero();
            }

            // Tidal force formula: a_tidal = (3/2) * k2/Q * (GM_sat/r²) * (R_pri/r)⁵
            let gm_over_r2 = G * b2.mass / (dist * dist);
            let r_ratio_5 = (b1.radius / dist).powi(5);

            // 1. Dissipative Term (Lag)
            let acc_dissipative = 1.5 * (k2 / q) * gm_over_r2 * r_ratio_5;

            // Determine direction based on relative angular velocity
            // F ~ (Omega_rot - Omega_orb) x r

            let mut orbital_ang_vel = r_vec.cross(&orb_vel);
            orbital_ang_vel.scale(1.0 / (dist * dist));

            let rot_vel = angular_velocity;

            let mut delta_omega = rot_vel;
            delta_omega.sub(&orbital_ang_vel);

            let mut dir = delta_omega.cross(r_vec);

            let mut total_force = Vector3::zero();

            if dir.len_sq() > 1e-16 {
                dir.normalize();
                dir.scale(acc_dissipative * b2.mass);
                total_force.add(&dir);
            }

            // 2. Conservative Term (Radial)
            // F_cons = -3 * k2 * (GM/r^2) * (R/r)^5 * m_sat
            // Directed radially inward (towards primary)
            // This causes apsidal precession
            let acc_conservative = 3.0 * k2 * gm_over_r2 * r_ratio_5;
            let mut radial_dir = *r_vec;
            radial_dir.normalize();
            radial_dir.scale(-acc_conservative * b2.mass); // Negative = Attractive (towards primary)



            total_force.add(&radial_dir);



            return total_force;
        }
    }
    Vector3::zero()
}
