use crate::common::types::Vector3;

/// Result of a collision check
#[derive(Debug, Clone)]
pub struct CollisionEvent {
    pub body1_idx: usize,
    pub body2_idx: usize,
    pub relative_velocity: Vector3,
}
