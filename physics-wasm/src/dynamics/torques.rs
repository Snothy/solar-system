use crate::common::types::{Vector3, PhysicsBody};
use crate::forces::tidal::calculate_tidal_torque;

pub fn apply_tidal_torque(bodies: &mut Vec<PhysicsBody>, dt: f64) {
    let n = bodies.len();
    let mut torques = vec![Vector3::zero(); n];
    
    for i in 0..n {
        for j in (i+1)..n {
             let b1 = &bodies[i];
             let b2 = &bodies[j];
             let mut r_vec = b2.pos; r_vec.sub(&b1.pos);
             let dist = r_vec.len();
             
             // Torque on b1
             let t1 = calculate_tidal_torque(b1, b2, &r_vec, dist);
             torques[i].add(&t1);
             
             // Torque on b2
             let mut r_vec_neg = r_vec; r_vec_neg.scale(-1.0);
             let t2 = calculate_tidal_torque(b2, b1, &r_vec_neg, dist);
             torques[j].add(&t2);
        }
    }
    
    // Apply torques
    for (i, b) in bodies.iter_mut().enumerate() {
        if let (Some(inertia), Some(mut ang_vel)) = (b.moment_of_inertia, b.angular_velocity) {
            let mut t = torques[i];
            t.scale(dt / inertia);
            ang_vel.add(&t);
            b.angular_velocity = Some(ang_vel);
        }
    }
}

pub fn apply_yorp_torque(bodies: &mut Vec<PhysicsBody>, dt: f64) {
    let sun_idx = bodies.iter().position(|b| b.name == "Sun");
    if let Some(s_idx) = sun_idx {
        let sun_pos = bodies[s_idx].pos;
        
        for b in bodies.iter_mut() {
            if let (Some(yorp), Some(mut ang_vel), Some(pole)) = (b.yorp_factor, b.angular_velocity, b.pole_vector) {
                // YORP Effect: Changes spin rate based on distance to Sun
                // d_omega/dt = C_YORP / r^2
                
                let dist_sq = b.pos.distance_to(&sun_pos).powi(2);
                if dist_sq > 0.0 {
                    let d_omega = yorp / dist_sq * dt;
                    
                    // Apply along the pole vector (spin up/down)
                    let mut change = pole;
                    change.scale(d_omega);
                    
                    ang_vel.add(&change);
                    b.angular_velocity = Some(ang_vel);
                }
            }
        }
    }
}
