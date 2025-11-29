//! Type-safe indices for the physics engine.
//! 
//! Prevents confusion between different types of indices (e.g., body index vs parent index)
//! and ensures indices are valid within the simulation context.

use serde::{Serialize, Deserialize};

/// A strongly-typed index into the bodies array.
///
/// Wraps a `usize` to prevent accidental usage of raw integers as indices,
/// or mixing up different types of indices.
#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BodyIndex(pub usize);

impl BodyIndex {
    /// Create a new BodyIndex
    pub fn new(index: usize) -> Self {
        Self(index)
    }

    /// Get the underlying usize
    pub fn as_usize(&self) -> usize {
        self.0
    }
}

/// A strongly-typed optional parent index.
pub type ParentIndex = Option<BodyIndex>;
