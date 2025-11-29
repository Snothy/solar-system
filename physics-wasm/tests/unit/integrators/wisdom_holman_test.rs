use crate::common::load_bodies;
use physics_wasm::common::constants::G;
use physics_wasm::common::types::Vector3;
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::integrators::step_wisdom_holman;

/// Test Wisdom-Holman with 2-body problem
#[test]
fn test_wisdom_holman_two_body() {
    let mut bodies = load_bodies();

    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");

    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();

    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);

    let parent_indices = update_hierarchy(&bodies);
    let e0 = calculate_energy(&bodies);

    let dt = 3600.0;
    let config = PhysicsConfig::default();

    for _ in 0..(10 * 24) {
        step_wisdom_holman(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();

    println!("Wisdom-Holman 2-body energy drift: {:.6e}", drift);
    assert!(drift < 1e-4, "Energy drift too large");
}

/// Test Wisdom-Holman with Jupiter and moons (hierarchical system)
#[test]
fn test_wisdom_holman_jupiter_system() {
    let mut bodies = load_bodies();

    // Set up Sun-Jupiter-Io system (good test for hierarchical WH)
    if let Some(idx) = bodies.iter().position(|b| b.name == "Sun") {
        bodies[idx].pos = Vector3::zero();
        bodies[idx].vel = Vector3::zero();
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Jupiter") {
        bodies[idx].pos = Vector3::new(7.785e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 13070.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Io") {
        // Io orbiting Jupiter
        bodies[idx].pos = Vector3::new(7.785e11 + 421700e3, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 13070.0 + 17334.0, 0.0);
    }

    // Filter to only Sun, Jupiter, Io
    bodies.retain(|b| ["Sun", "Jupiter", "Io"].contains(&b.name.as_str()));

    let parent_indices = update_hierarchy(&bodies);
    let e0 = calculate_energy(&bodies);

    // Wisdom-Holman is designed for hierarchical systems
    let dt = 3600.0;
    let config = PhysicsConfig::default();

    for _ in 0..(10 * 24) {
        step_wisdom_holman(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();

    println!("Wisdom-Holman Jupiter+Io energy drift: {:.6e}", drift);
    assert!(drift < 1e-3, "Hierarchical system energy drift too large");
}

/// Test Wisdom-Holman with full inner solar system
#[test]
fn test_wisdom_holman_solar_system() {
    let mut bodies = load_bodies();

    setup_solar_system(&mut bodies);

    // Filter out bodies that were not set up
    bodies.retain(|b| ["Sun", "Mercury", "Venus", "Earth", "Mars"].contains(&b.name.as_str()));

    let parent_indices = update_hierarchy(&bodies);
    let e0 = calculate_energy(&bodies);

    let dt = 3600.0;
    let config = PhysicsConfig::default();

    for _ in 0..(30 * 24) {
        step_wisdom_holman(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();

    println!("Wisdom-Holman solar system energy drift: {:.6e}", drift);
    assert!(drift < 1e-3, "Multi-body energy drift too large");
}

fn calculate_energy(bodies: &Vec<physics_wasm::common::types::PhysicsBody>) -> f64 {
    let mut ke = 0.0;
    let mut pe = 0.0;

    for body in bodies {
        ke += 0.5 * body.mass * body.vel.len_sq();
    }

    for i in 0..bodies.len() {
        for j in (i + 1)..bodies.len() {
            let dist = bodies[i].pos.distance_to(&bodies[j].pos);
            if dist > 0.0 {
                pe -= G * bodies[i].mass * bodies[j].mass / dist;
            }
        }
    }

    ke + pe
}

fn setup_solar_system(bodies: &mut Vec<physics_wasm::common::types::PhysicsBody>) {
    if let Some(idx) = bodies.iter().position(|b| b.name == "Sun") {
        bodies[idx].pos = Vector3::zero();
        bodies[idx].vel = Vector3::zero();
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Mercury") {
        bodies[idx].pos = Vector3::new(5.79e10, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 47870.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Venus") {
        bodies[idx].pos = Vector3::new(1.082e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 35020.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Earth") {
        bodies[idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 29780.0, 0.0);
    }
    if let Some(idx) = bodies.iter().position(|b| b.name == "Mars") {
        bodies[idx].pos = Vector3::new(2.279e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 24070.0, 0.0);
    }
}
