//! Time-related types and utilities.
//!
//! Provides semantic types for time steps and simulation time to prevent unit errors.

use crate::common::units::Seconds;
use serde::{Serialize, Deserialize};

/// A simulation time step.
#[derive(Copy, Clone, Debug, PartialEq, PartialOrd, Serialize, Deserialize)]
pub struct TimeStep(pub Seconds);

impl TimeStep {
    /// Create a new TimeStep from seconds
    pub fn from_seconds(dt: f64) -> Self {
        Self(dt)
    }

    /// Get the value in seconds
    pub fn as_seconds(&self) -> f64 {
        self.0
    }
}

/// Current simulation time (epoch).
#[derive(Copy, Clone, Debug, PartialEq, PartialOrd, Serialize, Deserialize)]
pub struct SimulationTime(pub Seconds);

impl SimulationTime {
    pub fn new(time: f64) -> Self {
        Self(time)
    }
    
    pub fn as_seconds(&self) -> f64 {
        self.0
    }
}
