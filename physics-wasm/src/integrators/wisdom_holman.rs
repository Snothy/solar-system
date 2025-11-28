use crate::common::types::PhysicsBody;
use crate::common::utils::update_velocities;
use crate::forces::calculate_accelerations;
use crate::dynamics::kepler::drift_kepler_relative;

pub fn step_wisdom_holman(
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
    let sun_idx = bodies.iter().position(|b| b.name == "Sun");
    
    if let Some(s_idx) = sun_idx {
        // Store Sun's state at t
        let sun_mass = bodies[s_idx].mass;
        let sun_pos_t = bodies[s_idx].pos;
        let sun_vel_t = bodies[s_idx].vel;
        
        // 1. DRIFT (dt/2) - Heliocentric Keplerian motion
        
        // Sun: Linear drift (or stationary in heliocentric frame)
        let mut sun_delta = sun_vel_t;
        sun_delta.scale(dt / 2.0);
        bodies[s_idx].pos.add(&sun_delta);
        
        let sun_pos_half = bodies[s_idx].pos;
        let sun_vel_half = bodies[s_idx].vel; // Velocity constant for linear drift
        
        // All other bodies: Kepler drift around Sun
        // CRITICAL FIX: Drift relative to OLD Sun, restore relative to NEW Sun
        for i in 0..bodies.len() {
            if i == s_idx { continue; }
            
            // Drift in relative coordinates (uses sun_pos_t to convert to relative)
            drift_kepler_relative(&mut bodies[i], dt / 2.0, sun_mass, &sun_pos_t, &sun_vel_t);
            
            // Restore absolute coordinates using NEW Sun position (sun_pos_half)
            bodies[i].pos.add(&sun_pos_half);
            bodies[i].vel.add(&sun_vel_half);
        }
        
        // 2. KICK (dt) - Perturbations only (Keplerian term already handled by drift)
        
        // Compute accelerations with Sun's Keplerian term subtracted
        // In heliocentric formulation, ALL bodies have their Sun Keplerian interaction
        // handled by drift, so we subtract it from accelerations
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
            false,  // Don't include Sun gravity - it's handled by drift
            false   // No parent subtraction - we're not using hierarchical
        );
        
        update_velocities(bodies, &accs, dt);
        
        // 3. DRIFT (dt/2) - Second half-step
        
        // Sun's NEW position/velocity after first drift and kick
        let sun_pos_t_plus = bodies[s_idx].pos;
        let sun_vel_t_plus = bodies[s_idx].vel;
        
        // Sun: Linear drift
        let mut sun_delta = sun_vel_t_plus;
        sun_delta.scale(dt / 2.0);
        bodies[s_idx].pos.add(&sun_delta);
        
        let sun_pos_final = bodies[s_idx].pos;
        let sun_vel_final = bodies[s_idx].vel;
        
        // All other bodies: Kepler drift around Sun
        for i in 0..bodies.len() {
            if i == s_idx { continue; }
            
            // Drift relative to "Old" Sun (which is sun_pos_t_plus)
            drift_kepler_relative(&mut bodies[i], dt / 2.0, sun_mass, &sun_pos_t_plus, &sun_vel_t_plus);
            
            // Restore relative to "New" Sun (sun_pos_final)
            bodies[i].pos.add(&sun_pos_final);
            bodies[i].vel.add(&sun_vel_final);
        }
    }
}
