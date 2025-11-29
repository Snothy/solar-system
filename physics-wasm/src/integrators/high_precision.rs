use crate::common::types::PhysicsBody;
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::forces::{calculate_accelerations, ForceConfig, GravityMode};
use ode_solvers::{DVector, Dop853, System};

use crate::integrators::traits::Integrator;
use crate::integrators::types::IntegratorQuality;

pub struct HighPrecisionIntegrator;

use crate::common::units::Seconds;

impl Integrator for HighPrecisionIntegrator {
    fn step(
        &self,
        bodies: &mut Vec<PhysicsBody>,
        parent_indices: &[ParentIndex],
        dt: Seconds,
        config: &PhysicsConfig,
        quality: IntegratorQuality,
    ) {
        step_high_precision_internal(bodies, parent_indices, dt, config, quality);
    }

    fn name(&self) -> &'static str {
        "DOP853 High Precision"
    }
}

pub fn step_high_precision(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: Seconds,
    config: &PhysicsConfig,
) {
    // Legacy wrapper - default to High quality
    let integrator = HighPrecisionIntegrator;
    integrator.step(bodies, parent_indices, dt, config, IntegratorQuality::High);
}

fn step_high_precision_internal(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: f64,
    config: &PhysicsConfig,
    quality: IntegratorQuality,
) {
    let n = bodies.len();
    let mut state = DVector::from_element(n * 6, 0.0);
    
    for (i, b) in bodies.iter().enumerate() {
        state[i*6 + 0] = b.pos.x;
        state[i*6 + 1] = b.pos.y;
        state[i*6 + 2] = b.pos.z;
        state[i*6 + 3] = b.vel.x;
        state[i*6 + 4] = b.vel.y;
        state[i*6 + 5] = b.vel.z;
    }
    
    struct SolarSystem {
        bodies: Vec<PhysicsBody>,
        parent_indices: Vec<ParentIndex>,
        config: PhysicsConfig,
    }

    impl System<DVector<f64>> for SolarSystem {
        fn system(&self, _t: f64, y: &DVector<f64>, dy: &mut DVector<f64>) {
            let n = self.bodies.len();
            
            // Update temp bodies from y state
            let mut temp_bodies = self.bodies.clone();
            for i in 0..n {
                temp_bodies[i].pos.x = y[i*6 + 0];
                temp_bodies[i].pos.y = y[i*6 + 1];
                temp_bodies[i].pos.z = y[i*6 + 2];
                temp_bodies[i].vel.x = y[i*6 + 3];
                temp_bodies[i].vel.y = y[i*6 + 4];
                temp_bodies[i].vel.z = y[i*6 + 5];
            }
            
            // Calculate accelerations
            let force_config = ForceConfig {
                physics: &self.config,
                parent_indices: &self.parent_indices,
                gravity_mode: GravityMode::FullNBody,
            };
            let accs = calculate_accelerations(&temp_bodies, &force_config);
            
            // Fill dy (derivative)
            for i in 0..n {
                dy[i*6 + 0] = temp_bodies[i].vel.x;
                dy[i*6 + 1] = temp_bodies[i].vel.y;
                dy[i*6 + 2] = temp_bodies[i].vel.z;
                dy[i*6 + 3] = accs[i].x;
                dy[i*6 + 4] = accs[i].y;
                dy[i*6 + 5] = accs[i].z;
            }
        }
    }

    let system = SolarSystem {
        bodies: bodies.clone(),
        parent_indices: parent_indices.to_vec(),
        config: config.clone(),
    };

    // Map quality to tolerance levels
    let (rtol, atol) = match quality {
        IntegratorQuality::Low => (1e-9, 1e-9),      // Fast but less accurate
        IntegratorQuality::Medium => (1e-11, 1e-11), // Balanced
        IntegratorQuality::High => (1e-13, 1e-13),   // High precision
        IntegratorQuality::Ultra => (1e-15, 1e-15),  // Maximum precision
    };

    // t_start = 0.0, t_end = dt
    let mut stepper = Dop853::new(system, 0.0, dt, dt, state, rtol, atol);
    let res = stepper.integrate();

    if let Ok(_) = res {
        if let Some(y_final) = stepper.y_out().last() {
            for i in 0..n {
                bodies[i].pos.x = y_final[i * 6 + 0];
                bodies[i].pos.y = y_final[i * 6 + 1];
                bodies[i].pos.z = y_final[i * 6 + 2];
                bodies[i].vel.x = y_final[i * 6 + 3];
                bodies[i].vel.y = y_final[i * 6 + 4];
                bodies[i].vel.z = y_final[i * 6 + 5];
            }
        }
    }
}
