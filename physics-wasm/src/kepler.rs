use crate::types::{Vector3, PhysicsBody};
use crate::constants::G;

// Kepler Equation Solver using Newton-Raphson
// M = E - e*sin(E)
pub fn solve_kepler(mean_anomaly: f64, ecc: f64) -> f64 {
    let mut e = mean_anomaly; // Initial guess
    let tolerance = 1e-12;
    let max_iter = 100;

    for _ in 0..max_iter {
        let delta = e - ecc * e.sin() - mean_anomaly;
        if delta.abs() < tolerance {
            return e;
        }
        let deriv = 1.0 - ecc * e.cos();
        e -= delta / deriv;
    }
    e
}

// Drift a body along its Keplerian orbit for time dt
// Assumes the body is orbiting the Sun (mass M)
// Drift a body along its Keplerian orbit for time dt
// Uses Lagrange Coefficients (f and g functions) for numerical stability at low eccentricity
// Stumpff Functions
fn stumpff_c(z: f64) -> f64 {
    if z > 0.0 {
        (1.0 - z.sqrt().cos()) / z
    } else if z < 0.0 {
        (1.0 - (-z).sqrt().cosh()) / z
    } else {
        0.5
    }
}

fn stumpff_s(z: f64) -> f64 {
    if z > 0.0 {
        (z.sqrt() - z.sqrt().sin()) / z.sqrt().powi(3)
    } else if z < 0.0 {
        ((-z).sqrt().sinh() - (-z).sqrt()) / (-z).sqrt().powi(3)
    } else {
        1.0 / 6.0
    }
}

// Universal Variable Kepler Solver
// Solves for x where t = ...
fn solve_universal(dt: f64, r0: f64, v0_sq: f64, r_dot_v: f64, mu: f64, alpha: f64) -> f64 {
    let mut x = if alpha > 1e-6 {
        // Elliptic initial guess: x = sqrt(mu) * dt * alpha
        (mu).sqrt() * dt * alpha
    } else if alpha < -1e-6 {
        // Hyperbolic initial guess: sign(dt) * sqrt(-1/alpha) * ln(...)
        // Simple guess:
        (mu).sqrt() * dt * alpha.abs() // Rough
    } else {
        // Parabolic
        0.0
    };
    
    // Better initial guess for all:
    // x = (mu).sqrt() * dt / r0; // REMOVED: This overwrote the smart guesses above!

    let tolerance = 1e-12; // Tightened from 1e-9
    let max_iter = 50;

    for _ in 0..max_iter {
        let z = alpha * x * x;
        let c = stumpff_c(z);
        let s = stumpff_s(z);
        
        let t_computed = (r_dot_v / mu.sqrt()) * x * x * c + (1.0 - alpha * r0) * x.powi(3) * s + r0 * x;
        let dt_err = (mu.sqrt() * dt) - t_computed; // We solve for mu*dt actually? No, t formula usually has sqrt(mu) inside or outside.
        // Standard formula: sqrt(mu) * dt = r0 v0 / sqrt(mu) ...
        // Let's stick to: t = (r.v/sqrt(mu)) x^2 C + ...
        
        if dt_err.abs() < tolerance {
            return x;
        }
        
        let dt_dx = (r_dot_v / mu.sqrt()) * x * (1.0 - alpha * x * x * s) + (1.0 - alpha * r0) * x * x * c + r0;
        
        if dt_dx.abs() < 1e-14 { break; }
        x += dt_err / dt_dx;
    }
    x
}

// Drift a body along its Keplerian orbit for time dt
// Uses Universal Variables (valid for Elliptic, Parabolic, Hyperbolic)
pub fn drift_kepler(body: &mut PhysicsBody, dt: f64, sun_mass: f64, sun_pos: &Vector3, sun_vel: &Vector3) {
    // 1. Convert to Heliocentric coordinates
    let mut r_vec = body.pos; r_vec.sub(sun_pos);
    let mut v_vec = body.vel; v_vec.sub(sun_vel);
    
    let r0 = r_vec.len();
    let v2 = v_vec.len_sq();
    let mu = G * (sun_mass + body.mass);
    
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
    let mut r1_vec = r_vec; r1_vec.scale(f);
    let mut term_g = v_vec; term_g.scale(g);
    r1_vec.add(&term_g);
    let r1 = r1_vec.len();
    
    // 6. Compute f_dot and g_dot
    let f_dot = (mu.sqrt() / (r1 * r0)) * (alpha * x.powi(3) * s - x);
    let g_dot = 1.0 - (x * x / r1) * c;
    
    // 7. Update Velocity
    let mut v1_vec = r_vec; v1_vec.scale(f_dot);
    let mut term_g_dot = v_vec; term_g_dot.scale(g_dot);
    v1_vec.add(&term_g_dot);
    
    // 8. Restore Absolute Coordinates
    r1_vec.add(sun_pos);
    v1_vec.add(sun_vel);
    
    body.pos = r1_vec;
    body.vel = v1_vec;
}

// Drift a body along its Keplerian orbit, returning RELATIVE coordinates
// Uses Universal Variables
pub fn drift_kepler_relative(body: &mut PhysicsBody, dt: f64, parent_mass: f64, parent_pos: &Vector3, parent_vel: &Vector3) {
    // 1. Convert to parent-centric coordinates
    let mut r_vec = body.pos; r_vec.sub(parent_pos);
    let mut v_vec = body.vel; v_vec.sub(parent_vel);
    
    let r0 = r_vec.len();
    let v2 = v_vec.len_sq();
    let mu = G * (parent_mass + body.mass);
    
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
    let mut r1_vec = r_vec; r1_vec.scale(f);
    let mut term_g = v_vec; term_g.scale(g);
    r1_vec.add(&term_g);
    let r1 = r1_vec.len();
    
    // 6. Compute f_dot and g_dot
    let f_dot = (mu.sqrt() / (r1 * r0)) * (alpha * x.powi(3) * s - x);
    let g_dot = 1.0 - (x * x / r1) * c;
    
    // 7. Update Velocity
    let mut v1_vec = r_vec; v1_vec.scale(f_dot);
    let mut term_g_dot = v_vec; term_g_dot.scale(g_dot);
    v1_vec.add(&term_g_dot);
    
    // 8. Store RELATIVE Coordinates
    body.pos = r1_vec;
    body.vel = v1_vec;
}
