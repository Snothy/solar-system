//! Types and configuration for force calculations.

use crate::common::types::Vector3;
use crate::common::config::PhysicsConfig;
use crate::common::indices::ParentIndex;

/// Mode for handling gravity in different integrators.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GravityMode {
    /// Full N-body gravity for all interactions.
    /// Used by: Symplectic, DOP853
    FullNBody,
    
    /// Split operator: Keplerian drift handles Sun's gravity, kick handles perturbations.
    /// Used by: SABA4, Wisdom-Holman (main path)
    SplitDriftKick,
    
    /// Hierarchical mode: Subtract parent gravity for child bodies.
    /// Used by: Wisdom-Holman (fallback when no Sun found)
    HierarchicalSubtraction,
}

/// Configuration for a force calculation step.
pub struct ForceConfig<'a> {
    /// Global physics configuration flags
    pub physics: &'a PhysicsConfig,
    /// Parent indices for hierarchical gravity
    pub parent_indices: &'a [ParentIndex],
    /// Gravity handling mode
    pub gravity_mode: GravityMode,
}

/// The result of a force calculation pass.
/// Contains the net acceleration for each body.
pub struct AccelerationField {
    pub accelerations: Vec<Vector3>,
}
