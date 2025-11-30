use crate::common::types::PhysicsBody;
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;
use crate::common::units::Seconds;
use crate::integrators::types::IntegratorQuality;

/// Trait for numerical integrators.
pub trait Integrator {
    /// Perform a single integration step.
    ///
    /// # Arguments
    /// * `bodies` - Mutable reference to the list of bodies.
    /// * `parent_indices` - Hierarchy indices.
    /// * `dt` - Time step in seconds.
    /// * `config` - Physics configuration.
    /// * `quality` - Quality setting for the integrator (if applicable).
    /// * `current_jd` - Current Julian Date (for body rotation angles).
    fn step(
        &self,
        bodies: &mut Vec<PhysicsBody>,
        parent_indices: &[ParentIndex],
        dt: Seconds,
        config: &PhysicsConfig,
        quality: IntegratorQuality,
        current_jd: f64,
    );

    /// Get the name of the integrator.
    fn name(&self) -> &'static str;
}
