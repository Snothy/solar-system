use crate::common::types::{PhysicsBody, Vector3};
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::forces::{calculate_accelerations, ForceConfig, GravityMode};
use crate::integrators::traits::Integrator;
use crate::integrators::types::IntegratorQuality;
use crate::common::units::Seconds;
use crate::dynamics::kepler::solve_kepler_drift;

pub struct WisdomHolmanIntegrator;

impl Integrator for WisdomHolmanIntegrator {
    fn step(
        &self,
        bodies: &mut Vec<PhysicsBody>,
        parent_indices: &[ParentIndex],
        dt: Seconds,
        config: &PhysicsConfig,
        quality: IntegratorQuality,
        current_jd: f64,
    ) {
        // Wisdom-Holman requires more frequent updates than SABA4 
        // to handle the Jovian moons accurately.
        let max_substep = match quality {
            IntegratorQuality::Low => 86400.0,   // 1 day
            IntegratorQuality::Medium => 3600.0,  // 1 hour
            IntegratorQuality::High => 600.0,    // 10 minutes
            IntegratorQuality::Ultra => 60.0,    // 1 minute
        };

        let mut time_remaining = dt;
        let mut current_time = current_jd;
        
        while time_remaining > 0.0 {
            let sub_dt = if time_remaining > max_substep { max_substep } else { time_remaining };
            step_wisdom_holman_internal(bodies, parent_indices, sub_dt, config, current_time);
            time_remaining -= sub_dt;
            current_time += sub_dt / 86400.0;
        }
    }

    fn name(&self) -> &'static str {
        "Wisdom-Holman"
    }
}

pub fn step_wisdom_holman(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: Seconds,
    config: &PhysicsConfig,
) {
    let integrator = WisdomHolmanIntegrator;
    integrator.step(bodies, parent_indices, dt, config, IntegratorQuality::Medium, 2451545.0);
}

fn step_wisdom_holman_internal(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: f64,
    config: &PhysicsConfig,
    current_jd: f64,
) {
    let sun_idx = bodies.iter().position(|b| b.name == "Sun");

    if let Some(s_idx) = sun_idx {
        // --- 1. DRIFT A (dt/2) ---
        // Advance the system using purely Keplerian motion around the Sun.
        drift_system_kepler_wh(bodies, s_idx, dt / 2.0);

        // --- 2. KICK B (dt) ---
        // Calculate perturbations (Planet-Planet, J2, etc.) 
        // CRITICAL: GravityMode::SplitDriftKick MUST ignore Sun's primary GM/r^2
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

        // --- 3. DRIFT A (dt/2) ---
        // Final Keplerian drift with updated velocities.
        drift_system_kepler_wh(bodies, s_idx, dt / 2.0);

    } else {
        // Fallback for systems without a "Sun" (Linear Drift)
        for body in bodies.iter_mut() {
            let mut displacement = body.vel;
            displacement.scale(dt);
            body.pos.add(&displacement);
        }
    }
}

/// Specialized Heliocentric Drift for Wisdom-Holman
fn drift_system_kepler_wh(bodies: &mut Vec<PhysicsBody>, sun_idx: usize, dt: f64) {
    let sun_gm = bodies[sun_idx].gm;
    let sun_pos_start = bodies[sun_idx].pos;
    let sun_vel = bodies[sun_idx].vel;

    // Move the Sun linearly (The drift of the coordinate origin)
    let mut sun_displacement = sun_vel;
    sun_displacement.scale(dt);
    bodies[sun_idx].pos.add(&sun_displacement);
    let sun_pos_end = bodies[sun_idx].pos;

    for i in 0..bodies.len() {
        if i == sun_idx { continue; }

        // Convert to Heliocentric Relative state
        let mut rel_pos = bodies[i].pos;
        rel_pos.sub(&sun_pos_start);
        let mut rel_vel = bodies[i].vel;
        rel_vel.sub(&sun_vel);

        // Drift using Universal Variables Kepler solver
        // Use ONLY sun_gm to stay consistent with the Force Split
        solve_kepler_drift(&mut rel_pos, &mut rel_vel, dt, sun_gm);

        // Convert back to Absolute coordinates using the updated Sun position
        bodies[i].pos = rel_pos;
        bodies[i].pos.add(&sun_pos_end);
        
        bodies[i].vel = rel_vel;
        bodies[i].vel.add(&sun_vel);
    }
}