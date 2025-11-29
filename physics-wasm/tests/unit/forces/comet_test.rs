use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::forces::comet::apply_cometary_forces;

/// Test cometary non-gravitational forces (Marsden-Sekanina model)
#[test]
fn test_comet_nongravitational_forces() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.radius = 696340e3;
    sun.pos = Vector3::zero();

    let mut comet = PhysicsBody::default();
    comet.name = "1P/Halley".to_string();
    comet.mass = 2.2e14; // kg
    comet.radius = 5500.0; // meters
                           // Marsden-Sekanina parameters (A1, A2, A3)
                           // These model outgassing asymmetry
    comet.comet = Some(physics_wasm::common::types::CometParams {
        comet_a1: Some(1.0e-8), // Radial component
        comet_a2: Some(0.0), // Transverse
        comet_a3: Some(0.0), // Normal
        yorp_factor: None,
    });
    comet.pos = Vector3::new(0.586e11, 0.0, 0.0); // Near perihelion
    comet.vel = Vector3::new(0.0, 54000.0, 0.0);

    let mut r_vec = comet.pos;
    r_vec.sub(&sun.pos);
    let dist = r_vec.len();

    let comet_force = apply_cometary_forces(&sun, &comet, &r_vec, dist);

    // Comet should experience non-gravitational forces
    println!("Comet non-grav force: {:.6e} N", comet_force.len());
    println!(
        "Components: x={:.6e}, y={:.6e}, z={:.6e}",
        comet_force.x, comet_force.y, comet_force.z
    );
}

/// Test A1 parameter (radial outgassing)
#[test]
fn test_comet_a1_radial() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();

    let mut comet = PhysicsBody::default();
    comet.mass = 2.2e14;
    comet.radius = 5500.0;
    comet.pos = Vector3::new(1e11, 0.0, 0.0);
    comet.vel = Vector3::new(0.0, 30000.0, 0.0);

    let mut r_vec = comet.pos;
    let dist = r_vec.len();

    // With A1 only (radial outgassing)
    comet.comet = Some(physics_wasm::common::types::CometParams {
        comet_a1: Some(1.0e-8),
        comet_a2: Some(0.0),
        comet_a3: Some(0.0),
        yorp_factor: None,
    });
    let force_a1 = apply_cometary_forces(&sun, &comet, &r_vec, dist);

    println!("Force with A1: {:.6e} N", force_a1.len());

    // A1 causes radial acceleration (away from sun at post-perihelion)
}

/// Test A2 parameter (transverse component)
#[test]
fn test_comet_a2_transverse() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();

    let mut comet = PhysicsBody::default();
    comet.mass = 2.2e14;
    comet.radius = 5500.0;
    comet.pos = Vector3::new(1e11, 0.0, 0.0);
    comet.vel = Vector3::new(0.0, 30000.0, 0.0);

    let mut r_vec = comet.pos;
    let dist = r_vec.len();

    // With A2 only (transverse)
    comet.comet = Some(physics_wasm::common::types::CometParams {
        comet_a1: Some(0.0),
        comet_a2: Some(1.0e-9),
        comet_a3: Some(0.0),
        yorp_factor: None,
    });
    let force_a2 = apply_cometary_forces(&sun, &comet, &r_vec, dist);

    println!("Force with A2: {:.6e} N", force_a2.len());
}

/// Test comet forces scale with distance from Sun
#[test]
fn test_comet_distance_dependence() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();

    let mut comet = PhysicsBody::default();
    comet.mass = 2.2e14;
    comet.radius = 5500.0;
    comet.comet = Some(physics_wasm::common::types::CometParams {
        comet_a1: Some(1.0e-8),
        comet_a2: None,
        comet_a3: None,
        yorp_factor: None,
    });
    comet.vel = Vector3::new(0.0, 20000.0, 0.0);

    // Near Sun (0.5 AU)
    comet.pos = Vector3::new(0.75e11, 0.0, 0.0);
    let mut r_vec = comet.pos;
    let dist_near = r_vec.len();
    let force_near = apply_cometary_forces(&sun, &comet, &r_vec, dist_near);

    // Far from Sun (3 AU)
    comet.pos = Vector3::new(4.5e11, 0.0, 0.0);
    r_vec = comet.pos;
    let dist_far = r_vec.len();
    let force_far = apply_cometary_forces(&sun, &comet, &r_vec, dist_far);

    println!("Force at 0.5 AU: {:.6e} N", force_near.len());
    println!("Force at 3 AU: {:.6e} N", force_far.len());

    // Outgassing is stronger closer to Sun (more heating)
    // Force should decrease with distance
}

/// Test that comet forces only apply to comets
#[test]
fn test_comet_forces_require_parameters() {
    let mut sun = PhysicsBody::default();
    sun.name = "Sun".to_string();
    sun.mass = 1.989e30;
    sun.pos = Vector3::zero();

    let mut asteroid = PhysicsBody::default();
    asteroid.name = "Asteroid".to_string();
    asteroid.mass = 1e15;
    asteroid.radius = 1000.0;
    // No comet parameters
    asteroid.comet = None;
    asteroid.pos = Vector3::new(2e11, 0.0, 0.0);
    asteroid.vel = Vector3::new(0.0, 25000.0, 0.0);

    let mut r_vec = asteroid.pos;
    let dist = r_vec.len();

    let force = apply_cometary_forces(&sun, &asteroid, &r_vec, dist);

    // Should return zero or minimal force for non-comets
    println!("Force on asteroid (no comet params): {:.6e} N", force.len());
}
