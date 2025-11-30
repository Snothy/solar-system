use crate::common::types::PhysicsBody;
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::forces::{calculate_accelerations, ForceConfig, GravityMode};

use crate::integrators::traits::Integrator;
use crate::integrators::types::IntegratorQuality;

pub struct SymplecticIntegrator;

use crate::common::units::Seconds;

impl Integrator for SymplecticIntegrator {
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
            IntegratorQuality::Low => 8640.0,    // 0.1 day
            IntegratorQuality::Medium => 864.0,  // 0.01 day
            IntegratorQuality::High => 60.0,     // 1 minute
            IntegratorQuality::Ultra => 10.0,    // 10 seconds
        };

        let mut time_remaining = dt;
        while time_remaining > 0.0 {
            let sub_dt = if time_remaining > max_substep { max_substep } else { time_remaining };
            step_symplectic_4_internal(bodies, parent_indices, sub_dt, config);
            time_remaining -= sub_dt;
        }
    }

    fn name(&self) -> &'static str {
        "Symplectic 4th Order"
    }
}

pub fn step_symplectic_4(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: Seconds,
    config: &PhysicsConfig,
) {
    // Legacy wrapper for tests/compatibility
    // Default to Medium quality if called directly
    let integrator = SymplecticIntegrator;
    integrator.step(bodies, parent_indices, dt, config, IntegratorQuality::Medium);
}

fn step_symplectic_4_internal(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: f64,
    config: &PhysicsConfig,
) {
    // Yoshida 4th order coefficients
    const W0: f64 = -1.7024143839193153; // 2^(1/3) / (2 - 2^(1/3))
    const W1: f64 = 1.3512071919596578;  // 1 / (2 - 2^(1/3))
    
    let c = [W1 / 2.0, (W0 + W1) / 2.0, (W0 + W1) / 2.0, W1 / 2.0];
    let d = [W1, W0, W1];

    let n = bodies.len();

    // 1. First Drift
    for i in 0..n {
        let v = bodies[i].vel;
        let mut dr = v; dr.scale(c[0] * dt);
        bodies[i].pos.add(&dr);
    }

    // 2. First Kick
    let force_config = ForceConfig {
        physics: config,
        parent_indices,
        gravity_mode: GravityMode::FullNBody,
    };
    let accs = calculate_accelerations(bodies, &force_config);
    
    for i in 0..n {
        let mut dv = accs[i]; dv.scale(d[0] * dt);
        bodies[i].vel.add(&dv);
    }

    // 3. Second Drift
    for i in 0..n {
        let v = bodies[i].vel;
        let mut dr = v; dr.scale(c[1] * dt);
        bodies[i].pos.add(&dr);
    }

    // 4. Second Kick
    let accs = calculate_accelerations(bodies, &force_config);
    
    for i in 0..n {
        let mut dv = accs[i]; dv.scale(d[1] * dt);
        bodies[i].vel.add(&dv);
    }

    // 5. Third Drift
    for i in 0..n {
        let v = bodies[i].vel;
        let mut dr = v; dr.scale(c[2] * dt);
        bodies[i].pos.add(&dr);
    }

    // 6. Third Kick
    let accs = calculate_accelerations(bodies, &force_config);
    
    for i in 0..n {
        let mut dv = accs[i]; dv.scale(d[2] * dt);
        bodies[i].vel.add(&dv);
    }

    // 7. Fourth Drift
    for i in 0..n {
        let v = bodies[i].vel;
        let mut dr = v; dr.scale(c[3] * dt);
        bodies[i].pos.add(&dr);
    }
}
