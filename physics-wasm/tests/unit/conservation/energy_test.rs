use crate::common::{initialize_from_jpl, load_bodies, load_jpl_vector};
use physics_wasm::common::types::Vector3;
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::integrators::*;

/// Test energy conservation with SABA4 over 365 days
#[test]
fn test_saba4_energy_conservation_1year() {
    let mut bodies = load_bodies();

    // Initialize Earth and Sun from JPL
    if let Some(earth_jpl) = load_jpl_vector("Earth") {
        let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();
        initialize_from_jpl(&mut bodies[earth_idx], &earth_jpl[0]);
    }

    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();

    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");

    let parent_indices = update_hierarchy(&bodies);

    // Calculate initial energy
    let e0 = calculate_total_energy(&bodies);

    //Simulate for 365 days (1 hour timesteps)
    let dt = 3600.0;
    let steps = 365 * 24;
    let config = PhysicsConfig::default();

    for _ in 0..steps {
        step_saba4(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let e1 = calculate_total_energy(&bodies);

    let drift = ((e1 - e0) / e0).abs();

    println!("Initial energy: {:.6e} J", e0);
    println!("Final energy:   {:.6e} J", e1);
    println!("Relative drift: {:.6e} ({:.4}%)", drift, drift * 100.0);

    // SABA4 should have very low drift (< 0.001%)
    assert!(
        drift < 0.00001,
        "Energy drift too large: {:.6}%",
        drift * 100.0
    );
}

/// Test energy conservation with Symplectic integrator
#[test]
fn test_symplectic_energy_conservation() {
    let mut bodies = load_bodies();

    // Simple Earth-Sun system
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();
    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();

    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);

    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");

    let parent_indices = update_hierarchy(&bodies);

    let e0 = calculate_total_energy(&bodies);

    // Simulate for 100 days
    let dt = 3600.0;
    let config = PhysicsConfig::default();

    for _ in 0..(100 * 24) {
        step_symplectic_4(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let e1 = calculate_total_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();

    println!(
        "Symplectic energy drift: {:.6e} ({:.4}%)",
        drift,
        drift * 100.0
    );

    // Symplectic should have < 0.01% drift
    assert!(drift < 0.0001, "Energy drift too large for symplectic");
}

/// Helper function to calculate total energy
fn calculate_total_energy(bodies: &Vec<physics_wasm::common::types::PhysicsBody>) -> f64 {
    use physics_wasm::common::constants::G;

    let mut ke = 0.0;
    let mut pe = 0.0;

    // Kinetic energy
    for body in bodies {
        let v_sq = body.vel.len_sq();
        ke += 0.5 * body.mass * v_sq;
    }

    // Potential energy
    for i in 0..bodies.len() {
        for j in (i + 1)..bodies.len() {
            let mut r = bodies[j].pos;
            r.sub(&bodies[i].pos);
            let dist = r.len();
            if dist > 0.0 {
                pe -= G * bodies[i].mass * bodies[j].mass / dist;
            }
        }
    }

    ke + pe
}
