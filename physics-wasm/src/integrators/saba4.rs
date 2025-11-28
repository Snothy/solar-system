use crate::common::types::PhysicsBody;
use crate::common::utils::{update_positions, update_velocities};
use crate::forces::calculate_accelerations;
use crate::dynamics::kepler::drift_kepler_relative;

// SABA4 Coefficients (Laskar & Robutel 2001)
// c coefficients (Drift)
pub const SABA4_C1: f64 = 0.06943184420297371;
pub const SABA4_C2: f64 = 0.26057763400459815;
pub const SABA4_C3: f64 = 0.33998104358485626;

// d coefficients (Kick)
pub const SABA4_D1: f64 = 0.17392742256872693;
pub const SABA4_D2: f64 = 0.3260725774312731;

pub fn step_saba4(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &Vec<Option<usize>>,
    dt: f64,
    enable_relativity: bool, 
    enable_j2: bool, 
    enable_tidal: bool,
    enable_srp: bool,
    enable_yarkovsky: bool,
    enable_drag: bool,
    use_eih: bool,
    enable_pr_drag: bool,
    enable_comet_forces: bool
) {
    // SABA4: A B A B A B A B A
    // A = Drift (Kepler), B = Kick (Interaction)
    
    // Step 1: A(c1)
    drift_system_kepler(bodies, SABA4_C1 * dt);
    
    // Step 2: B(d1)
    kick_system_interaction(bodies, parent_indices, SABA4_D1 * dt, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih, enable_pr_drag, enable_comet_forces);
    
    // Step 3: A(c2)
    drift_system_kepler(bodies, SABA4_C2 * dt);
    
    // Step 4: B(d2)
    kick_system_interaction(bodies, parent_indices, SABA4_D2 * dt, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih, enable_pr_drag, enable_comet_forces);
    
    // Step 5: A(c3)
    drift_system_kepler(bodies, SABA4_C3 * dt);
    
    // Step 6: B(d2)
    kick_system_interaction(bodies, parent_indices, SABA4_D2 * dt, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih, enable_pr_drag, enable_comet_forces);
    
    // Step 7: A(c2)
    drift_system_kepler(bodies, SABA4_C2 * dt);
    
    // Step 8: B(d1)
    kick_system_interaction(bodies, parent_indices, SABA4_D1 * dt, enable_relativity, enable_j2, enable_tidal, enable_srp, enable_yarkovsky, enable_drag, use_eih, enable_pr_drag, enable_comet_forces);
    
    // Step 9: A(c1)
    drift_system_kepler(bodies, SABA4_C1 * dt);
}

fn drift_system_kepler(bodies: &mut Vec<PhysicsBody>, dt: f64) {
    let sun_idx = bodies.iter().position(|b| b.name == "Sun");
    if let Some(s_idx) = sun_idx {
        let sun_mass = bodies[s_idx].mass;
        let sun_pos_old = bodies[s_idx].pos;
        let sun_vel_old = bodies[s_idx].vel;
        
        // Sun Linear Drift
        let mut sun_delta = sun_vel_old;
        sun_delta.scale(dt);
        bodies[s_idx].pos.add(&sun_delta);
        
        let sun_pos_new = bodies[s_idx].pos;
        let sun_vel_new = bodies[s_idx].vel; // Constant
        
        for i in 0..bodies.len() {
            if i == s_idx { continue; }
            drift_kepler_relative(&mut bodies[i], dt, sun_mass, &sun_pos_old, &sun_vel_old);
            // Restore relative to NEW Sun
            bodies[i].pos.add(&sun_pos_new);
            bodies[i].vel.add(&sun_vel_new);
        }
    } else {
        update_positions(bodies, dt);
    }
}

fn kick_system_interaction(
    bodies: &mut Vec<PhysicsBody>, 
    parent_indices: &Vec<Option<usize>>,
    dt: f64,
    enable_relativity: bool, 
    enable_j2: bool, 
    enable_tidal: bool,
    enable_srp: bool,
    enable_yarkovsky: bool,
    enable_drag: bool,
    use_eih: bool,
    enable_pr_drag: bool,
    enable_comet_forces: bool
) {
    let accs = calculate_accelerations(
        bodies, 
        parent_indices,
        enable_relativity, 
        enable_j2, 
        enable_tidal, 
        enable_srp, 
        enable_yarkovsky, 
        enable_drag, 
        use_eih, 
        enable_pr_drag, 
        enable_comet_forces,
        false, // include_sun_gravity (handled by drift)
        false  // subtract_parent_gravity (not needed for SABA/WH)
    );
    update_velocities(bodies, &accs, dt);
}
