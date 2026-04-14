use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::common::types::PhysicsBody;
use crate::forces::{calculate_accelerations, ForceConfig, GravityMode};
use ode_solvers::{DVector, Dop853, System};
use std::cell::RefCell;

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
        current_jd: f64,
    ) {
        // DOP853 is adaptive, so we don't need manual substeps.
        // However, we must ensure the initial step guess (dx) in the internal function
        // is reasonable to prevent the solver from stalling.
        step_high_precision_internal(bodies, parent_indices, dt, config, quality, current_jd);
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
    integrator.step(
        bodies,
        parent_indices,
        dt,
        config,
        IntegratorQuality::High,
        2451545.0,
    );
}

fn step_high_precision_internal(
    bodies: &mut Vec<PhysicsBody>,
    parent_indices: &[ParentIndex],
    dt: f64,
    config: &PhysicsConfig,
    quality: IntegratorQuality,
    current_jd: f64,
) {
    let n = bodies.len();

    // 1. Setup initial state vector y
    let mut state = DVector::from_element(n * 6, 0.0);
    for (i, b) in bodies.iter().enumerate() {
        state[i * 6 + 0] = b.pos.x;
        state[i * 6 + 1] = b.pos.y;
        state[i * 6 + 2] = b.pos.z;
        state[i * 6 + 3] = b.vel.x;
        state[i * 6 + 4] = b.vel.y;
        state[i * 6 + 5] = b.vel.z;
    }

    // 2. Define System with Interior Mutability
    struct SolarSystem<'a> {
        // Use RefCell so we can mutate positions inside the immutable 'system' call
        // without allocating new memory every time.
        bodies: RefCell<Vec<PhysicsBody>>,
        parent_indices: &'a [ParentIndex],
        config: &'a PhysicsConfig,
        current_jd: f64,
    }

    impl<'a> System<DVector<f64>> for SolarSystem<'a> {
        fn system(&self, _t: f64, y: &DVector<f64>, dy: &mut DVector<f64>) {
            // Borrow the scratch buffer mutably
            let mut bodies_ref = self.bodies.borrow_mut();
            let n = bodies_ref.len();

            // Update the scratch buffer from the solver's current state 'y'
            for i in 0..n {
                bodies_ref[i].pos.x = y[i * 6 + 0];
                bodies_ref[i].pos.y = y[i * 6 + 1];
                bodies_ref[i].pos.z = y[i * 6 + 2];
                bodies_ref[i].vel.x = y[i * 6 + 3];
                bodies_ref[i].vel.y = y[i * 6 + 4];
                bodies_ref[i].vel.z = y[i * 6 + 5];
            }

            // Calculate accelerations using the scratch buffer
            // Note: We use static JD for performance - rotation angles are updated at the
            // start of each major step in simulation.rs, so this is sufficient accuracy.
            let force_config = ForceConfig {
                physics: self.config,
                parent_indices: self.parent_indices,
                gravity_mode: GravityMode::FullNBody,
            };

            let accs = calculate_accelerations(&bodies_ref, &force_config, self.current_jd);

            // Fill derivative vector dy
            for i in 0..n {
                // dy/dt (pos) = vel — read from y, not the scratch buffer
                dy[i * 6 + 0] = y[i * 6 + 3];
                dy[i * 6 + 1] = y[i * 6 + 4];
                dy[i * 6 + 2] = y[i * 6 + 5];
                // dv/dt (vel) = acc
                dy[i * 6 + 3] = accs[i].x;
                dy[i * 6 + 4] = accs[i].y;
                dy[i * 6 + 5] = accs[i].z;
            }
        }
    }

    // 3. Initialize System
    // We clone bodies ONCE here to create the scratch buffer
    let system = SolarSystem {
        bodies: RefCell::new(bodies.clone()),
        parent_indices, // passed as reference, no clone needed
        config,         // passed as reference, no clone needed
        current_jd,
    };

    // 4. Setup Tolerances
    let (rtol, atol) = match quality {
        IntegratorQuality::Low => (1e-7, 1e-7),
        IntegratorQuality::Medium => (1e-9, 1e-9),
        IntegratorQuality::High => (1e-12, 1e-12),
        IntegratorQuality::Ultra => (1e-14, 1e-14),
    };

    // 5. Integrate
    // Initial step size guess (dx)
    // Cap initial step at 1 day (86400s) or dt if smaller.
    let dx = (dt / 100.0).min(86400.0 * 30.0);

    let mut stepper = Dop853::new(system, 0.0, dt, dx, state, rtol, atol);
    let res = stepper.integrate();

    // 6. Handle Result
    match res {
        Ok(_) => {
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
        Err(e) => {
            #[cfg(target_arch = "wasm32")]
            web_sys::console::warn_1(&format!("DOP853 integrator failed: {:?}", e).into());
            #[cfg(not(target_arch = "wasm32"))]
            eprintln!("DOP853 integrator failed: {:?}", e);
        }
    }
}
