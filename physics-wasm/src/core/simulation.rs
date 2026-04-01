use crate::common::types::{PhysicsBody, Vector3};
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::common::utils::update_pole_orientation;
use crate::common::constants::SOLAR_MASS_LOSS;
use crate::common::units::{Seconds, Meters};
use crate::dynamics::hierarchy::update_hierarchy;
use crate::dynamics::apply_all_torques;
use crate::integrators;

/// Pure Rust implementation of the physics simulation.
/// Decoupled from WASM-specific types and logic.
pub struct Simulation {
    pub bodies: Vec<PhysicsBody>,
    pub parent_indices: Vec<ParentIndex>,
    pub current_jd: f64, // Current Julian Date (for body rotation angles)
}

impl Simulation {
    pub fn new(bodies: Vec<PhysicsBody>, initial_jd: f64) -> Self {
        let parent_indices = update_hierarchy(&bodies);

        Self {
            bodies,
            parent_indices,
            current_jd: initial_jd,
        }
    }

    pub fn update_hierarchy_internal(&mut self) {
        self.parent_indices = update_hierarchy(&self.bodies);
    }

    pub fn step(
        &mut self, 
        dt: Seconds, 
        sim_time: Seconds,
        config: &PhysicsConfig,
        integrator_type: u8, // 0=Adaptive, 1=Wisdom-Holman, 2=SABA4, 3=HighPrecision
        quality: u8 // 0=Low, 1=Medium, 2=High, 3=Ultra
    ) -> Seconds {
        // Update Pole Orientation
        update_pole_orientation(
            &mut self.bodies,
            self.current_jd,
            config.precession,
            config.nutation,
        );

        // Apply Solar Mass Loss
        if config.solar_mass_loss {
            if let Some(sun_idx) = self.bodies.iter().position(|b| b.name == "Sun") {
                self.bodies[sun_idx].mass -= SOLAR_MASS_LOSS * dt;
            }
        }

        // Force Hierarchy Update
        self.update_hierarchy_internal();

        let quality_enum = crate::integrators::types::IntegratorQuality::from(quality);

        // Select Integrator
        let integrator: Box<dyn crate::integrators::traits::Integrator> = match integrator_type {
            1 => Box::new(crate::integrators::wisdom_holman::WisdomHolmanIntegrator),
            2 => Box::new(crate::integrators::saba4::Saba4Integrator),
            3 => Box::new(crate::integrators::high_precision::HighPrecisionIntegrator),
            _ => Box::new(crate::integrators::symplectic::SymplecticIntegrator),
        };

        // Integrate
        integrator.step(
            &mut self.bodies,
            &self.parent_indices,
            dt,
            config,
            quality_enum,
            self.current_jd,
        );

        // Apply Torques (Tidal, YORP)
        // Note: We apply torques once per full step for simplicity.
        // For higher fidelity with small dt, this should ideally be integrated within the substeps
        // of the symplectic integrators, but for now this approximation is sufficient.
        apply_all_torques(&mut self.bodies, dt, config);

        // Update Julian Date
        self.current_jd += dt / 86400.0; // Convert seconds to days

        // Collisions
        if config.collisions {
            self.handle_collisions();
        }

        dt
    }

    fn handle_collisions(&mut self) {
        let mut removed_indices = crate::dynamics::collisions::resolve_collisions(&mut self.bodies);
        if !removed_indices.is_empty() {
            removed_indices.sort_unstable_by(|a, b| b.cmp(a));
            for &idx in &removed_indices {
                if idx < self.bodies.len() {
                    self.bodies.remove(idx);
                    self.parent_indices.remove(idx);
                }
            }
            self.update_hierarchy_internal();
        }
    }
    
    pub fn get_barycenter(&self) -> Vector3 {
        let mut bary = Vector3::zero();
        let mut total_mass = 0.0;
        for b in &self.bodies {
            let mut p = b.pos;
            p.scale(b.mass);
            bary.add(&p);
            total_mass += b.mass;
        }
        if total_mass > 0.0 {
            bary.scale(1.0 / total_mass);
        }
        bary
    }
}
