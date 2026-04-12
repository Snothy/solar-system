use crate::common::load_body;
use approx::assert_relative_eq;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::dynamics::kepler::{drift_kepler, drift_kepler_relative, solve_kepler_equation};

/// Test Kepler Equation Solver (M = E - e*sin(E))
#[test]
fn test_kepler_solver_convergence() {
    // Case 1: Circular orbit (e=0), M=E
    let e_val = solve_kepler_equation(1.0, 0.0);
    assert_relative_eq!(e_val, 1.0, epsilon = 1e-10);

    // Case 2: Elliptic orbit (e=0.5)
    let e_val = solve_kepler_equation(1.0, 0.5);
    let m_check = e_val - 0.5 * e_val.sin();
    assert_relative_eq!(m_check, 1.0, epsilon = 1e-10);
}

/// Test Drift Kepler (Universal Variable) - Circular Orbit
#[test]
fn test_drift_kepler_circular() {
    let mut body = PhysicsBody::default();
    // Using a tiny gm for the body (e.g., a satellite) so it doesn't perturb the Sun
    body.gm = 1.0; 
    
    // 1 AU, Circular velocity
    body.pos = Vector3::new(1.496e11, 0.0, 0.0);
    body.vel = Vector3::new(0.0, 29780.0, 0.0); 

    let sun = load_body("Sun");
    let sun_gm = sun.gm;
    let sun_pos = Vector3::zero();
    let sun_vel = Vector3::zero();

    // Drift for 1/4 orbit (approx 91.25 days)
    let period = 365.25 * 24.0 * 3600.0;
    let dt = period / 4.0;

    drift_kepler(&mut body, dt, sun_gm, &sun_pos, &sun_vel);

    // Should be at (0, 1 AU, 0) approx
    assert!(body.pos.x.abs() < 5e9, "X should be near 0, got {}", body.pos.x);
    assert!((body.pos.y - 1.496e11).abs() < 5e9, "Y should be near 1 AU, got {}", body.pos.y);
}

/// Test Drift Kepler - Elliptic Orbit
#[test]
fn test_drift_kepler_elliptic() {
    let sun = load_body("Sun");
    let mu = sun.gm; // This defines 'mu' for the scope below
    
    let mut body = PhysicsBody::default();
    body.gm = 1.0; 

    // Perihelion of Halley's Comet (approx)
    let q = 0.586 * 1.496e11;
    body.pos = Vector3::new(q, 0.0, 0.0);

    // e = 0.967, a = q / (1-e)
    let e = 0.967;
    let a = q / (1.0 - e);
    
    // Set velocity at perihelion: v = sqrt(mu * (2/r - 1/a))
    let v_perihelion = (mu * (2.0 / q - 1.0 / a)).sqrt();
    body.vel = Vector3::new(0.0, v_perihelion, 0.0);

    let sun_pos = Vector3::zero();
    let sun_vel = Vector3::zero();

    let dt = 86400.0; // 1 day
    let r0 = body.pos.len();

    drift_kepler(&mut body, dt, mu, &sun_pos, &sun_vel);

    let r1 = body.pos.len();
    assert!(r1 > r0, "Should move away from perihelion");

    // Energy conservation check (Specific Orbital Energy)
    // epsilon = v^2 / 2 - mu / r
    let v1_sq = body.vel.len_sq();
    let energy = v1_sq / 2.0 - mu / r1;
    let expected_energy = -mu / (2.0 * a);

    // Relative equality check
    assert_relative_eq!(energy, expected_energy, epsilon = 1e-5);
}

/// Test Drift Kepler Relative (for Wisdom-Holman)
#[test]
fn test_drift_kepler_relative() {
    let mut body = PhysicsBody::default();
    body.gm = 1.0;
    body.pos = Vector3::new(1.0e10, 0.0, 0.0); 
    body.vel = Vector3::new(0.0, 1.0e3, 0.0);

    let parent = load_body("Earth");
    let parent_gm = parent.gm;
    let parent_pos = Vector3::new(1.0e11, 0.0, 0.0); 
    let parent_vel = Vector3::new(0.0, 0.0, 0.0);

    // Set absolute coordinates (drift_kepler_relative expects absolute input)
    body.pos.add(&parent_pos);
    body.vel.add(&parent_vel);

    let dt = 1000.0;
    drift_kepler_relative(&mut body, dt, parent_gm, &parent_pos, &parent_vel);

    // Result should be RELATIVE coordinates
    assert!(body.pos.len() < 2.0e10, "Should return relative coordinates");
    assert!(body.pos.len() > 0.5e10, "Should not be zero");
}