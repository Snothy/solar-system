//! High-fidelity N-body physics engine for solar system simulation.
//!
//! This crate implements a comprehensive celestial mechanics simulation engine
//! with support for multiple force models and numerical integrators.
//!
//! # Architecture
//!
//! The engine is organized into several modules:
//!
//! - [`common`]: Core data structures (Vector3, PhysicsBody) and utilities
//! - [`forces`]: All force calculations (gravity, relativity, tidal, radiation)
//! - [`dynamics`]: Orbital mechanics (Kepler solver, hierarchy management)
//! - [`integrators`]: Numerical integration methods
//! - [`analysis`]: Collision detection and lunar libration
//!
//! # Coordinate System
//!
//! All positions and velocities use the **heliocentric ecliptic J2000** reference frame:
//! - **Origin**: Center of the Sun
//! - **XY-plane**: Earth's orbital plane (ecliptic) at epoch J2000.0
//! - **X-axis**: Points toward the vernal equinox (γ point)
//! - **Z-axis**: Perpendicular to ecliptic (north ecliptic pole)
//!
//! # Units
//!
//! The engine uses **SI base units** throughout:
//! - Distance: meters (m)
//! - Mass: kilograms (kg)
//! - Time: seconds (s)
//!
//! See the [`common::units`] module for semantic type aliases.
//!
//! # Physics Models
//!
//! ## Gravitational
//! - Newtonian N-body gravity
//! - Gravitational harmonics (J2, J3, J4, C22, S22)
//! - Post-Newtonian relativity (PPN, EIH)
//! - Tidal forces (dissipative and conservative)
//!
//! ## Non-Gravitational  
//! - Solar radiation pressure (SRP)
//! - Poynting-Robertson drag
//! - Yarkovsky effect
//! - Atmospheric drag
//! - Cometary outgassing (Marsden-Sekanina model)
//!
//! ## Rotational Dynamics
//! - Precession and nutation
//! - Tidal torques
//! - YORP effect
//! - Lunar libration
//!
//! # Integration Methods
//!
//! - **Symplectic 4th Order**: Energy-conserving for general N-body
//! - **Wisdom-Holman**: Hierarchical mixed-variable symplectic
//! - **SABA4**: Optimized 4th order symplectic with superior stability
//! - **DOP853**: Adaptive 8th order Runge-Kutta for high precision
//!
//! # WASM Interface
//!
//! The [`PhysicsEngine`] struct provides the main WASM interface with methods:
//! - [`PhysicsEngine::new`]: Initialize from JavaScript body data
//! - [`PhysicsEngine::step`]: Advance simulation by timestep
//! - [`PhysicsEngine::get_bodies`]: Retrieve updated body states
//! - [`PhysicsEngine::get_visual_state`]: Get positions with light-time corrections
//!
//! # Example Usage (from JavaScript)
//!
//! ```javascript
//! import init, { PhysicsEngine } from './physics_wasm.js';
//!
//! await init();
//! const engine = new PhysicsEngine(bodiesArray);
//! engine.step(
//!     dt,           // timestep in seconds
//!     simTime,      // simulation time
//!     config,       // configuration object
//!     2,            // integrator type (SABA4)
//!     2             // quality level
//! );
//! const bodies = engine.get_bodies();
//! ```

pub mod analysis;
pub mod common;
pub mod core;
pub mod dynamics;
pub mod forces;
pub mod integrators;
pub mod physics_engine;
pub mod frontend_simulation;
pub mod math;

pub use physics_engine::PhysicsEngine;
pub use frontend_simulation::FrontendSimulation;
