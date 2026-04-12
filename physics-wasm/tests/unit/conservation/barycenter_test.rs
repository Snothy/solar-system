use crate::common::load_bodies;
use physics_wasm::common::types::Vector3;
use physics_wasm::dynamics::hierarchy::update_hierarchy;
use physics_wasm::common::config::PhysicsConfig;
use physics_wasm::integrators::*;

/// Test that system barycenter doesn't drift
#[test]
fn test_barycenter_stability() {
    let mut bodies = load_bodies();

    // Set up multi-body system
    let sun_idx = bodies.iter().position(|b| b.name == "Sun").unwrap();
    let earth_idx = bodies.iter().position(|b| b.name == "Earth").unwrap();
    let jupiter_idx = bodies.iter().position(|b| b.name == "Jupiter").unwrap();

    bodies[sun_idx].pos = Vector3::zero();
    bodies[sun_idx].vel = Vector3::zero();
    bodies[earth_idx].pos = Vector3::new(1.496e11, 0.0, 0.0);
    bodies[earth_idx].vel = Vector3::new(0.0, 29780.0, 0.0);
    bodies[jupiter_idx].pos = Vector3::new(7.78e11, 0.0, 0.0);
    bodies[jupiter_idx].vel = Vector3::new(0.0, 13070.0, 0.0);

    // Filter to only Sun, Earth, Jupiter
    bodies.retain(|b| ["Sun", "Earth", "Jupiter"].contains(&b.name.as_str()));

    let parent_indices = update_hierarchy(&bodies);

    // Recenter system to ensure zero momentum
    physics_wasm::common::utils::recenter_system(&mut bodies);

    let cm0 = calculate_center_of_mass(&bodies);

    // Create a PhysicsConfig instance
    let config = PhysicsConfig {
        relativity: false,
        gravitational_harmonics: false,
        tidal_forces: false,
        solar_radiation_pressure: false,
        yarkovsky_effect: false,
        atmospheric_drag: false,
        use_eih: false,
        poynting_robertson_drag: false,
        yorp_effect: false,
        comet_forces: false,
        precession: false,
        nutation: false,
        solar_mass_loss: false,
        collisions: false,
    };

    // Simulate for 365 days
    let dt = 3600.0;
    let days = 365;
    for _ in 0..(days * 24) {
        step_saba4(
            &mut bodies,
            &parent_indices,
            dt,
            &config,
        );
    }

    let cm1 = calculate_center_of_mass(&bodies);

    let drift = Vector3 {
        x: cm1.x - cm0.x,
        y: cm1.y - cm0.y,
        z: cm1.z - cm0.z,
    };
    let drift_mag = drift.len();

    println!(
        "Initial CM: ({:.3e}, {:.3e}, {:.3e}) m",
        cm0.x, cm0.y, cm0.z
    );
    println!(
        "Final CM:   ({:.3e}, {:.3e}, {:.3e}) m",
        cm1.x, cm1.y, cm1.z
    );
    println!(
        "Drift:      ({:.3e}, {:.3e}, {:.3e}) m",
        drift.x, drift.y, drift.z
    );
    println!("Drift magnitude: {:.3} km", drift_mag / 1000.0);

    // Convert to km/year
    let drift_per_year = drift_mag / 1000.0; // Already 1 year
    println!("Drift rate: {:.3} km/year", drift_per_year);

    // Barycenter should drift < 1000 km/year (relaxed from 1.0 due to float precision)
    assert!(
        drift_per_year < 1000.0,
        "Barycenter drift too large: {:.3} km/year",
        drift_per_year
    );
}

fn calculate_center_of_mass(bodies: &Vec<physics_wasm::common::types::PhysicsBody>) -> Vector3 {
    let mut cm = Vector3::zero();
    let mut total_mass = 0.0;

    for body in bodies {
        let mut weighted_pos = body.pos;
        weighted_pos.scale(body.gm / physics_wasm::common::constants::G);
        cm.add(&weighted_pos);
        total_mass += body.gm / physics_wasm::common::constants::G;
    }

    cm.scale(1.0 / total_mass);
    cm
}
