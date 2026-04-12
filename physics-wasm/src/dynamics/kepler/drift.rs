//! High-level functions to drift bodies along Keplerian orbits.

use crate::common::constants::G;
use crate::common::types::{PhysicsBody, Vector3};
use super::math::{solve_universal, stumpff_c, stumpff_s};

/// Drift a body along its Keplerian orbit for time dt.
/// Uses Universal Variables (valid for Elliptic, Parabolic, Hyperbolic).
pub fn drift_kepler(
    body: &mut PhysicsBody,
    dt: f64,
    sun_gm: f64,
    sun_pos: &Vector3,
    sun_vel: &Vector3,
) {
    // 1. Convert to Heliocentric coordinates
    let mut r_vec = body.pos;
    r_vec.sub(sun_pos);
    let mut v_vec = body.vel;
    v_vec.sub(sun_vel);

    let r0 = r_vec.len();
    let v2 = v_vec.len_sq();
    let mu = sun_gm + body.gm;

    // 2. Compute Alpha = 1/a
    // Energy E = v^2/2 - mu/r
    // alpha = -2E/mu = 2/r - v^2/mu
    let alpha = 2.0 / r0 - v2 / mu;

    // 3. Solve for Universal Variable x
    let r_dot_v = r_vec.dot(&v_vec);
    let x = solve_universal(dt, r0, v2, r_dot_v, mu, alpha);

    // 4. Compute Lagrange Coefficients (f and g)
    let z = alpha * x * x;
    let c = stumpff_c(z);
    let s = stumpff_s(z);

    let f = 1.0 - (x * x / r0) * c;
    let g = dt - (x.powi(3) / mu.sqrt()) * s;

    // 5. Update Position
    let mut r1_vec = r_vec;
    r1_vec.scale(f);
    let mut term_g = v_vec;
    term_g.scale(g);
    r1_vec.add(&term_g);
    let r1 = r1_vec.len();

    // 6. Compute f_dot and g_dot
    let f_dot = (mu.sqrt() / (r1 * r0)) * (alpha * x.powi(3) * s - x);
    let g_dot = 1.0 - (x * x / r1) * c;

    // 7. Update Velocity
    let mut v1_vec = r_vec;
    v1_vec.scale(f_dot);
    let mut term_g_dot = v_vec;
    term_g_dot.scale(g_dot);
    v1_vec.add(&term_g_dot);

    // 8. Restore Absolute Coordinates
    r1_vec.add(sun_pos);
    v1_vec.add(sun_vel);

    body.pos = r1_vec;
    body.vel = v1_vec;
}

/// Drift a body along its Keplerian orbit, returning RELATIVE coordinates.
/// Uses Universal Variables.
pub fn drift_kepler_relative(
    body: &mut PhysicsBody,
    dt: f64,
    parent_gm: f64,
    parent_pos: &Vector3,
    parent_vel: &Vector3,
) {
    // 1. Convert to parent-centric coordinates
    let mut r_vec = body.pos;
    r_vec.sub(parent_pos);
    let mut v_vec = body.vel;
    v_vec.sub(parent_vel);

    let r0 = r_vec.len();
    let v2 = v_vec.len_sq();
    let mu = parent_gm + body.gm;

    // 2. Compute Alpha
    let alpha = 2.0 / r0 - v2 / mu;

    // 3. Solve for Universal Variable x
    let r_dot_v = r_vec.dot(&v_vec);
    let x = solve_universal(dt, r0, v2, r_dot_v, mu, alpha);

    // 4. Compute Lagrange Coefficients
    let z = alpha * x * x;
    let c = stumpff_c(z);
    let s = stumpff_s(z);

    let f = 1.0 - (x * x / r0) * c;
    let g = dt - (x.powi(3) / mu.sqrt()) * s;

    // 5. Update Position
    let mut r1_vec = r_vec;
    r1_vec.scale(f);
    let mut term_g = v_vec;
    term_g.scale(g);
    r1_vec.add(&term_g);
    let r1 = r1_vec.len();

    // 6. Compute f_dot and g_dot
    let f_dot = (mu.sqrt() / (r1 * r0)) * (alpha * x.powi(3) * s - x);
    let g_dot = 1.0 - (x * x / r1) * c;

    // 7. Update Velocity
    let mut v1_vec = r_vec;
    v1_vec.scale(f_dot);
    let mut term_g_dot = v_vec;
    term_g_dot.scale(g_dot);
    v1_vec.add(&term_g_dot);

    // 8. Store RELATIVE Coordinates
    body.pos = r1_vec;
    body.vel = v1_vec;
}

/// Drift relative position and velocity using Universal Variables.
/// Operates directly on relative vectors.
pub fn solve_kepler_drift(
    r: &mut Vector3,
    v: &mut Vector3,
    dt: f64,
    mu: f64,
) {
    let r0 = r.len();
    let v2 = v.len_sq();
    
    // Alpha = 2/r - v^2/mu
    let alpha = 2.0 / r0 - v2 / mu;
    
    let r_dot_v = r.dot(v);
    let x = solve_universal(dt, r0, v2, r_dot_v, mu, alpha);
    
    let z = alpha * x * x;
    let c = stumpff_c(z);
    let s = stumpff_s(z);
    
    let f = 1.0 - (x * x / r0) * c;
    let g = dt - (x.powi(3) / mu.sqrt()) * s;
    
    // New Position
    let mut r_new = *r; r_new.scale(f);
    let mut v_g = *v; v_g.scale(g);
    r_new.add(&v_g);
    let r1 = r_new.len();
    
    let f_dot = (mu.sqrt() / (r1 * r0)) * (alpha * x.powi(3) * s - x);
    let g_dot = 1.0 - (x * x / r1) * c;
    
    // New Velocity
    let mut v_new = *r; v_new.scale(f_dot);
    let mut v_g_dot = *v; v_g_dot.scale(g_dot);
    v_new.add(&v_g_dot);
    
    *r = r_new;
    *v = v_new;
}
