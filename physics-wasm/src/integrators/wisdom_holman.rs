use crate::common::types::PhysicsBody;
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::forces::{calculate_accelerations, ForceConfig, GravityMode};

use crate::integrators::traits::Integrator;
use crate::integrators::types::IntegratorQuality;

pub struct WisdomHolmanIntegrator;

use crate::common::units::Seconds;

impl Integrator for WisdomHolmanIntegrator {
    fn step(
        &self,
        bodies: &mut Vec<PhysicsBody>,
        parent_indices: &[ParentIndex],
        dt: Seconds,
        config: &PhysicsConfig,
        quality: IntegratorQuality,
    ) {
        // Handle substeps based on quality
        let max_substep = match quality {
            IntegratorQuality::Low => 432000.0,  // 5 days
            IntegratorQuality::Medium => 86400.0,// 1 day
            IntegratorQuality::High => 8640.0,   // 0.1 day
            IntegratorQuality::Ultra => 864.0,   // 0.01 day
        };

        let mut time_remaining = dt;
        while time_remaining > 0.0 {
            let sub_dt = if time_remaining > max_substep { max_substep } else { time_remaining };
            step_wisdom_holman_internal(bodies, parent_indices, sub_dt, config);
            time_remaining -= sub_dt;
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
    // Legacy wrapper
    let integrator = WisdomHolmanIntegrator;
    integrator.step(bodies, parent_indices, dt, config, IntegratorQuality::Medium);
}

fn step_wisdom_holman_internal(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: f64,
    config: &PhysicsConfig,
) {
    let sun_idx = bodies.iter().position(|b| b.name == "Sun");
    
    if let Some(s_idx) = sun_idx {
        // Store Sun's state at t
        let sun_mass = bodies[s_idx].mass;
        let sun_pos_t = bodies[s_idx].pos;
        let sun_vel_t = bodies[s_idx].vel;
        
        // 1. DRIFT (dt/2) - Heliocentric Keplerian motion
        
        // Sun: Linear drift
        let mut sun_delta = sun_vel_t;
        sun_delta.scale(dt / 2.0);
        bodies[s_idx].pos.add(&sun_delta);
        
        let sun_pos_half = bodies[s_idx].pos;
        let sun_vel_half = bodies[s_idx].vel;
        
        // All other bodies: Kepler drift around Sun
        for i in 0..bodies.len() {
            if i == s_idx { continue; }
            
            // Convert to heliocentric coordinates
            let mut rel_pos = bodies[i].pos;
            rel_pos.sub(&sun_pos_t);
            let mut rel_vel = bodies[i].vel;
            rel_vel.sub(&sun_vel_t);
            
            // Drift in heliocentric frame using Kepler solver
            let mu = crate::common::constants::G * (sun_mass + bodies[i].mass);
            use crate::dynamics::kepler::solve_kepler_drift;
            solve_kepler_drift(&mut rel_pos, &mut rel_vel, dt / 2.0, mu);
            
            // Convert back to absolute coordinates using NEW sun position
            bodies[i].pos = rel_pos;
            bodies[i].pos.add(&sun_pos_half);
            bodies[i].vel = rel_vel;
            bodies[i].vel.add(&sun_vel_half);
        }
        
        // 2. KICK (dt) - Perturbations only (Keplerian term handled by drift)
        
        // Compute accelerations with Sun's Keplerian term subtracted
        let force_config = ForceConfig {
            physics: config,
            parent_indices,
            gravity_mode: GravityMode::SplitDriftKick,
        };
        let accs = calculate_accelerations(bodies, &force_config);
        
        for (i, acc) in accs.iter().enumerate() {
            let mut dv = *acc;
            dv.scale(dt);
            bodies[i].vel.add(&dv);
        }
        
        // 3. DRIFT (dt/2) - Second half-step
        
        // Sun's position/velocity after first drift and kick
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
            
            // Convert to heliocentric coordinates
            let mut rel_pos = bodies[i].pos;
            rel_pos.sub(&sun_pos_t_plus);
            let mut rel_vel = bodies[i].vel;
            rel_vel.sub(&sun_vel_t_plus);
            
            // Drift in heliocentric frame using Kepler solver
            let mu = crate::common::constants::G * (sun_mass + bodies[i].mass);
            use crate::dynamics::kepler::solve_kepler_drift;
            solve_kepler_drift(&mut rel_pos, &mut rel_vel, dt / 2.0, mu);
            
            // Convert back to absolute coordinates using final sun position
            bodies[i].pos = rel_pos;
            bodies[i].pos.add(&sun_pos_final);
            bodies[i].vel = rel_vel;
            bodies[i].vel.add(&sun_vel_final);
        }
    } else {
        // Fallback if no Sun - use hierarchical drift
        apply_hierarchical_drift(bodies, parent_indices, dt / 2.0);
        
        let force_config = ForceConfig {
            physics: config,
            parent_indices,
            gravity_mode: GravityMode::HierarchicalSubtraction,
        };
        let accs = calculate_accelerations(bodies, &force_config);
        
        for (i, acc) in accs.iter().enumerate() {
            let mut dv = *acc;
            dv.scale(dt);
            bodies[i].vel.add(&dv);
        }
        
        apply_hierarchical_drift(bodies, parent_indices, dt / 2.0);
    }
}

fn apply_hierarchical_drift(bodies: &mut [PhysicsBody], parent_indices: &[ParentIndex], dt: f64) {
    use crate::dynamics::kepler::solve_kepler_drift;
    
    let n = bodies.len();
    for i in 0..n {
        if let Some(p_idx) = parent_indices[i] {
            let parent_idx = p_idx.as_usize();
            let mu = crate::common::constants::G * (bodies[parent_idx].mass + bodies[i].mass);
            
            // Relative state
            let mut rel_pos = bodies[i].pos;
            rel_pos.sub(&bodies[parent_idx].pos);
            let mut rel_vel = bodies[i].vel;
            rel_vel.sub(&bodies[parent_idx].vel);
            
            solve_kepler_drift(&mut rel_pos, &mut rel_vel, dt, mu);
            
            // Reconstruct absolute state
            let mut new_pos = bodies[parent_idx].pos;
            new_pos.add(&rel_pos);
            let mut new_vel = bodies[parent_idx].vel;
            new_vel.add(&rel_vel);
            bodies[i].pos = new_pos;
            bodies[i].vel = new_vel;
        } else {
            // No parent, linear drift
            let v = bodies[i].vel;
            let mut dr = v;
            dr.scale(dt);
            bodies[i].pos.add(&dr);
        }
    }
}
