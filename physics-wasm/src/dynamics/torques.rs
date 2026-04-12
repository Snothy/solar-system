use crate::common::types::{PhysicsBody, Vector3};
use crate::common::config::PhysicsConfig;
use crate::common::units::Seconds;
use crate::forces::tidal::calculate_tidal_torque;
use crate::analysis::update_moon_libration;

/// Applies all enabled torque effects to the bodies.
///
/// This function orchestrates the application of:
/// - Tidal torques
/// - YORP effect
/// - Moon libration updates

pub fn apply_all_torques(bodies: &mut Vec<PhysicsBody>, dt: Seconds, config: &PhysicsConfig) {
    if config.tidal_forces {
        apply_tidal_torque(bodies, dt);
    }
    if config.yorp_effect {
        apply_yorp_torque(bodies, dt);
    }
    // Libration is a kinematic update, but fitting to put here
    update_moon_libration(bodies);
}

pub fn apply_tidal_torque(bodies: &mut Vec<PhysicsBody>, dt: Seconds) {
    let n = bodies.len();
    // Pre-allocate torque accumulator to avoid order-of-operation bias
    let mut torques = vec![Vector3::zero(); n];

    for i in 0..n {
        for j in (i + 1)..n {
            let b1 = &bodies[i];
            let b2 = &bodies[j];
            
            let mut r_vec = b2.pos;
            r_vec.sub(&b1.pos);
            let dist = r_vec.len();

            // Optimization: Skip calculation if bodies are extremely far (e.g. > 1e12 meters)
            // or if dist is zero (collision/singularity)
            if dist > 0.0 {
                // Torque on b1
                let t1 = calculate_tidal_torque(b1, b2, &r_vec, dist);
                torques[i].add(&t1);

                // Torque on b2 (Action-Reaction, but calculated individually due to different radii/k2)
                let mut r_vec_neg = r_vec;
                r_vec_neg.scale(-1.0);
                let t2 = calculate_tidal_torque(b2, b1, &r_vec_neg, dist);
                torques[j].add(&t2);
            }
        }
    }

    // Apply torques
    for (i, b) in bodies.iter_mut().enumerate() {
        if let Some(rotation) = &mut b.rotation {
            if let (Some(inertia), Some(mut ang_vel)) = (rotation.moment_of_inertia, rotation.angular_velocity) {
                // SAFETY: Prevent division by zero
                if inertia > 1e-9 {
                    let mut t = torques[i];
                    // alpha = Torque / I
                    // w_new = w_old + alpha * dt
                    t.scale(dt / inertia);
                    ang_vel.add(&t);
                    rotation.angular_velocity = Some(ang_vel);
                }
            }
        }
    }
}

pub fn apply_yorp_torque(bodies: &mut Vec<PhysicsBody>, dt: Seconds) {
    // Optimization: Find Sun once
    let sun_pos = match bodies.iter().find(|b| b.name == "Sun") {
        Some(s) => s.pos,
        None => return,
    };

    for b in bodies.iter_mut() {
        // Optimization: YORP is negligible for massive bodies (Planets/Moons).
        // Only apply to small bodies (e.g. Mass < 1e16 kg) to save CPU.
        let mass = b.gm / crate::common::constants::G;
        if mass > 1e16 { continue; }

        let yorp_factor = b.comet.as_ref().and_then(|c| c.yorp_factor);
        let pole_vector = b.gravity_harmonics.as_ref().and_then(|h| h.pole_vector);

        if let Some(rotation) = &mut b.rotation {
            if let (Some(yorp), Some(mut ang_vel), Some(pole)) =
                (yorp_factor, rotation.angular_velocity, pole_vector)
            {
                // OPTIMIZATION: Calc dist_sq directly without sqrt
                let dx = b.pos.x - sun_pos.x;
                let dy = b.pos.y - sun_pos.y;
                let dz = b.pos.z - sun_pos.z;
                let dist_sq = dx*dx + dy*dy + dz*dz;

                if dist_sq > 0.0 {
                    let d_omega = yorp / dist_sq * dt;

                    // Apply along the pole vector
                    let mut change = pole;
                    change.scale(d_omega);

                    ang_vel.add(&change);
                    rotation.angular_velocity = Some(ang_vel);
                }
            }
        }
    }
}
