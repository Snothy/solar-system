use crate::common::{load_bodies};
use physics_wasm::common::types::Vector3;
use physics_wasm::integrators::step_saba4;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::common::constants::G;

/// Test SABA4 with 2-body problem
#[test]
fn test_saba4_two_body() {
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
    for _ in 0..(10 * 24) {
        step_saba4(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();
    
    println!("SABA4 2-body energy drift: {:.6e}", drift);
    assert!(drift < 1e-7, "SABA4 should have excellent energy conservation");
}

/// Test SABA4 with full solar system (best integrator for multi-body)
#[test]
fn test_saba4_solar_system() {
    let mut bodies = load_bodies();
    
    setup_solar_system(&mut bodies);
    
    // Filter out bodies that were not set up
    bodies.retain(|b| ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter"].contains(&b.name.as_str()));
    
    let parent_indices = update_hierarchy(&bodies);
    let e0 = calculate_energy(&bodies);
    
    // SABA4 is 4th order symplectic - excellent for multi-body
    let dt = 3600.0;
    for _ in 0..(30 * 24) {
        step_saba4(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();
    
    println!("SABA4 solar system (30 days) energy drift: {:.6e}", drift);
    assert!(drift < 1e-6, "SABA4 multi-body energy drift should be very small");
}

/// Test SABA4 long-term stability (1 year)
#[test]
fn test_saba4_long_term() {
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
    
    // Simulate 1 full year
    let dt = 3600.0;
    for _ in 0..(365 * 24) {
        step_saba4(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();
    
    println!("SABA4 1-year energy drift: {:.6e}", drift);
    assert!(drift < 1e-5, "SABA4 long-term stability test");
}

fn calculate_energy(bodies: &Vec<physics_wasm::common::types::PhysicsBody>) -> f64 {
    let mut ke = 0.0;
    let mut pe = 0.0;
    
    for body in bodies {
        ke += 0.5 * body.mass * body.vel.len_sq();
    }
    
    for i in 0..bodies.len() {
        for j in (i+1)..bodies.len() {
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
    if let Some(idx) = bodies.iter().position(|b| b.name == "Jupiter") {
        bodies[idx].pos = Vector3::new(7.785e11, 0.0, 0.0);
        bodies[idx].vel = Vector3::new(0.0, 13070.0, 0.0);
    }
}
