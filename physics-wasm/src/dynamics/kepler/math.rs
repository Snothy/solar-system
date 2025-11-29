//! Low-level Kepler equation solvers.

/// Kepler Equation Solver using Newton-Raphson
/// M = E - e*sin(E)
pub fn solve_kepler_equation(mean_anomaly: f64, ecc: f64) -> f64 {
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

/// Stumpff Function C(z)
pub fn stumpff_c(z: f64) -> f64 {
    if z > 0.0 {
        (1.0 - z.sqrt().cos()) / z
    } else if z < 0.0 {
        (1.0 - (-z).sqrt().cosh()) / z
    } else {
        0.5
    }
}

/// Stumpff Function S(z)
pub fn stumpff_s(z: f64) -> f64 {
    if z > 0.0 {
        (z.sqrt() - z.sqrt().sin()) / z.sqrt().powi(3)
    } else if z < 0.0 {
        ((-z).sqrt().sinh() - (-z).sqrt()) / (-z).sqrt().powi(3)
    } else {
        1.0 / 6.0
    }
}

/// Universal Variable Kepler Solver
/// Solves for x where t = ...
pub fn solve_universal(dt: f64, r0: f64, _v0_sq: f64, r_dot_v: f64, mu: f64, alpha: f64) -> f64 {
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

    let tolerance = 1e-12;
    let max_iter = 50;

    for _ in 0..max_iter {
        let z = alpha * x * x;
        let c = stumpff_c(z);
        let s = stumpff_s(z);

        let t_computed =
            (r_dot_v / mu.sqrt()) * x * x * c + (1.0 - alpha * r0) * x.powi(3) * s + r0 * x;
        let dt_err = (mu.sqrt() * dt) - t_computed;

        if dt_err.abs() < tolerance {
            return x;
        }

        let dt_dx = (r_dot_v / mu.sqrt()) * x * (1.0 - alpha * x * x * s)
            + (1.0 - alpha * r0) * x * x * c
            + r0;

        if dt_dx.abs() < 1e-14 {
            break;
        }

        let step = dt_err / dt_dx;
        if step.is_nan() {
            break;
        }

        x += step;
    }
    x
}
