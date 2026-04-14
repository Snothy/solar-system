use crate::common::types::PhysicsBody;
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::forces::{calculate_accelerations, ForceConfig, GravityMode};

// SABA4 Coefficients (Laskar & Robutel 2001)
// c coefficients (Drift)
pub const SABA4_C1: f64 = 0.06943184420297371;
pub const SABA4_C2: f64 = 0.26057763400459815;
pub const SABA4_C3: f64 = 0.33998104358485626;

// d coefficients (Kick)
pub const SABA4_D1: f64 = 0.17392742256872693;
pub const SABA4_D2: f64 = 0.3260725774312731;

use crate::integrators::traits::Integrator;
use crate::integrators::types::IntegratorQuality;

pub struct Saba4Integrator;

use crate::common::units::Seconds;

impl Integrator for Saba4Integrator {
    fn step(
        &self,
        bodies: &mut Vec<PhysicsBody>,
        parent_indices: &[ParentIndex],
        dt: Seconds,
        config: &PhysicsConfig,
        quality: IntegratorQuality,
        current_jd: f64,
    ) {
        // Handle substeps based on quality (similar to Symplectic)
        let max_substep = match quality {
            IntegratorQuality::Low => 86400.0,   // 1 day
            IntegratorQuality::Medium => 8640.0, // 0.1 day
            IntegratorQuality::High => 864.0,    // 0.01 day
            IntegratorQuality::Ultra => 60.0,    // 1 minute
        };

        let mut time_remaining = dt;
        let mut current_time = current_jd;
        while time_remaining > 0.0 {
            let sub_dt = if time_remaining > max_substep { max_substep } else { time_remaining };
            step_saba4_internal(bodies, parent_indices, sub_dt, config, current_time);
            time_remaining -= sub_dt;
            current_time += sub_dt / 86400.0;
        }
    }

    fn name(&self) -> &'static str {
        "SABA4"
    }
}

pub fn step_saba4(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: Seconds,
    config: &PhysicsConfig,
) {
    // Legacy wrapper
    let integrator = Saba4Integrator;
    integrator.step(bodies, parent_indices, dt, config, IntegratorQuality::Medium, 2451545.0);
}

fn step_saba4_internal(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: f64,
    config: &PhysicsConfig,
    current_jd: f64,
) {
    // SABA4: A B A B A B A B A
    // A = Drift (Kepler), B = Kick (Interaction)
    
    // Step 1: A(c1)
    drift_system_kepler(bodies, SABA4_C1 * dt);
    
    // Step 2: B(d1)
    kick_system_interaction(bodies, parent_indices, SABA4_D1 * dt, config, current_jd);
    
    // Step 3: A(c2)
    drift_system_kepler(bodies, SABA4_C2 * dt);
    
    // Step 4: B(d2)
    kick_system_interaction(bodies, parent_indices, SABA4_D2 * dt, config, current_jd);
    
    // Step 5: A(c3)
    drift_system_kepler(bodies, SABA4_C3 * dt);
    
    // Step 6: B(d2)
    kick_system_interaction(bodies, parent_indices, SABA4_D2 * dt, config, current_jd);
    
    // Step 7: A(c2)
    drift_system_kepler(bodies, SABA4_C2 * dt);
    
    // Step 8: B(d1)
    kick_system_interaction(bodies, parent_indices, SABA4_D1 * dt, config, current_jd);
    
    // Step 9: A(c1)
    drift_system_kepler(bodies, SABA4_C1 * dt);
}

fn drift_system_kepler(bodies: &mut Vec<PhysicsBody>, dt: f64) {
    let sun_idx = bodies.iter().position(|b| b.name == "Sun");
    
    if let Some(s_idx) = sun_idx {
        // We capture the Sun's state at the START of the drift
        let sun_gm = bodies[s_idx].gm;
        let sun_pos_old = bodies[s_idx].pos;
        let sun_vel = bodies[s_idx].vel; // Sun velocity is constant during Drift (A)
        
        // 1. Move the Sun linearly (The "Barycentric Drift" component)
        let mut sun_displacement = sun_vel;
        sun_displacement.scale(dt);
        bodies[s_idx].pos.add(&sun_displacement);
        let sun_pos_new = bodies[s_idx].pos;
        
        for i in 0..bodies.len() {
            if i == s_idx { continue; }
            
            // 2. Convert to Heliocentric RELATIVE coordinates
            let mut rel_pos = bodies[i].pos;
            rel_pos.sub(&sun_pos_old);
            
            let mut rel_vel = bodies[i].vel;
            rel_vel.sub(&sun_vel);
            
            // 3. Kepler Drift: Only use Sun's GM. 
            // Including the planet's GM here usually leads to energy error 
            // because the 'Kick' step also accounts for the planet's mass.
            let mu = sun_gm; 
            use crate::dynamics::kepler::solve_kepler_drift;
            solve_kepler_drift(&mut rel_pos, &mut rel_vel, dt, mu);
            
            // 4. Map back to Absolute coordinates using the updated Sun position
            bodies[i].pos = rel_pos;
            bodies[i].pos.add(&sun_pos_new);
            
            bodies[i].vel = rel_vel;
            bodies[i].vel.add(&sun_vel);
        }
    } else {
        // Fallback to linear drift
        for body in bodies.iter_mut() {
            let mut delta = body.vel;
            delta.scale(dt);
            body.pos.add(&delta);
        }
    }
}
fn kick_system_interaction(
    bodies: &mut Vec<PhysicsBody>, 
    parent_indices: &[ParentIndex],
    dt: f64,
    config: &PhysicsConfig,
    current_jd: f64,
) {
    let force_config = ForceConfig {
        physics: config,
        parent_indices,
        gravity_mode: GravityMode::SplitDriftKick,
    };
    let accs = calculate_accelerations(bodies, &force_config, current_jd);
    
    for (i, acc) in accs.iter().enumerate() {
        let mut dv = *acc;
        dv.scale(dt);
        bodies[i].vel.add(&dv);
    }
}
