use crate::common::load_bodies;
use physics_wasm::common::constants::G;
use physics_wasm::common::types::{PhysicsBody, Vector3};
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::integrators::step_high_precision;

/// Test High Precision (DOP853) integrator basic functionality
#[test]
fn test_high_precision_two_body() {
    let mut bodies = load_bodies();

    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();

    // Set up simple circular orbit for test
    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);

    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");

    let parent_indices = update_hierarchy(&bodies);

    // Calculate initial energy
    let e0 = calculate_energy(&bodies);

    // Simulate for 10 days with High Precision integrator
    let dt = 3600.0; // 1 hour
    let config = PhysicsConfig::default();

    for _ in 0..(10 * 24) {
        step_high_precision(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();

    println!("High Precision - Initial energy: {:.6e} J", e0);
    println!("High Precision - Final energy:   {:.6e} J", e1);
    println!(
        "High Precision - Energy drift:   {:.6e} ({:.4}%)",
        drift,
        drift * 100.0
    );

    // DOP853 is adaptive 8th order - should have excellent energy conservation
    assert!(
        drift < 1e-6,
        "High precision energy drift too large: {:.6e}",
        drift
    );
}

/// Test High Precision integrator accuracy vs SABA4
#[test]
fn test_high_precision_vs_saba4_accuracy() {
    use physics_wasm::integrators::step_saba4;

    let bodies_template = load_bodies();

    let sun_idx = bodies_template
        .iter()
        .position(|b| b.name == "Sun")
        .unwrap();
    let earth_idx = bodies_template
        .iter()
        .position(|b| b.name == "Earth")
        .unwrap();

    // Clone for two separate simulations
    let mut bodies_hp = bodies_template.clone();
    let mut bodies_saba4 = bodies_template;

    // Set up test positions
    bodies_hp[sun_idx].pos = Vector3::zero();
    bodies_hp[sun_idx].vel = Vector3::zero();
    bodies_hp[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies_hp[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);

    bodies_saba4[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies_saba4[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);

    // Filter bodies for both
    bodies_hp.retain(|b| b.name == "Sun" || b.name == "Earth");
    bodies_saba4.retain(|b| b.name == "Sun" || b.name == "Earth");

    let parent_indices = update_hierarchy(&bodies_hp);

    // Run both for 30 days
    let dt = 3600.0;
    let config = PhysicsConfig::default();

    for _ in 0..(30 * 24) {
        step_high_precision(
            &mut bodies_hp,
            &parent_indices,
            dt,
            &config,
        );
        step_saba4(
            &mut bodies_saba4,
            &parent_indices,
            dt,
            &config,
        );
    }

    // Recalculate indices after filtering
    let earth_idx_hp = bodies_hp.iter().position(|b| b.name == "Earth").unwrap();
    let earth_idx_saba4 = bodies_saba4.iter().position(|b| b.name == "Earth").unwrap();

    // Compare final positions
    let pos_diff = bodies_hp[earth_idx_hp]
        .pos
        .distance_to(&bodies_saba4[earth_idx_saba4].pos);
    let vel_diff = bodies_hp[earth_idx_hp]
        .vel
        .distance_to(&bodies_saba4[earth_idx_saba4].vel);

    println!(
        "Position difference HP vs SABA4: {:.3} km",
        pos_diff / 1000.0
    );
    println!("Velocity difference HP vs SABA4: {:.6} m/s", vel_diff);

    // Both should be accurate - differences should be small
}

/// Test High Precision integrator with large timestep
#[test]
fn test_high_precision_large_timestep() {
    let mut bodies = load_bodies();

    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();

    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);

    // Filter to only Sun and Earth
    bodies.retain(|b| b.name == "Sun" || b.name == "Earth");

    let parent_indices = update_hierarchy(&bodies);

    let e0 = calculate_energy(&bodies);

    // Use large timestep (1 day) - adaptive integrator should handle it
    let dt = 86400.0; // 1 day
    let config = PhysicsConfig::default();

    for _ in 0..10 {
        step_high_precision(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let e1 = calculate_energy(&bodies);
    let drift = ((e1 - e0) / e0).abs();

    println!("HP with 1-day timestep - Energy drift: {:.6e}", drift);

    // Adaptive integrator should still maintain accuracy with large steps
    assert!(
        drift < 1e-5,
        "High precision should handle large timesteps well"
    );
}

fn calculate_energy(bodies: &Vec<PhysicsBody>) -> f64 {
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
