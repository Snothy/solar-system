use crate::common::{load_bodies};
use physics_wasm::common::types::Vector3;
use physics_wasm::integrators::step_symplectic_4;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::common::constants::G;

/// Test Symplectic integrator with 2-body problem (simple validation)
#[test]
fn test_symplectic_two_body() {
    let mut bodies = load_bodies();
    
    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");

    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();
    
    // Simple circular orbit setup
    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);
    
    let parent_indices = update_hierarchy(&bodies);
    let e0 = calculate_energy(&bodies);
    
    // Simulate for 10 days
    let dt = 3600.0;
    for _ in 0..(10 * 24) {
        step_symplectic_4(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();
    
    println!("Symplectic 2-body energy drift: {:.6e}", drift);
    assert!(drift < 1e-5, "Energy drift too large");
}

/// Test Symplectic with full solar system (realistic multi-body)
#[test]
fn test_symplectic_solar_system() {
    let mut bodies = load_bodies();
    
    // Set all inner planets + Jupiter to realistic positions
    setup_solar_system(&mut bodies);
    
    // Filter out bodies that were not set up (still at 0,0,0)
    // setup_solar_system sets Sun, Mercury, Venus, Earth, Mars, Jupiter
    bodies.retain(|b| ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter"].contains(&b.name.as_str()));
    
    let parent_indices = update_hierarchy(&bodies);
    let e0 = calculate_energy(&bodies);
    
    // Simulate 30 days with full system
    let dt = 3600.0;
    for _ in 0..(30 * 24) {
        step_symplectic_4(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();
    
    println!("Symplectic solar system (30 days) energy drift: {:.6e}", drift);
    assert!(drift < 1e-4, "Multi-body energy drift too large");
}

/// Test Symplectic orbital period accuracy
#[test]
fn test_symplectic_orbital_period() {
    let mut bodies = load_bodies();
    
    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");

    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();
    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    
    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);
    
    let parent_indices = update_hierarchy(&bodies);
    let r0 = bodies[earth_idx].pos;
    
    // One orbit (365 days)
    let dt = 3600.0;
    for _ in 0..(365 * 24) {
        step_symplectic_4(&mut bodies, &parent_indices, dt,
            false, false, false, false, false, false, false, false, false);
    }
    
    let r1 = bodies[earth_idx].pos;
    let error = r0.distance_to(&r1);
    
    println!("Symplectic orbital closure error: {:.3} km", error / 1000.0);
    assert!(error < 1e9, "Should return close to start after 1 orbit");
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
    // Set realistic orbital positions for testing
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
